# API Integration Notes

Implementation notes for the notification, barcode, bulk import and daily performance features. The base client conventions live in `API_INTEGRATION.md`; this document records the decisions that only apply to these integrations.

## Client contract reminders

`src/services/api.ts` builds every URL as `${NEXT_PUBLIC_API_URL}/api/v1<path>` and returns the unwrapped `data` value of the `{ data, meta? }` envelope. Two consequences matter here:

1. **`meta` is discarded.** Endpoints that return `{ data, meta }` arrive as the plain array/object. The UI must not type a list response as `{ data, meta }`. The notification feed, import job list and delivery list are all consumed as arrays for this reason.
2. **Errors are `ApiError` instances** carrying `code` and `statusCode`. Branch on `statusCode` for transport-level cases (404) and on `code` for business cases (`INSUFFICIENT_STOCK`, `DUPLICATE_REQUEST`, `IMPORT_ROW_ERRORS`).

Files are returned as text inside the envelope (`{ filename, contentType, content }`), not as a binary body, so downloads use `apiFetchFile(path)` plus `downloadTextFile(...)` instead of blob handling:

```ts
const file = await apiFetchFile('/pharmacy/imports/templates/PRODUCTS');
downloadTextFile(file.filename, file.content, file.contentType);
```

## Endpoints used by feature

### Notifications

| Purpose | Call | Where |
| --- | --- | --- |
| Unread badge | `GET /notifications/unread-count` | `components/notifications/notification-bell.tsx` |
| Feed | `GET /notifications?limit=100[&unreadOnly=true]` | `features/notifications/notification-centre.tsx` |
| Capability flags | `GET /notifications/capabilities` | notification centre |
| Preferences read/update | `GET` / `PATCH /notifications/preferences` | `features/notifications/notification-settings.tsx` |
| Recipients | `GET` / `POST /notifications/recipients`, `PATCH` / `DELETE /notifications/recipients/:id` | settings page |
| Delivery history + retry | `GET /notifications/deliveries?limit=25`, `POST /notifications/deliveries/:id/retry` | settings page |
| Mark read | `POST /notifications/:id/read`, `POST /notifications/read-all` | notification centre |
| Manual scan | `POST /notifications/expiry-scan` | notification centre |

Query keys: `['notifications', 'unread-count']`, `['notifications', 'list', filter]`, `['notifications', 'capabilities']`, `['notifications', 'preferences']`, `['notifications', 'recipients']`, `['notifications', 'deliveries']`. Mutations invalidate the `['notifications']` prefix.

The bell polls unread count every 60 seconds with `refetchInterval`. It renders nothing when `inAppEnabled` is false, so a workspace that turned in-app notifications off does not show a permanently empty bell. It shows `9+` above nine unread.

### Barcode scanning

| Purpose | Call | Where |
| --- | --- | --- |
| Lookup | `GET /pharmacy/barcodes/lookup?code=<code>` | `features/pharmacy/scan-product.tsx` |
| Assign / replace / clear | `PUT /pharmacy/barcodes/product/:productId` with `{ barcode }` | `components/barcode/assign-barcode-panel.tsx` |
| Product search for assignment | `GET /pharmacy/medicines?limit=10&q=<term>` | `components/barcode/assign-barcode-panel.tsx` |
| Stock change | `POST /pharmacy/movements` | `components/pharmacy/movement-form.tsx` |

Lookup uses `useQuery` with `retry: false` and key `['pharmacy', 'barcode', code]`. A 404 is a normal outcome, not an error state to retry: it renders `UnknownBarcodeCard` plus the assignment panel.

The scan flow never mutates stock. `MovementForm` posts a movement with a generated idempotency key (`scan-movement-<batchId>-<uuid>`) and invalidates `['pharmacy']` on success, which refreshes the scan result, batches and dashboard.

### Bulk import

| Purpose | Call | Where |
| --- | --- | --- |
| Template | `GET /pharmacy/imports/templates/:type` | `components/imports/download-template-button.tsx` |
| Schema and limits | `GET /pharmacy/imports/schema/:type` | `components/imports/import-wizard.tsx` |
| Validate and store | `POST /pharmacy/imports` (`type`, `filename`, `content`, optional `mapping`) | wizard |
| Re-validate with mapping | `POST /pharmacy/imports` with `mapping` overrides | wizard |
| Job detail | `GET /pharmacy/imports/:id` | fetched as needed |
| Error report | `GET /pharmacy/imports/:id/errors` | `components/imports/import-error-report.tsx` |
| Confirm | `POST /pharmacy/imports/:id/confirm` | wizard |
| Recent imports | `GET /pharmacy/imports?limit=5` | `features/pharmacy/bulk-import.tsx` |

Only non-empty mapping overrides are sent; sending every column would pin the mapping to the first upload and prevent automatic matching on a corrected file. Confirming invalidates `['pharmacy']`.

### Daily performance

`GET /pharmacy/reports/daily?date=YYYY-MM-DD`, query key `['pharmacy', 'reports', 'daily', date]`.

The date string is produced with `toLocaleDateString('en-CA')`, which yields `YYYY-MM-DD` in the user's locale. The API resolves the workspace timezone and returns the date it used; the UI displays what the server returns rather than recomputing a local window.

## Rendering unavailable metrics

`DailyPerformance.sales`, `.gain` and `.commission` are typed as `available: false` with `amount: null` and a `reason`. `MetricCard` renders `—` plus a "Not available" badge and the reason as a footnote when `unavailable` is set. There is no client-side fallback to `0` or to a locally computed estimate: the API never sends a number for these fields, and the UI must not invent one.

Likewise, sale actions are absent from the scan result and the movement form has no "sale" movement type. `capabilities.salesNotificationsAvailable` is surfaced as an informational alert rather than a hidden setting.

## Formatting

- `lib/format.ts` provides `formatCurrency` (`en-NG`, currency from the workspace, `—` for `null`/`undefined`), `formatDate`, `formatDateTime` and `pluralise`.
- `formatDate`/`formatDateTime` return `—` for missing or invalid dates instead of `Invalid Date`.
- Expiry badges come from the API `expiryStatus` value, not from client-side day math, so the badge and the reminder schedule cannot disagree.

## Known inconsistencies

- `src/features/pharmacy/suppliers.tsx` still treats the list response as `{ data: { data, meta } }`, which double-unwraps and yields `undefined` rows. It predates these features and was deliberately left unchanged to keep this change focused; new code consumes unwrapped arrays (see `batches.tsx`). Fixing it is a two-line change to `useQuery<Supplier[]>`.
- The API returns `meta` on the notification feed, import list and delivery list, but the shared client drops it. Pagination totals for those lists are therefore not available client-side; `capabilities` (not `deliveries.meta`) is the source for the active email transport.

## Error handling patterns

| Case | Pattern |
| --- | --- |
| Form validation | Client-side checks mirror API limits exactly (lead 1–365, interval 1–30) so a valid form cannot be rejected server-side. |
| Business rejection | Show `error.message` from `ApiError` verbatim; the API messages are written for end users. |
| Permission failure | Let the `403` surface as an inline alert; do not hide actions the server would reject silently. |
| Transient failure | Alerts expose a retry that refetches the query rather than duplicating mutation calls. |
| Busy state | Mutations disable the triggering button and `ImportProgress` announces progress with `role="status"`. |

## Testing

Frontend tests stub global `fetch` and assert on user-visible behaviour:

- `src/components/barcode/scan-result-card.test.tsx`
- `src/components/imports/import-validation-summary.test.tsx`
- `src/components/notifications/notification-list.test.tsx`
- `src/lib/format.test.ts`

```bash
npm run lint       # next lint
npx tsc --noEmit
npx jest
npm run build
```

## Related documentation

Backend contracts and rules live in `business-platform-api/docs`:

- `NOTIFICATION_SYSTEM.md`
- `EXPIRY_REMINDER_RULES.md`
- `BARCODE_SCANNING.md`
- `BULK_IMPORT_SYSTEM.md`
- `DASHBOARD_METRICS.md`
- `OPEN_PRODUCT_DECISIONS.md`
