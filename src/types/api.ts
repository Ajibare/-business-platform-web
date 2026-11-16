export interface ApiResponse<T> {
  data: T;
  meta?: Record<string, unknown>;
}

export interface HealthResponse {
  status: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export type ApiErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'NOT_FOUND'
  | 'FORBIDDEN'
  | 'CONFLICT'
  | 'INSUFFICIENT_STOCK'
  | 'STALE_COUNT'
  | 'DUPLICATE_REQUEST'
  | 'IMPORT_ROW_ERRORS'
  | 'RATE_LIMITED'
  | 'INTERNAL_ERROR';

export interface ErrorResponseBody {
  statusCode: number;
  error: string;
  code: string;
  message: string;
}

export interface Medicine {
  id: string;
  organizationId: string;
  name: string;
  normalizedName: string;
  brand: string | null;
  strength: string | null;
  dosageForm: string | null;
  packSize: string | null;
  unit: string;
  barcode: string | null;
  reorderThreshold: number | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  totalRecordedQuantity: number;
}

export interface Batch {
  id: string;
  organizationId: string;
  productId: string;
  medicineName: string;
  batchNumber: string | null;
  expiryDate: string | null;
  unit: string;
  unitCost: number | null;
  sellingPrice: number | null;
  balanceQuantity: number;
  version: number;
}

export interface DashboardSummary {
  medicines: number;
  outOfStock: number;
  lowStock: number;
  nearExpiry: number;
  expired: number;
  unknownExpiry: number;
  estimatedValueAtRisk: number | null;
}

export interface LowStockItem {
  medicineId: string;
  name: string;
  unit: string;
  reorderThreshold: number;
  totalRecordedQuantity: number;
}

export interface StockCountLine {
  id: string;
  countId: string;
  batchId: string | null;
  productId: string | null;
  recordedQuantity: number | null;
  countedQuantity: number;
  variance: number | null;
  note: string | null;
  versionAtCount: string;
}

export interface StockCount {
  id: string;
  organizationId: string;
  status: string;
  scope: string;
  startedAt: string;
  closedAt: string | null;
  counterId: string | null;
  approverId: string | null;
  lines: StockCountLine[];
}

export interface StockReceiptLine {
  id: string;
  receiptId: string;
  productId: string;
  batchNumber: string | null;
  expiryDate: string | null;
  unitCost: number | null;
  sellingPrice: number | null;
  quantity: number;
}

export interface StockReceipt {
  id: string;
  organizationId: string;
  supplierId: string | null;
  externalReference: string | null;
  status: string;
  receivedAt: string;
  actorId: string | null;
  lines: StockReceiptLine[];
}

export interface Supplier {
  id: string;
  organizationId: string;
  name: string;
  phone: string | null;
  email: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Movement {
  id: string;
  organizationId: string;
  batchId: string;
  type: string;
  quantityDelta: number;
  reason: string | null;
  actorId: string | null;
  idempotencyKey: string;
  reversalOfId: string | null;
  occurredAt: string;
  balanceQuantity: number;
  version: number;
}

export interface ExpiryBatch {
  batchId: string;
  productId: string;
  medicineName: string;
  batchNumber: string | null;
  expiryDate: string;
  quantity: number;
  unitCost: number | null;
  estimatedValue: number | null;
}

export interface DailySalesSummary {
  transactions: number;
  unitsSold: number;
  grossSales: number;
  discounts: number;
  revenue: number;
  refunds: number;
  netSales: number;
  /** Null when any sold batch has no recorded purchase cost. */
  cogs: number | null;
  grossProfit: number | null;
}

export interface DailyPerformance {
  date: string;
  timeZone: string;
  currency: string;
  recordedStockIssues: {
    transactions: number;
    products: number;
    quantity: number;
  };
  sales: {
    available: true;
    transactions: number;
    products: number;
    amount: number;
  };
  income: DailySalesSummary;
  gain: {
    available: boolean;
    amount: number | null;
    reason: string;
  };
  commission: {
    available: false;
    amount: null;
    reason: string;
  };
  definitions: Record<string, string>;
}

export interface NotificationPreferences {
  organizationId: string;
  inAppEnabled: boolean;
  emailEnabled: boolean;
  expiryRemindersEnabled: boolean;
  saleNotificationsEnabled: boolean;
  reminderLeadDays: number;
  reminderIntervalDays: number;
  dailyReportEnabled: boolean;
  /** Local delivery time, HH:mm. */
  dailyReportTime: string;
  /** IANA timezone override; null uses the workspace timezone. */
  dailyReportTimezone: string | null;
  updatedAt: string;
}

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  severity: string;
  productId: string | null;
  batchId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  readAt: string | null;
}

export interface NotificationUnreadCount {
  unread: number;
  inAppEnabled: boolean;
}

export interface NotificationCapabilities {
  inAppNotifications: boolean;
  emailNotifications: boolean;
  expiryReminders: boolean;
  salesNotificationsAvailable: boolean;
  dailySalesReports: boolean;
  emailTransport: string;
}

export interface NotificationRecipient {
  id: string;
  email: string;
  name: string | null;
  active: boolean;
  receivesExpiry: boolean;
  receivesSales: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface NotificationDelivery {
  id: string;
  notificationId: string;
  notificationTitle?: string;
  notificationType?: string;
  recipient: string;
  status: string;
  attempts: number;
  lastError: string | null;
  lastAttemptAt: string | null;
  nextAttemptAt: string | null;
  sentAt: string | null;
  createdAt?: string;
}

export interface ExpiryScanSummary {
  organizationsScanned: number;
  batchesScanned: number;
  remindersCreated: number;
  emailsQueued: number;
  emailsSent: number;
  emailsFailed: number;
  alreadyNotified: number;
}

export type BarcodeExpiryStatus = 'EXPIRED' | 'EXPIRING_SOON' | 'OK' | 'UNKNOWN';

export interface BarcodeBatch {
  id: string;
  batchNumber: string | null;
  expiryDate: string | null;
  unit: string;
  unitCost: number | null;
  sellingPrice: number | null;
  balanceQuantity: number;
  daysToExpiry: number | null;
  expiryStatus: BarcodeExpiryStatus;
}

export interface BarcodeLookup {
  barcode: string;
  product: {
    id: string;
    name: string;
    brand: string | null;
    strength: string | null;
    dosageForm: string | null;
    packSize: string | null;
    unit: string;
    barcode: string | null;
    reorderThreshold: number | null;
    active: boolean;
    totalRecordedQuantity: number;
  };
  batches: BarcodeBatch[];
}

export type ImportType = 'PRODUCTS' | 'BATCHES' | 'INITIAL_STOCK';

export interface ImportColumnSchema {
  key: string;
  header: string;
  required: boolean;
  description: string;
  example: string;
}

export interface ImportTypeSchema {
  type: ImportType;
  label: string;
  summary: string;
  instructions: string[];
  fileTypes: string[];
  templateFormats?: string[];
  maxRows: number;
  columns: ImportColumnSchema[];
}

export interface ImportJobSummary {
  fileErrors: string[];
  mapping: Record<string, string | null>;
  headers: string[];
  format?: 'csv' | 'xlsx';
}

export interface ImportJob {
  id: string;
  type: ImportType;
  filename: string;
  status: string;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  duplicateRows: number;
  importedRows: number;
  failedRows: number;
  createdAt: string;
  completedAt: string | null;
}

export interface ImportJobRow {
  rowNumber: number;
  status: 'VALID' | 'INVALID' | 'DUPLICATE' | 'IMPORTED' | 'FAILED';
  errors: string[];
  values: Record<string, string>;
  productId?: string | null;
  batchId?: string | null;
}

export interface ImportJobDetail extends ImportJob {
  summary: ImportJobSummary;
  previewLimit: number;
  rows: ImportJobRow[];
}

export interface ApiFile {
  filename: string;
  contentType: string;
  /** CSV text, or base64 when `encoding` is `base64`. */
  content: string;
  encoding?: 'text' | 'base64';
}

export type ExpiryBucket = 'EXPIRED' | 'WITHIN_30' | 'WITHIN_60' | 'WITHIN_90' | 'BEYOND';
export type ExpirySeverity = 'critical' | 'warning' | 'attention' | 'ok';

export interface ExpiryAlertItem {
  batchId: string;
  productId: string;
  medicineName: string;
  batchNumber: string | null;
  expiryDate: string;
  daysRemaining: number;
  quantity: number;
  unit: string;
  unitCost: number | null;
  valueAtRisk: number | null;
  bucket: ExpiryBucket;
  severity: ExpirySeverity;
  statusLabel: string;
}

export interface ExpiryAlertCounts {
  expired: number;
  within30: number;
  within60: number;
  within90: number;
}

export interface ExpiryAlerts {
  generatedAt: string;
  timeZone: string;
  windowDays: number;
  counts: ExpiryAlertCounts;
  totals: ExpiryAlertCounts & {
    batches: number;
    medicines: number;
    valueAtRisk: number | null;
  };
  items: ExpiryAlertItem[];
}

export interface DailyReport {
  organizationId: string;
  pharmacyName: string;
  date: string;
  timeZone: string;
  deliveryTime: string;
  currency: string;
  summary: DailySalesSummary;
  recipients: string[];
  alreadySent: boolean;
}

export interface DailyReportSendResult {
  report: DailyReport;
  skipped: boolean;
  reason?: string;
  notificationId: string | null;
  emailsQueued: number;
  emailsSent: number;
  emailsFailed: number;
}

export interface BulkMedicineRowInput {
  name: string;
  genericName?: string;
  category?: string;
  brand?: string;
  strength?: string;
  dosageForm?: string;
  packSize?: string;
  unit: string;
  sku?: string;
  reorderThreshold?: number;
  batchNumber?: string;
  expiryDate?: string;
  quantity?: number;
  unitCost?: number;
  sellingPrice?: number;
  supplierId?: string;
}

export type BulkMedicineRowStatus = 'CREATED' | 'BATCH_ADDED' | 'FAILED';

export interface BulkMedicineRowResult {
  row: number;
  name: string;
  status: BulkMedicineRowStatus;
  medicineId: string | null;
  batchId: string | null;
  quantity: number | null;
  errors: string[];
  warnings: string[];
}

export interface BulkMedicineResult {
  totalRows: number;
  created: number;
  batchesAdded: number;
  failed: number;
  rows: BulkMedicineRowResult[];
}

export interface StockOnHand {
  productId: string;
  name: string;
  unit: string;
  /** Quantity in unexpired batches, which is what FEFO can sell. */
  sellableQuantity: number;
  expiredQuantity: number;
  totalQuantity: number;
  batchCount: number;
  nearestExpiryDate: string | null;
  sellingPrice: number | null;
}

export type SaleStatus = 'COMPLETED' | 'VOIDED';

export interface SaleLine {
  id: string;
  productId: string;
  medicineName: string;
  batchId: string;
  batchNumber: string | null;
  quantity: number;
  returnedQuantity: number;
  unitPrice: number;
  discount: number;
  lineTotal: number;
  unitCost: number | null;
  costTotal: number | null;
}

export interface Sale {
  id: string;
  organizationId: string;
  reference: string;
  status: SaleStatus;
  occurredAt: string;
  customerName: string | null;
  note: string | null;
  subtotal: number;
  discountTotal: number;
  refundTotal: number;
  revenue: number;
  netSales: number;
  costTotal: number | null;
  grossProfit: number | null;
  unitCount: number;
  voidedAt: string | null;
  createdAt: string;
  lines: SaleLine[];
}
