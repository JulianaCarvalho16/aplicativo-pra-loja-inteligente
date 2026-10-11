export type UserRole = 'admin' | 'caixa' | 'vendedor';

export interface User {
  id: string;
  name: string;
  username: string;
  role: UserRole;
  pin?: string;
}

export type ItemType = 'product' | 'service';

export interface Product {
  id: string;
  sku: string;
  barcode: string;
  name: string;
  category: string;
  type: ItemType;
  price: number;
  costPrice: number;
  stock: number;
  unit: string;
  imageUrl?: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  discount: number; // in currency R$
  notes?: string;
}

export type PaymentMethod = 'dinheiro' | 'pix' | 'cartao_credito' | 'cartao_debito' | 'multiplo';

export interface PaymentDetails {
  receivedAmount?: number;
  changeAmount?: number;
  cardBrand?: string;
  cardInstallments?: number;
  pixCode?: string;
  splits?: Array<{ method: PaymentMethod; amount: number }>;
}

export interface SaleItemData {
  productId: string;
  name: string;
  sku: string;
  price: number;
  quantity: number;
  discount: number;
  total: number;
  type: ItemType;
}

export interface Sale {
  id: string;
  saleNumber: string;
  timestamp: string;
  sellerId: string;
  sellerName: string;
  customerId?: string;
  customerCpf?: string;
  customerIp?: string;
  customerName?: string;
  items: SaleItemData[];
  subtotal: number;
  discount: number;
  total: number;
  paymentMethod: PaymentMethod;
  paymentDetails: PaymentDetails;
  notes?: string;
  status: 'completed' | 'cancelled';
  syncedOffline?: boolean;
}

export interface CashMovement {
  id: string;
  sessionId: string;
  type: 'suprimento' | 'sangria';
  amount: number;
  reason: string;
  operatorId: string;
  operatorName: string;
  timestamp: string;
}

export interface CashSession {
  id: string;
  status: 'open' | 'closed';
  openedAt: string;
  closedAt?: string;
  openedBy: string;
  openedByName: string;
  initialAmount: number;
  movements: CashMovement[];
  closingNotes?: string;
  actualAmount?: number;
  closedBy?: string;
  closedByName?: string;
  validatedByAdmin?: string;
}

export type DeliveryType = 'pickup' | 'delivery';
export type OrderStatus = 'pending' | 'preparing' | 'ready_for_pickup' | 'delivered' | 'cancelled';

export interface OnlineOrderItem {
  productId: string;
  name: string;
  sku: string;
  price: number;
  quantity: number;
  total: number;
}

export interface OnlineOrder {
  id: string;
  orderNumber: string;
  customerId?: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerCpf?: string;
  deliveryType: DeliveryType;
  deliveryAddress?: string;
  items: OnlineOrderItem[];
  subtotal: number;
  shippingFee: number;
  total: number;
  paymentMethod: 'pix' | 'cartao_credito';
  paymentStatus: 'paid' | 'pending';
  orderStatus: OrderStatus;
  createdAt: string;
  notes?: string;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  cpf?: string;
  address?: string;
  notes?: string;
  createdAt: string;
}

export interface CustomerHistoryItem {
  id: string;
  transactionId: string;
  transactionNumber: string;
  date: string;
  type: 'product' | 'service';
  productId: string;
  name: string;
  sku: string;
  price: number;
  unitPrice?: number;
  quantity: number;
  discount: number;
  total: number;
  sellerName?: string;
  paymentMethod?: string;
  origin: 'pos' | 'online';
  status?: string;
}

export interface CustomerHistoryTransaction {
  id: string;
  number: string;
  date: string;
  origin: 'pos' | 'online';
  total: number;
  itemsCount: number;
  sellerName?: string;
  paymentMethod?: string;
  status: string;
}

export interface CustomerHistory {
  customer: Customer;
  totalSpent: number;
  totalTransactions: number;
  totalItemsPurchased: number;
  totalServicesUsed: number;
  firstVisit?: string;
  lastVisit?: string;
  items: CustomerHistoryItem[];
  transactions: CustomerHistoryTransaction[];
  metrics?: {
    totalSpent: number;
    totalTransactions: number;
    totalItemsPurchased: number;
    totalServicesUsed: number;
    firstVisitDate?: string;
    lastVisitDate?: string;
  };
}

export interface CloudBackupSnapshot {
  version: string;
  timestamp: string;
  deviceOrigin: string;
  totalProducts: number;
  totalSales: number;
  totalOnlineOrders: number;
  products: Product[];
  sales: Sale[];
  onlineOrders: OnlineOrder[];
  cashSessions: CashSession[];
}

