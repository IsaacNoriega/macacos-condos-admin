export type UserRole = 'superadmin' | 'admin' | 'residente' | 'familiar';

export interface ApiErrorResponse {
  success?: boolean;
  message?: string;
  errors?: unknown;
}

export interface AuthUser {
  _id: string;
  tenantId: string;
  name: string;
  email: string;
  role: UserRole;
  isActive?: boolean;
  createdAt?: string;
}

export interface LoginResponse {
  success: boolean;
  token: string;
  user: AuthUser;
}

export interface Tenant {
  _id: string;
  name: string;
  address: string;
  contactEmail: string;
  createdAt?: string;
}

export interface User {
  _id: string;
  tenantId: string;
  name: string;
  email: string;
  role: UserRole;
  isActive?: boolean;
  createdAt?: string;
}

export interface Unit {
  _id: string;
  tenantId: string;
  code: string;
  type: 'departamento' | 'casa';
  description?: string;
  isActive?: boolean;
}

export interface Resident {
  _id: string;
  tenantId: string;
  unitId: string;
  name: string;
  email: string;
  phone?: string;
  relationship: 'propietario' | 'familiar' | 'inquilino';
  isActive?: boolean;
}

export interface Charge {
  _id: string;
  tenantId: string;
  unitId?: string;
  userId: string;
  description: string;
  amount: number;
  dueDate: string;
  lateFeePerDay?: number;
  isPaid: boolean;
}

export interface Payment {
  _id: string;
  tenantId: string;
  unitId?: string;
  userId: string;
  chargeId: string;
  baseAmount?: number;
  lateFeeAmount?: number;
  daysOverdue?: number;
  amount: number;
  currency: string;
  provider: 'manual' | 'stripe';
  status: 'pending' | 'in_review' | 'completed' | 'failed' | 'paid';
  proofOfPaymentUrl?: string;
  proofOfPaymentBlobName?: string;
  stripeSessionId?: string;
  stripePaymentIntentId?: string;
  paymentDate: string;
  reviewedBy?: string;
  reviewedAt?: string;
}

export interface MaintenanceReport {
  _id: string;
  tenantId: string;
  userId: string;
  description: string;
  status: 'pendiente' | 'en progreso' | 'resuelto';
  assignedTo?: string;
}

export interface Reservation {
  _id: string;
  tenantId: string;
  userId: string;
  amenity: string;
  start: string;
  end: string;
  status: 'activa' | 'cancelada';
}

export interface StripeCheckoutResponse {
  success: boolean;
  sessionId: string;
  checkoutUrl: string;
}

export interface PaymentProofUploadResponse {
  success: boolean;
  proofOfPaymentUrl: string;
  blobName: string;
}

export interface CrudFieldOption {
  label: string;
  value: string;
}

export interface CrudFieldOptionSource {
  endpoint: string;
  listKey: string;
  valueKey: string;
  labelKey: string;
  labelSecondaryKey?: string;
  dependsOnTenant?: boolean;
  filterBy?: {
    key: string;
    values: string[];
  };
}

export interface CrudFieldAutoFill {
  targetKey: string;
  sourceKey: string;
}

export interface CrudField {
  key: string;
  label: string;
  type: 'text' | 'email' | 'number' | 'date' | 'datetime-local' | 'textarea' | 'select';
  required?: boolean;
  placeholder?: string;
  options?: CrudFieldOption[];
  optionsSource?: CrudFieldOptionSource;
  autoFill?: CrudFieldAutoFill[];
}

export interface CrudFilter {
  key: string;
  label: string;
  optionsSource: CrudFieldOptionSource;
}

export interface CrudConfig {
  title: string;
  endpoint: string;
  listKey: string;
  singularKey: string;
  fields: CrudField[];
  filters?: CrudFilter[];
  allowCreate?: boolean;
  allowEdit?: boolean;
  allowDelete?: boolean;
  canEditItem?: (item: Record<string, unknown>) => boolean;
  canDeleteItem?: (item: Record<string, unknown>) => boolean;
}
