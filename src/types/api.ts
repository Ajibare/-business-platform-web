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

export interface DailyPerformance {
  date: string;
  timeZone: string;
  currency: string;
  recordedStockIssues: {
    transactions: number;
    products: number;
    quantity: number;
  };
  sales: UnavailableMetric & {
    transactions: null;
    products: null;
  };
  gain: UnavailableMetric;
  commission: UnavailableMetric;
  definitions: Record<string, string>;
}

export interface UnavailableMetric {
  available: false;
  amount: null;
  reason: string;
}

export interface NotificationPreferences {
  organizationId: string;
  inAppEnabled: boolean;
  emailEnabled: boolean;
  expiryRemindersEnabled: boolean;
  saleNotificationsEnabled: boolean;
  reminderLeadDays: number;
  reminderIntervalDays: number;
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
  maxRows: number;
  columns: ImportColumnSchema[];
}

export interface ImportJobSummary {
  fileErrors: string[];
  mapping: Record<string, string | null>;
  headers: string[];
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
  content: string;
}
