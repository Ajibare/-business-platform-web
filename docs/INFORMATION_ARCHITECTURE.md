# Information Architecture

## Application areas

- Authentication.
- Pharmacy onboarding.
- Platform shell.
- Pharmacy product.

## Navigation groups

- Dashboard.
- Inventory.
  - Products.
  - Stock batches.
  - Stock movements.
  - Stock counts.
- Intelligence.
  - Expiry monitoring.
  - Low-stock alerts.
  - Reorder recommendations.
  - Slow-moving stock.
- Business management.
  - Suppliers.
  - Reports.
  - Staff management.
  - Settings.
  - Subscription and billing.
  - Help and support.

## Screen ownership

- Shared platform screens live under route groups.
- Pharmacy-specific screens live under the pharmacy product route.
- Product modules must not depend on one another.
EOF
cat > /c/Users/USER/Desktop/business/business-platform-web/docs/USER_FLOWS.md <<'USERFLOWS_EOF'
# User Flows

## Initial release flows

1. Register or sign in.
2. Complete pharmacy setup.
3. Import or add stock.
4. Receive stock.
5. Record movements.
6. Monitor expiry.
7. Monitor low stock.
8. Count stock and reconcile.
9. Review reports and exports.

## Deferred flows

- Multi-branch.
- Automated purchasing.
- AI forecasting.
- Offline sync.
EOF
wc -l /c/Users/USER/Desktop/business/business-platform-web/docs/UI_UX_IMPLEMENTATION_PLAN.md /c/Users/USER/Desktop/business/business-platform-web/docs/INFORMATION_ARCHITECTURE.md /c/Users/USER/Desktop/business/business-platform-web/docs/USER_FLOWS.md
