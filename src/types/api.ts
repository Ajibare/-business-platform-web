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
