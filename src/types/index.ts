// ──────────────────────────────────────────────────────────
// User types
// ──────────────────────────────────────────────────────────

export type UserRole = 'client' | 'organizer' | 'promoter' | 'admin';

export interface UserSession {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  avatar?: string;
  loyaltyPoints: number;
  createdAt: string;
}

// ──────────────────────────────────────────────────────────
// Event types
// ──────────────────────────────────────────────────────────

export type EventStatus = 'draft' | 'active' | 'sold_out' | 'finished';

export interface EventSummary {
  id: string;
  title: string;
  description: string;
  date: string;
  endDate: string;
  status: EventStatus;
  coverImage?: string;
  tags: string[];
  ticketPrice?: number;
  venue: {
    id: string;
    name: string;
    address: string;
  };
}

export interface EventDetail extends EventSummary {
  organizerId: string;
  layout3DConfig: Record<string, any>;
  tableCategories: TableCategoryInfo[];
  availableTables: number;
  totalTables: number;
}

// ──────────────────────────────────────────────────────────
// Venue types
// ──────────────────────────────────────────────────────────

export interface VenueInfo {
  id: string;
  name: string;
  address: string;
  capacity: number;
  images: string[];
  layout3DModel: Record<string, any>;
}

// ──────────────────────────────────────────────────────────
// Table types
// ──────────────────────────────────────────────────────────

export type TableStatus = 'available' | 'reserved' | 'sold' | 'blocked';

export interface Position3D {
  x: number;
  y: number;
  z: number;
}

export interface TablePosition3D extends Position3D {
  rotation: number;
}

export interface TableCategoryInfo {
  id: string;
  name: string;
  price: number;
  capacity: number;
  color: string;
  benefits: string[];
  position3D: Position3D;
  icon?: string;
}

export interface TableInfo {
  id: string;
  eventId: string;
  categoryId: string;
  number: number;
  label: string;
  status: TableStatus;
  position3D: TablePosition3D;
  sectorLabel: string;
  category?: TableCategoryInfo;
}

export interface TableWithCategory extends TableInfo {
  category: TableCategoryInfo;
}

// ──────────────────────────────────────────────────────────
// Reservation types
// ──────────────────────────────────────────────────────────

export type ReservationStatus = 'pending' | 'confirmed' | 'cancelled' | 'used';

export interface ReservationInfo {
  id: string;
  userId: string;
  eventId: string;
  tableId: string;
  promoterId?: string;
  status: ReservationStatus;
  paymentMethod?: string;
  amount: number;
  qrCode: string;
  qrUsed: boolean;
  benefits: string[];
  guestCount: number;
  guestNames: string[];
  notes?: string;
  createdAt: string;
}

export interface ReservationDetail extends ReservationInfo {
  event: EventSummary;
  table: TableWithCategory;
  user: {
    id: string;
    name: string;
    email: string;
    phone?: string;
  };
}

// ──────────────────────────────────────────────────────────
// Payment types
// ──────────────────────────────────────────────────────────

export type PaymentProvider = 'mercadopago' | 'cash';
export type PaymentStatus = 'pending' | 'approved' | 'rejected' | 'refunded';

export interface PaymentInfo {
  id: string;
  reservationId: string;
  provider: PaymentProvider;
  externalId?: string;
  status: PaymentStatus;
  amount: number;
  currency: string;
  paidAt?: string;
  createdAt: string;
}

// ──────────────────────────────────────────────────────────
// Promoter types
// ──────────────────────────────────────────────────────────

export interface PromoterInfo {
  id: string;
  userId: string;
  eventId: string;
  organizerId: string;
  commissionRate: number;
  totalSales: number;
  totalEarnings: number;
  referralToken: string;
  isActive: boolean;
  assignedTablesCount: number;
}

export interface PromoterDashboard {
  promoter: PromoterInfo;
  recentSales: ReservationInfo[];
  event: EventSummary;
  user: {
    id: string;
    name: string;
    email: string;
  };
}

// ──────────────────────────────────────────────────────────
// Notification types
// ──────────────────────────────────────────────────────────

export type NotificationType =
  | 'reservation_confirmed'
  | 'payment_received'
  | 'table_assigned'
  | 'event_reminder'
  | 'commission_earned'
  | 'system';

export interface NotificationInfo {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  link?: string;
  createdAt: string;
}

// ──────────────────────────────────────────────────────────
// API response types
// ──────────────────────────────────────────────────────────

export interface ApiSuccessResponse<T = any> {
  success: true;
  data: T;
}

export interface ApiErrorResponse {
  success: false;
  error: string;
}

export type ApiResponse<T = any> = ApiSuccessResponse<T> | ApiErrorResponse;

// ──────────────────────────────────────────────────────────
// Pagination types
// ──────────────────────────────────────────────────────────

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// ──────────────────────────────────────────────────────────
// Checkout flow types
// ──────────────────────────────────────────────────────────

export type CheckoutStep = 'select' | 'checkout' | 'confirmation';

export interface CheckoutFormData {
  guestCount: number;
  guestNames: string[];
  notes: string;
  paymentMethod: PaymentProvider;
  promoterToken?: string;
}

// ──────────────────────────────────────────────────────────
// 3D Layout types
// ──────────────────────────────────────────────────────────

export interface Layout3DConfig {
  floorTexture?: string;
  wallColor?: string;
  ambientLight?: number;
  spotLights?: Array<{
    position: Position3D;
    color: string;
    intensity: number;
  }>;
  decorations?: Array<{
    type: string;
    position: Position3D;
    scale: number;
    rotation?: number;
  }>;
  cameraPosition?: Position3D;
  cameraTarget?: Position3D;
}

// ──────────────────────────────────────────────────────────
// Search / Filter types
// ──────────────────────────────────────────────────────────

export interface EventFilters {
  status?: EventStatus;
  dateFrom?: string;
  dateTo?: string;
  tags?: string[];
  search?: string;
  organizerId?: string;
  sortBy?: 'date' | 'title' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

export interface ReservationFilters {
  status?: ReservationStatus;
  eventId?: string;
  userId?: string;
  promoterId?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: 'createdAt' | 'amount';
  sortOrder?: 'asc' | 'desc';
}

// ──────────────────────────────────────────────────────────
// Organizer dashboard analytics
// ──────────────────────────────────────────────────────────

export interface OrganizerAnalytics {
  totalEvents: number;
  totalReservations: number;
  totalRevenue: number;
  totalPromoters: number;
  revenueByEvent: Array<{
    eventId: string;
    eventTitle: string;
    revenue: number;
    reservationCount: number;
  }>;
  reservationsByStatus: Record<ReservationStatus, number>;
  recentReservations: ReservationDetail[];
}
