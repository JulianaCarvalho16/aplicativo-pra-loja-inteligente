import express from 'express';
import type { Request, Response } from 'express';
import http from 'http';
import net from 'net';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';

const app = express();

const DEFAULT_PORT = Number(process.env.PORT) || 3000;

async function getAvailablePort(port: number): Promise<number> {
  return new Promise((resolve) => {
    const tester = net.createServer();

    tester.once('error', () => {
      resolve(getAvailablePort(port + 1));
    });

    tester.once('listening', () => {
      tester.close(() => resolve(port));
    });

    tester.listen(port, '0.0.0.0');
  });
}

function listenWithRetry(server: http.Server, port: number): Promise<number> {
  return new Promise((resolve, reject) => {
    const tryListen = (candidate: number) => {
      const handleError = (error: NodeJS.ErrnoException) => {
        if (error.code === 'EADDRINUSE') {
          const nextPort = candidate + 1;
          console.warn(`[PDV Server] Port ${candidate} is busy. Trying ${nextPort} instead.`);
          server.removeListener('error', handleError);
          tryListen(nextPort);
          return;
        }

        server.removeListener('error', handleError);
        reject(error);
      };

      server.once('error', handleError);
      server.listen(candidate, '0.0.0.0', () => {
        server.removeListener('error', handleError);
        resolve(candidate);
      });
    };

    tryListen(port);
  });
}

app.use(express.json());

// Enable proxy trust to accurately read client IP
app.set('trust proxy', true);

// Central Database File
const DB_FILE = path.resolve(process.cwd(), 'data', 'central-db.json');

interface User {
  id: string;
  name: string;
  username: string;
  role: 'admin' | 'caixa' | 'vendedor';
  pin: string;
  avatar?: string;
}

interface Product {
  id: string;
  sku: string;
  barcode: string;
  name: string;
  category: string;
  type: 'product' | 'service';
  price: number;
  costPrice: number;
  stock: number;
  unit: string;
  imageUrl?: string;
}

interface SaleItem {
  productId: string;
  name: string;
  sku: string;
  price: number;
  quantity: number;
  discount: number;
  total: number;
  type: 'product' | 'service';
}

interface Sale {
  id: string;
  saleNumber: string;
  timestamp: string;
  sellerId: string;
  sellerName: string;
  customerId?: string;
  customerCpf?: string;
  customerIp?: string;
  customerName?: string;
  items: SaleItem[];
  subtotal: number;
  discount: number;
  total: number;
  paymentMethod: 'dinheiro' | 'pix' | 'cartao_credito' | 'cartao_debito' | 'multiplo';
  paymentDetails: {
    receivedAmount?: number;
    changeAmount?: number;
    cardBrand?: string;
    cardInstallments?: number;
    pixCode?: string;
    splits?: Array<{ method: string; amount: number }>;
  };
  notes?: string;
  status: 'completed' | 'cancelled';
  syncedOffline?: boolean;
}

interface CashMovement {
  id: string;
  sessionId: string;
  type: 'suprimento' | 'sangria';
  amount: number;
  reason: string;
  operatorId: string;
  operatorName: string;
  timestamp: string;
}

interface CashSession {
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

interface OnlineOrderItem {
  productId: string;
  name: string;
  sku: string;
  price: number;
  quantity: number;
  total: number;
}

interface OnlineOrder {
  id: string;
  orderNumber: string;
  customerId?: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerCpf?: string;
  deliveryType: 'pickup' | 'delivery';
  deliveryAddress?: string;
  items: OnlineOrderItem[];
  subtotal: number;
  shippingFee: number;
  total: number;
  paymentMethod: 'pix' | 'cartao_credito';
  paymentStatus: 'paid' | 'pending';
  orderStatus: 'pending' | 'preparing' | 'ready_for_pickup' | 'delivered' | 'cancelled';
  createdAt: string;
  notes?: string;
}

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  cpf: string;
  password?: string;
  address?: string;
  notes?: string;
  createdAt: string;
}

interface DatabaseSchema {
  users: User[];
  products: Product[];
  sales: Sale[];
  cashSessions: CashSession[];
  onlineOrders: OnlineOrder[];
  customers: Customer[];
  lastBackupTimestamp?: string;
}

const DEFAULT_USERS: User[] = [
  { id: 'usr-1', name: 'Ana Gestora', username: 'admin', role: 'admin', pin: '1234' },
  { id: 'usr-2', name: 'Carlos Silva', username: 'carlos', role: 'caixa', pin: '1001' },
  { id: 'usr-3', name: 'Mariana Santos', username: 'mariana', role: 'vendedor', pin: '1002' },
  { id: 'usr-4', name: 'Lucas Oliveira', username: 'lucas', role: 'vendedor', pin: '1003' },
];

const DEFAULT_CUSTOMERS: Customer[] = [
  {
    id: 'cust-1',
    name: 'Beatriz Lima',
    email: 'beatriz.lima@email.com',
    phone: '(11) 98765-4321',
    cpf: '123.456.789-00',
    password: '123456',
    address: 'Av. Paulista, 1000, Apto 42 - Bela Vista, São Paulo - SP',
    notes: 'Cliente VIP • Compra frequente pelo e-commerce e retira no balcão',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(),
  },
  {
    id: 'cust-2',
    name: 'Marcos Fernandes',
    email: 'marcos.fernandes@email.com',
    phone: '(11) 95345-6789',
    cpf: '409.182.736-54',
    password: '123456',
    address: 'Rua Vergueiro, 890 - Paraíso, São Paulo - SP',
    notes: 'Cliente de serviços técnicos e acessórios veiculares',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 45).toISOString(),
  },
  {
    id: 'cust-3',
    name: 'Juliana Costa',
    email: 'juliana.costa@email.com',
    phone: '(11) 94456-7890',
    cpf: '628.190.432-11',
    password: '123456',
    address: 'Alameda Santos, 200 - Cerqueira César, São Paulo - SP',
    notes: 'Costuma solicitar higienização e manutenção preventiva de smartphone',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 60).toISOString(),
  },
  {
    id: 'cust-4',
    name: 'Carlos Mendes',
    email: 'carlos.mendes@email.com',
    phone: '(11) 97123-4567',
    cpf: '142.983.471-20',
    password: '123456',
    address: 'Rua das Flores, 120 - Jardins, São Paulo - SP',
    notes: 'Consumidor matinal frequente de café espresso gourmet',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 90).toISOString(),
  },
  {
    id: 'cust-5',
    name: 'Mariana Souza',
    email: 'mariana.souza@email.com',
    phone: '(11) 96234-5678',
    cpf: '302.819.554-12',
    password: '123456',
    address: 'Rua Augusta, 450 - Consolação, São Paulo - SP',
    notes: 'Adquire periféricos e cabos reforçados para o trabalho',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 15).toISOString(),
  },
  {
    id: 'cust-6',
    name: 'Lucas Ribeiro',
    email: 'lucas.ribeiro@email.com',
    phone: '(11) 93567-8901',
    cpf: '831.294.019-33',
    password: '123456',
    address: 'Rua Oscar Freire, 310 - Pinheiros, São Paulo - SP',
    notes: 'Utilizou serviço de embalagem especial para presente e vestuário premium',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 20).toISOString(),
  },
];

const DEFAULT_PRODUCTS: Product[] = [
  // Bebidas & Alimentos
  { id: 'prod-1', sku: 'BEB-001', barcode: '7891000100011', name: 'Café Espresso Gourmet 100ml', category: 'Bebidas', type: 'product', price: 7.50, costPrice: 2.20, stock: 120, unit: 'un', imageUrl: '/src/assets/images/product_espresso_coffee_cup_1791696161770.jpg' },
  { id: 'prod-2', sku: 'BEB-002', barcode: '7891000100028', name: 'Água Mineral Crystal 500ml', category: 'Bebidas', type: 'product', price: 4.00, costPrice: 1.10, stock: 85, unit: 'un', imageUrl: 'https://images.unsplash.com/photo-1548839140-29a749e1bc4e?auto=format&fit=crop&w=600&q=80' },
  { id: 'prod-3', sku: 'BEB-003', barcode: '7891000100035', name: 'Refrigerante Coca-Cola Lata 350ml', category: 'Bebidas', type: 'product', price: 6.50, costPrice: 3.20, stock: 64, unit: 'un', imageUrl: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=600&q=80' },
  { id: 'prod-4', sku: 'ALM-001', barcode: '7891000100042', name: 'Pão de Queijo Mineiro Tradicional', category: 'Alimentos', type: 'product', price: 5.00, costPrice: 1.80, stock: 45, unit: 'un', imageUrl: '/src/assets/images/product_pao_de_queijo_1791696181604.jpg' },
  { id: 'prod-5', sku: 'ALM-002', barcode: '7891000100059', name: 'Sanduíche Natural Peito de Peru', category: 'Alimentos', type: 'product', price: 14.90, costPrice: 6.50, stock: 28, unit: 'un', imageUrl: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=600&q=80' },

  // Acessórios & Eletrônicos
  { id: 'prod-6', sku: 'ELE-001', barcode: '7891000100066', name: 'Cabo USB-C Trançado 1.5m Reforçado', category: 'Eletrônicos', type: 'product', price: 29.90, costPrice: 10.00, stock: 35, unit: 'un', imageUrl: '/src/assets/images/product_braided_usbc_cable_1791696171821.jpg' },
  { id: 'prod-7', sku: 'ELE-002', barcode: '7891000100073', name: 'Carregador Turbo Rápido 30W Bivolt', category: 'Eletrônicos', type: 'product', price: 59.90, costPrice: 22.00, stock: 18, unit: 'un', imageUrl: 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?auto=format&fit=crop&w=600&q=80' },
  { id: 'prod-8', sku: 'ELE-003', barcode: '7891000100080', name: 'Fone Bluetooth TWS Estéreo Sem Fio', category: 'Eletrônicos', type: 'product', price: 119.90, costPrice: 48.00, stock: 14, unit: 'un', imageUrl: '/src/assets/images/product_tws_bluetooth_headphones_1791696148666.jpg' },
  { id: 'prod-9', sku: 'ELE-004', barcode: '7891000100097', name: 'Suporte Articulado Veicular para Celular', category: 'Eletrônicos', type: 'product', price: 34.90, costPrice: 12.00, stock: 22, unit: 'un', imageUrl: 'https://images.unsplash.com/photo-1586953208448-b95a79798f07?auto=format&fit=crop&w=600&q=80' },

  // Moda & Utilidades
  { id: 'prod-10', sku: 'MOD-001', barcode: '7891000100103', name: 'Camiseta Algodão Egípcio Básica', category: 'Vestuário', type: 'product', price: 69.90, costPrice: 28.00, stock: 40, unit: 'un', imageUrl: '/src/assets/images/product_cotton_tshirt_1791696190214.jpg' },
  { id: 'prod-11', sku: 'MOD-002', barcode: '7891000100110', name: 'Meia Cano Curto Algodão (Kit 3 pares)', category: 'Vestuário', type: 'product', price: 24.90, costPrice: 9.00, stock: 50, unit: 'kit', imageUrl: 'https://images.unsplash.com/photo-1586350977771-b3b0abd50c82?auto=format&fit=crop&w=600&q=80' },
  { id: 'prod-12', sku: 'MOD-003', barcode: '7891000100127', name: 'Bolsa Ecológica Ecobag Algodão Cru', category: 'Utilidades', type: 'product', price: 18.00, costPrice: 6.00, stock: 65, unit: 'un', imageUrl: 'https://images.unsplash.com/photo-1597484662317-9bd7bdda2907?auto=format&fit=crop&w=600&q=80' },

  // Serviços da Loja
  { id: 'serv-1', sku: 'SRV-001', barcode: '9991000100018', name: 'Aplicação de Película de Vidro', category: 'Serviços', type: 'service', price: 20.00, costPrice: 4.00, stock: 9999, unit: 'serv', imageUrl: 'https://images.unsplash.com/photo-1601784551446-20c9e07cdbdb?auto=format&fit=crop&w=600&q=80' },
  { id: 'serv-2', sku: 'SRV-002', barcode: '9991000100025', name: 'Higienização e Limpeza de Smartphone', category: 'Serviços', type: 'service', price: 35.00, costPrice: 5.00, stock: 9999, unit: 'serv', imageUrl: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=600&q=80' },
  { id: 'serv-3', sku: 'SRV-003', barcode: '9991000100032', name: 'Formatação e Otimização Express', category: 'Serviços', type: 'service', price: 80.00, costPrice: 10.00, stock: 9999, unit: 'serv', imageUrl: 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?auto=format&fit=crop&w=600&q=80' },
  { id: 'serv-4', sku: 'SRV-004', barcode: '9991000100049', name: 'Embalagem Especial para Presente', category: 'Serviços', type: 'service', price: 12.00, costPrice: 3.00, stock: 9999, unit: 'serv', imageUrl: 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?auto=format&fit=crop&w=600&q=80' },
];

const getTodayTimestamp = (hour: number, minute: number = 0) => {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, minute, 0);
  return d.toISOString();
};

const DEFAULT_SALES: Sale[] = [
  {
    id: 'sale-init-1',
    saleNumber: '#100101',
    timestamp: getTodayTimestamp(8, 30),
    sellerId: 'usr-2',
    sellerName: 'Carlos Silva',
    customerCpf: '142.983.471-20',
    customerIp: '192.168.1.15',
    items: [
      { productId: 'prod-1', name: 'Café Espresso Gourmet 100ml', sku: 'BEB-001', price: 7.50, quantity: 1, discount: 0, total: 7.50, type: 'product' },
      { productId: 'prod-4', name: 'Pão de Queijo Mineiro Tradicional', sku: 'ALM-001', price: 5.00, quantity: 2, discount: 0, total: 10.00, type: 'product' },
    ],
    subtotal: 17.50,
    discount: 0,
    total: 17.50,
    paymentMethod: 'dinheiro',
    paymentDetails: { receivedAmount: 20.00, changeAmount: 2.50 },
    status: 'completed',
  },
  {
    id: 'sale-init-2',
    saleNumber: '#100102',
    timestamp: getTodayTimestamp(9, 15),
    sellerId: 'usr-3',
    sellerName: 'Mariana Santos',
    customerCpf: '302.819.554-12',
    customerIp: '192.168.1.22',
    items: [
      { productId: 'prod-5', name: 'Sanduíche Natural Peito de Peru', sku: 'ALM-002', price: 14.90, quantity: 1, discount: 0, total: 14.90, type: 'product' },
      { productId: 'prod-6', name: 'Cabo USB-C Trançado 1.5m Reforçado', sku: 'ELE-001', price: 29.90, quantity: 1, discount: 0, total: 29.90, type: 'product' },
    ],
    subtotal: 44.80,
    discount: 0,
    total: 44.80,
    paymentMethod: 'pix',
    paymentDetails: { receivedAmount: 44.80, changeAmount: 0 },
    status: 'completed',
  },
  {
    id: 'sale-init-3',
    saleNumber: '#100103',
    timestamp: getTodayTimestamp(10, 25),
    sellerId: 'usr-2',
    sellerName: 'Carlos Silva',
    customerCpf: '582.471.930-88',
    customerIp: '192.168.1.18',
    items: [
      { productId: 'prod-7', name: 'Carregador Turbo Rápido 30W Bivolt', sku: 'ELE-002', price: 59.90, quantity: 1, discount: 0, total: 59.90, type: 'product' },
    ],
    subtotal: 59.90,
    discount: 0,
    total: 59.90,
    paymentMethod: 'cartao_debito',
    paymentDetails: { receivedAmount: 59.90, changeAmount: 0, cardBrand: 'Mastercard' },
    status: 'completed',
  },
  {
    id: 'sale-init-4',
    saleNumber: '#100104',
    timestamp: getTodayTimestamp(11, 40),
    sellerId: 'usr-4',
    sellerName: 'Lucas Oliveira',
    customerCpf: '219.840.123-45',
    customerIp: '192.168.1.30',
    items: [
      { productId: 'prod-8', name: 'Fone Bluetooth TWS Estéreo Sem Fio', sku: 'ELE-003', price: 119.90, quantity: 1, discount: 0, total: 119.90, type: 'product' },
    ],
    subtotal: 119.90,
    discount: 0,
    total: 119.90,
    paymentMethod: 'cartao_credito',
    paymentDetails: { receivedAmount: 119.90, changeAmount: 0, cardBrand: 'Visa', cardInstallments: 3 },
    status: 'completed',
  },
  {
    id: 'sale-init-5',
    saleNumber: '#100105',
    timestamp: getTodayTimestamp(13, 10),
    sellerId: 'usr-3',
    sellerName: 'Mariana Santos',
    customerCpf: '719.284.103-09',
    customerIp: '192.168.1.14',
    items: [
      { productId: 'prod-10', name: 'Camiseta Algodão Egípcio Básica', sku: 'MOD-001', price: 69.90, quantity: 1, discount: 0, total: 69.90, type: 'product' },
      { productId: 'prod-11', name: 'Meia Cano Curto Algodão (Kit 3 pares)', sku: 'MOD-002', price: 24.90, quantity: 1, discount: 0, total: 24.90, type: 'product' },
    ],
    subtotal: 94.80,
    discount: 5.00,
    total: 89.80,
    paymentMethod: 'pix',
    paymentDetails: { receivedAmount: 89.80, changeAmount: 0 },
    status: 'completed',
  },
  {
    id: 'sale-init-6',
    saleNumber: '#100106',
    timestamp: getTodayTimestamp(14, 25),
    sellerId: 'usr-2',
    sellerName: 'Carlos Silva',
    customerCpf: '409.182.736-54',
    customerIp: '192.168.1.15',
    items: [
      { productId: 'prod-9', name: 'Suporte Articulado Veicular para Celular', sku: 'ELE-004', price: 34.90, quantity: 1, discount: 0, total: 34.90, type: 'product' },
      { productId: 'serv-1', name: 'Aplicação de Película de Vidro', sku: 'SRV-001', price: 20.00, quantity: 1, discount: 0, total: 20.00, type: 'service' },
    ],
    subtotal: 54.90,
    discount: 0,
    total: 54.90,
    paymentMethod: 'multiplo',
    paymentDetails: {
      receivedAmount: 54.90,
      changeAmount: 0,
      splits: [
        { method: 'dinheiro', amount: 20.00 },
        { method: 'cartao_credito', amount: 34.90 },
      ],
    },
    status: 'completed',
  },
  {
    id: 'sale-init-7',
    saleNumber: '#100107',
    timestamp: getTodayTimestamp(15, 45),
    sellerId: 'usr-3',
    sellerName: 'Mariana Santos',
    customerCpf: '628.190.432-11',
    customerIp: '192.168.1.26',
    items: [
      { productId: 'serv-2', name: 'Higienização e Limpeza de Smartphone', sku: 'SRV-002', price: 35.00, quantity: 1, discount: 0, total: 35.00, type: 'service' },
      { productId: 'prod-1', name: 'Café Espresso Gourmet 100ml', sku: 'BEB-001', price: 7.50, quantity: 2, discount: 0, total: 15.00, type: 'product' },
    ],
    subtotal: 50.00,
    discount: 0,
    total: 50.00,
    paymentMethod: 'pix',
    paymentDetails: { receivedAmount: 50.00, changeAmount: 0 },
    status: 'completed',
  },
  {
    id: 'sale-init-8',
    saleNumber: '#100108',
    timestamp: getTodayTimestamp(17, 15),
    sellerId: 'usr-4',
    sellerName: 'Lucas Oliveira',
    customerCpf: '831.294.019-33',
    customerIp: '192.168.1.42',
    items: [
      { productId: 'prod-10', name: 'Camiseta Algodão Egípcio Básica', sku: 'MOD-001', price: 69.90, quantity: 1, discount: 0, total: 69.90, type: 'product' },
      { productId: 'prod-7', name: 'Carregador Turbo Rápido 30W Bivolt', sku: 'ELE-002', price: 59.90, quantity: 1, discount: 0, total: 59.90, type: 'product' },
      { productId: 'serv-4', name: 'Embalagem Especial para Presente', sku: 'SRV-004', price: 12.00, quantity: 1, discount: 0, total: 12.00, type: 'service' },
    ],
    subtotal: 141.80,
    discount: 0,
    total: 141.80,
    paymentMethod: 'cartao_credito',
    paymentDetails: { receivedAmount: 141.80, changeAmount: 0, cardBrand: 'Mastercard', cardInstallments: 2 },
    status: 'completed',
  },
  {
    id: 'sale-init-9',
    saleNumber: '#100109',
    timestamp: getTodayTimestamp(18, 30),
    sellerId: 'usr-2',
    sellerName: 'Carlos Silva',
    customerCpf: '194.820.371-55',
    customerIp: '192.168.1.15',
    items: [
      { productId: 'prod-12', name: 'Bolsa Ecológica Ecobag Algodão Cru', sku: 'MOD-003', price: 18.00, quantity: 2, discount: 0, total: 36.00, type: 'product' },
      { productId: 'prod-3', name: 'Refrigerante Coca-Cola Lata 350ml', sku: 'BEB-003', price: 6.50, quantity: 1, discount: 0, total: 6.50, type: 'product' },
    ],
    subtotal: 42.50,
    discount: 0,
    total: 42.50,
    paymentMethod: 'dinheiro',
    paymentDetails: { receivedAmount: 50.00, changeAmount: 7.50 },
    status: 'completed',
  },
];

function initDb(): DatabaseSchema {
  const dir = path.dirname(DB_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  if (fs.existsSync(DB_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
      // Sync image URLs from DEFAULT_PRODUCTS
      let updatedImages = false;
      if (Array.isArray(data.products)) {
        DEFAULT_PRODUCTS.forEach((def) => {
          const existing = data.products.find((p: Product) => p.id === def.id);
          if (existing && def.imageUrl && existing.imageUrl !== def.imageUrl) {
            existing.imageUrl = def.imageUrl;
            updatedImages = true;
          }
        });
      }
      if (!data.onlineOrders) {
        data.onlineOrders = [
          {
            id: 'ord-101',
            orderNumber: 'ONL-8421',
            customerName: 'Beatriz Lima',
            customerEmail: 'beatriz.lima@email.com',
            customerPhone: '(11) 98765-4321',
            customerCpf: '123.456.789-00',
            deliveryType: 'pickup',
            items: [
              { productId: 'prod-8', name: 'Fone Bluetooth TWS Estéreo Sem Fio', sku: 'ELE-003', price: 119.90, quantity: 1, total: 119.90 },
              { productId: 'prod-6', name: 'Cabo USB-C Trançado 1.5m Reforçado', sku: 'ELE-001', price: 29.90, quantity: 1, total: 29.90 }
            ],
            subtotal: 149.80,
            shippingFee: 0,
            total: 149.80,
            paymentMethod: 'pix',
            paymentStatus: 'paid',
            orderStatus: 'pending',
            createdAt: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
            notes: 'Cliente optou por Retirar na Loja Física (Balcão PDV)'
          }
        ];
        updatedImages = true;
      }
      if (!data.customers || data.customers.length === 0) {
        data.customers = DEFAULT_CUSTOMERS;
        updatedImages = true;
      }
      if (!data.sales || data.sales.length === 0) {
        data.sales = DEFAULT_SALES;
        updatedImages = true;
      } else {
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const hasTodaySales = data.sales.some((s: Sale) => new Date(s.timestamp).getTime() >= startOfToday);
        if (!hasTodaySales) {
          data.sales = [...DEFAULT_SALES, ...data.sales];
          updatedImages = true;
        }
      }
      if (updatedImages) {
        fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
      }
      return data;
    } catch {
      // If corrupted, fallback
    }
  }

  const initialDb: DatabaseSchema = {
    users: DEFAULT_USERS,
    products: DEFAULT_PRODUCTS,
    sales: DEFAULT_SALES,
    customers: DEFAULT_CUSTOMERS,
    cashSessions: [
      {
        id: 'sess-today',
        status: 'open',
        openedAt: new Date().toISOString(),
        openedBy: 'usr-2',
        openedByName: 'Carlos Silva',
        initialAmount: 150.00,
        movements: [],
      }
    ],
    onlineOrders: [
      {
        id: 'ord-101',
        orderNumber: 'ONL-8421',
        customerName: 'Beatriz Lima',
        customerEmail: 'beatriz.lima@email.com',
        customerPhone: '(11) 98765-4321',
        customerCpf: '123.456.789-00',
        deliveryType: 'pickup',
        items: [
          { productId: 'prod-8', name: 'Fone Bluetooth TWS Estéreo Sem Fio', sku: 'ELE-003', price: 119.90, quantity: 1, total: 119.90 },
          { productId: 'prod-6', name: 'Cabo USB-C Trançado 1.5m Reforçado', sku: 'ELE-001', price: 29.90, quantity: 1, total: 29.90 }
        ],
        subtotal: 149.80,
        shippingFee: 0,
        total: 149.80,
        paymentMethod: 'pix',
        paymentStatus: 'paid',
        orderStatus: 'pending',
        createdAt: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
        notes: 'Cliente optou por Retirar na Loja Física (Balcão PDV)'
      }
    ],
    lastBackupTimestamp: new Date().toISOString(),
  };

  fs.writeFileSync(DB_FILE, JSON.stringify(initialDb, null, 2), 'utf-8');
  return initialDb;
}

let db = initDb();

function saveDb() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save central DB:', err);
  }
}

// API Routes
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'online', timestamp: new Date().toISOString(), totalProducts: db.products.length });
});

// Client IP detection endpoint
app.get('/api/client-ip', (req: Request, res: Response) => {
  const forwarded = req.headers['x-forwarded-for'];
  let ip = '';
  if (typeof forwarded === 'string') {
    ip = forwarded.split(',')[0].trim();
  } else if (Array.isArray(forwarded) && forwarded.length > 0) {
    ip = forwarded[0].trim();
  } else {
    ip = req.socket.remoteAddress || '127.0.0.1';
  }

  // Normalize IPv6 localhost
  if (ip === '::1' || ip === '::ffff:127.0.0.1') {
    ip = '127.0.0.1';
  }

  res.json({ ip });
});

// Auth Routes
app.post('/api/auth/login', (req: Request, res: Response) => {
  const { username, pin } = req.body;
  if (!username || !pin) {
    return res.status(400).json({ error: 'Usuário e senha/PIN são obrigatórios' });
  }

  const user = db.users.find(
    (u) => u.username.toLowerCase() === String(username).toLowerCase().trim() && u.pin === String(pin).trim()
  );

  if (!user) {
    return res.status(401).json({ error: 'Credenciais inválidas. Verifique o usuário ou PIN.' });
  }

  return res.json({
    user: {
      id: user.id,
      name: user.name,
      username: user.username,
      role: user.role,
    },
    token: `token_${user.id}_${Date.now()}`,
  });
});

app.get('/api/users', (_req: Request, res: Response) => {
  res.json(db.users.map(({ pin, ...safeUser }) => safeUser));
});

// Helper to verify if an action is authorized by an Administrator
function verifyAdminAuthorization(req: Request): { authorized: boolean; adminUser?: User; error?: string } {
  const adminPinHeader = (req.headers['x-admin-pin'] as string | undefined)?.trim();
  const userIdHeader = (req.headers['x-user-id'] as string | undefined)?.trim();
  const userRoleHeader = (req.headers['x-user-role'] as string | undefined)?.trim();

  const adminPinBody = req.body?.adminPin ? String(req.body.adminPin).trim() : undefined;
  const adminUsernameBody = req.body?.adminUsername ? String(req.body.adminUsername).trim() : undefined;
  const userIdBody = req.body?.userId ? String(req.body.userId).trim() : undefined;

  const providedPin = adminPinHeader || adminPinBody;

  // 1. If an admin PIN is provided, verify against any user with role === 'admin'
  if (providedPin) {
    const adminByPin = db.users.find((u) => u.role === 'admin' && u.pin === providedPin);
    if (adminByPin) {
      return { authorized: true, adminUser: adminByPin };
    }
  }

  // 2. If a specific admin username is requested with pin
  if (adminUsernameBody && providedPin) {
    const adminUser = db.users.find(
      (u) => u.role === 'admin' && u.username.toLowerCase() === adminUsernameBody.toLowerCase() && u.pin === providedPin
    );
    if (adminUser) {
      return { authorized: true, adminUser };
    }
  }

  // 3. If authenticated user ID is supplied, check their role in database
  const checkUserId = userIdHeader || userIdBody;
  if (checkUserId) {
    const foundUser = db.users.find((u) => u.id === checkUserId);
    if (foundUser && foundUser.role === 'admin') {
      return { authorized: true, adminUser: foundUser };
    }
  }

  // 4. If x-user-role is admin and matches an admin user in db
  if (userRoleHeader === 'admin') {
    const anyAdmin = db.users.find((u) => u.role === 'admin');
    if (anyAdmin) {
      return { authorized: true, adminUser: anyAdmin };
    }
  }

  return {
    authorized: false,
    error: 'Acesso negado: Somente usuários com permissão de administrador podem executar esta ação.',
  };
}

// Products & Inventory Routes
app.get('/api/products', (_req: Request, res: Response) => {
  res.json(db.products);
});

// Adicionar produto (Apenas Administrador)
app.post('/api/products', (req: Request, res: Response) => {
  const auth = verifyAdminAuthorization(req);
  if (!auth.authorized) {
    return res.status(403).json({ error: auth.error || 'Apenas administradores podem adicionar produtos.' });
  }

  const { name, category, price, stock, sku, barcode, type, unit, costPrice, imageUrl } = req.body;
  if (!name || price === undefined) {
    return res.status(400).json({ error: 'Nome e preço de venda são obrigatórios.' });
  }

  const newProduct: Product = {
    id: `prod-${Date.now()}`,
    sku: sku || `SKU-${Math.floor(1000 + Math.random() * 9000)}`,
    barcode: barcode || `${Date.now()}`,
    name: String(name).trim(),
    category: category || 'Geral',
    type: type === 'service' ? 'service' : 'product',
    price: Number(price),
    costPrice: costPrice !== undefined ? Number(costPrice) : Number(price) * 0.4,
    stock: type === 'service' ? 9999 : Number(stock) || 0,
    unit: unit || 'un',
    imageUrl: imageUrl || undefined,
  };

  db.products.push(newProduct);
  db.lastBackupTimestamp = new Date().toISOString();
  saveDb();
  res.status(201).json({
    success: true,
    product: newProduct,
    message: `Item "${newProduct.name}" cadastrado com sucesso pelo administrador!`,
    products: db.products,
  });
});

// Editar produto (Apenas Administrador)
app.put('/api/products/:id', (req: Request, res: Response) => {
  const auth = verifyAdminAuthorization(req);
  if (!auth.authorized) {
    return res.status(403).json({ error: auth.error || 'Apenas administradores podem editar produtos.' });
  }

  const { id } = req.params;
  const productIndex = db.products.findIndex((p) => p.id === id);
  if (productIndex === -1) {
    return res.status(404).json({ error: 'Item não encontrado no catálogo.' });
  }

  const existing = db.products[productIndex];
  const { name, category, price, stock, sku, barcode, type, unit, costPrice, imageUrl } = req.body;

  const updatedProduct: Product = {
    ...existing,
    name: name !== undefined ? String(name).trim() : existing.name,
    category: category !== undefined ? String(category).trim() : existing.category,
    type: type !== undefined ? (type === 'service' ? 'service' : 'product') : existing.type,
    price: price !== undefined ? Number(price) : existing.price,
    costPrice: costPrice !== undefined ? Number(costPrice) : existing.costPrice,
    stock: stock !== undefined ? (type === 'service' ? 9999 : Number(stock)) : existing.stock,
    sku: sku !== undefined ? String(sku).trim() : existing.sku,
    barcode: barcode !== undefined ? String(barcode).trim() : existing.barcode,
    unit: unit !== undefined ? String(unit).trim() : existing.unit,
    imageUrl: imageUrl !== undefined ? String(imageUrl).trim() : existing.imageUrl,
  };

  db.products[productIndex] = updatedProduct;
  db.lastBackupTimestamp = new Date().toISOString();
  saveDb();

  res.json({
    success: true,
    product: updatedProduct,
    message: `Item "${updatedProduct.name}" atualizado com sucesso pelo administrador!`,
    products: db.products,
  });
});

// Remover produto (Apenas Administrador)
app.delete('/api/products/:id', (req: Request, res: Response) => {
  const auth = verifyAdminAuthorization(req);
  if (!auth.authorized) {
    return res.status(403).json({ error: auth.error || 'Apenas administradores podem remover produtos.' });
  }

  const { id } = req.params;
  const productIndex = db.products.findIndex((p) => p.id === id);
  if (productIndex === -1) {
    return res.status(404).json({ error: 'Item não encontrado no catálogo.' });
  }

  const [removed] = db.products.splice(productIndex, 1);
  db.lastBackupTimestamp = new Date().toISOString();
  saveDb();

  res.json({
    success: true,
    deletedId: id,
    message: `Item "${removed.name}" excluído do catálogo com sucesso pelo administrador!`,
    products: db.products,
  });
});

// Process Central Sale (auto-deduct central stock)
app.post('/api/sales', (req: Request, res: Response) => {
  const saleData: Sale = req.body;

  if (!saleData.items || saleData.items.length === 0) {
    return res.status(400).json({ error: 'Venda vazia. Adicione itens ao carrinho.' });
  }

  // Deduct stock centrally for physical products
  for (const item of saleData.items) {
    const product = db.products.find((p) => p.id === item.productId);
    if (product && product.type === 'product') {
      product.stock = Math.max(0, product.stock - item.quantity);
    }
  }

  const generatedId = saleData.id || `sale-${Date.now()}`;
  const saleNumber = saleData.saleNumber || `#${String(db.sales.length + 1001)}`;

  let customerId = saleData.customerId;
  if (!customerId && saleData.customerCpf) {
    const cleanDigits = saleData.customerCpf.replace(/\D/g, '');
    const found = db.customers.find((c) => c.cpf && c.cpf.replace(/\D/g, '') === cleanDigits);
    if (found) customerId = found.id;
  }

  const finalSale: Sale = {
    ...saleData,
    id: generatedId,
    saleNumber,
    customerId,
    timestamp: saleData.timestamp || new Date().toISOString(),
    status: 'completed',
  };

  db.sales.push(finalSale);
  saveDb();

  res.status(201).json({
    success: true,
    sale: finalSale,
    message: 'Venda registrada com sucesso no banco central!',
    updatedProducts: db.products,
  });
});

// Offline Sales Sync Route (batch process)
app.post('/api/sales/sync', (req: Request, res: Response) => {
  const { offlineSales } = req.body as { offlineSales: Sale[] };

  if (!Array.isArray(offlineSales) || offlineSales.length === 0) {
    return res.json({ syncedCount: 0, message: 'Nenhuma venda para sincronizar' });
  }

  const syncedSales: Sale[] = [];

  for (const sale of offlineSales) {
    // Check if already synced by ID
    const exists = db.sales.some((s) => s.id === sale.id);
    if (!exists) {
      // Deduct stock for products
      for (const item of sale.items) {
        const prod = db.products.find((p) => p.id === item.productId);
        if (prod && prod.type === 'product') {
          prod.stock = Math.max(0, prod.stock - item.quantity);
        }
      }
      const recorded: Sale = {
        ...sale,
        syncedOffline: true,
      };
      db.sales.push(recorded);
      syncedSales.push(recorded);
    }
  }

  saveDb();

  res.json({
    success: true,
    syncedCount: syncedSales.length,
    message: `${syncedSales.length} venda(s) offline sincronizada(s) com o banco central!`,
    updatedProducts: db.products,
  });
});

app.get('/api/sales', (_req: Request, res: Response) => {
  res.json(db.sales);
});

// Cash Register Operations (Caixa: Abertura, Sangria, Suprimento, Fechamento)
app.get('/api/cash-register/current', (_req: Request, res: Response) => {
  const currentSession = db.cashSessions.find((s) => s.status === 'open') || null;
  res.json({ session: currentSession });
});

app.post('/api/cash-register/open', (req: Request, res: Response) => {
  const { initialAmount, openedBy, openedByName } = req.body;

  // Close existing open session if any
  const existing = db.cashSessions.find((s) => s.status === 'open');
  if (existing) {
    return res.status(400).json({ error: 'Já existe um caixa aberto no momento.' });
  }

  const newSession: CashSession = {
    id: `sess-${Date.now()}`,
    status: 'open',
    openedAt: new Date().toISOString(),
    openedBy: openedBy || 'usr-1',
    openedByName: openedByName || 'Operador',
    initialAmount: Number(initialAmount) || 0,
    movements: [],
  };

  db.cashSessions.push(newSession);
  saveDb();
  res.status(201).json(newSession);
});

app.post('/api/cash-register/movement', (req: Request, res: Response) => {
  const { type, amount, reason, operatorId, operatorName, adminPin, adminUsername } = req.body;
  const currentSession = db.cashSessions.find((s) => s.status === 'open');

  if (!currentSession) {
    return res.status(400).json({ error: 'Nenhum caixa aberto para realizar movimentação.' });
  }

  // Requirement: Sangria (retirada) requires Admin permission & PIN validation
  if (type === 'sangria') {
    const providedPin = (adminPin || (req.headers['x-admin-pin'] as string) || '').trim();
    const targetUsername = (adminUsername || '').toLowerCase().trim();

    let adminValidator: User | undefined;
    if (targetUsername && providedPin) {
      adminValidator = db.users.find(
        (u) => u.role === 'admin' && u.username.toLowerCase() === targetUsername && u.pin === providedPin
      );
    } else if (providedPin) {
      adminValidator = db.users.find((u) => u.role === 'admin' && u.pin === providedPin);
    }

    if (!adminValidator) {
      return res.status(403).json({
        error: 'A sangria de caixa requer autorização e validação obrigatória de um usuário com perfil de Administrador (PIN inválido ou não informado).',
      });
    }
  }

  const numericAmount = Math.abs(Number(amount));
  if (isNaN(numericAmount) || numericAmount <= 0) {
    return res.status(400).json({ error: 'Informe um valor válido maior que zero.' });
  }

  const movement: CashMovement = {
    id: `mov-${Date.now()}`,
    sessionId: currentSession.id,
    type: type === 'sangria' ? 'sangria' : 'suprimento',
    amount: numericAmount,
    reason: reason || (type === 'sangria' ? 'Sangria de Caixa' : 'Suprimento de Troco'),
    operatorId: operatorId || 'usr-1',
    operatorName: operatorName || 'Operador',
    timestamp: new Date().toISOString(),
  };

  currentSession.movements.push(movement);
  saveDb();
  res.status(201).json({ movement, session: currentSession });
});

app.post('/api/cash-register/close', (req: Request, res: Response) => {
  const { actualAmount, closingNotes, closedBy, closedByName, adminPin, adminUsername } = req.body;
  const currentSession = db.cashSessions.find((s) => s.status === 'open');

  if (!currentSession) {
    return res.status(400).json({ error: 'Nenhum caixa aberto para fechamento.' });
  }

  // Requirement: "quando for fazer fechamento de caixa peça uma validação do usuário com permissão de admin"
  const providedPin = (adminPin || (req.headers['x-admin-pin'] as string) || '').trim();
  const targetUsername = (adminUsername || '').toLowerCase().trim();

  let adminValidator: User | undefined;

  if (targetUsername && providedPin) {
    adminValidator = db.users.find(
      (u) => u.role === 'admin' && u.username.toLowerCase() === targetUsername && u.pin === providedPin
    );
  } else if (providedPin) {
    adminValidator = db.users.find((u) => u.role === 'admin' && u.pin === providedPin);
  } else {
    // Check if the operator closing is already an admin
    const operator = db.users.find((u) => u.id === closedBy);
    if (operator && operator.role === 'admin') {
      adminValidator = operator;
    }
  }

  if (!adminValidator) {
    return res.status(403).json({
      error: 'Validação de administrador obrigatória: É necessário informar o PIN de um usuário com permissão de administrador para encerrar o caixa.',
    });
  }

  currentSession.status = 'closed';
  currentSession.closedAt = new Date().toISOString();
  currentSession.actualAmount = Number(actualAmount) || 0;
  currentSession.closingNotes = closingNotes || '';
  currentSession.closedBy = closedBy || currentSession.openedBy;
  currentSession.closedByName = closedByName || currentSession.openedByName;
  currentSession.validatedByAdmin = adminValidator.name;

  db.lastBackupTimestamp = new Date().toISOString();
  saveDb();
  res.json({
    success: true,
    message: `Caixa fechado com sucesso e validado pela administradora ${adminValidator.name}!`,
    session: currentSession,
  });
});

// ==========================================
// CUSTOMER AUTH & HISTORY APIS
// ==========================================

function safeCustomer(c: Customer) {
  const { password, ...safe } = c;
  return safe;
}

// Register new customer for Online Store (E-commerce)
app.post('/api/online/customers/register', (req: Request, res: Response) => {
  const { name, email, phone, cpf, password, address } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Nome, e-mail e senha são obrigatórios para realizar o cadastro na loja online.' });
  }

  const cleanEmail = String(email).trim().toLowerCase();
  const cleanPhone = String(phone || '').trim();
  const rawCpf = String(cpf || '').trim();
  const rawDigitsCpf = rawCpf.replace(/\D/g, '');

  const existingByEmail = db.customers.find((c) => c.email.toLowerCase() === cleanEmail);
  if (existingByEmail) {
    return res.status(400).json({ error: 'Já existe um cadastro com este e-mail. Por favor, faça login.' });
  }

  if (rawDigitsCpf.length >= 11) {
    const existingByCpf = db.customers.find((c) => c.cpf && c.cpf.replace(/\D/g, '') === rawDigitsCpf);
    if (existingByCpf) {
      return res.status(400).json({ error: 'Já existe uma conta associada a este CPF. Acesse com seu e-mail cadastrado.' });
    }
  }

  const newCustomer: Customer = {
    id: `cust-${Date.now()}`,
    name: String(name).trim(),
    email: cleanEmail,
    phone: cleanPhone,
    cpf: rawCpf,
    password: String(password).trim(),
    address: address ? String(address).trim() : '',
    createdAt: new Date().toISOString(),
  };

  db.customers.push(newCustomer);
  db.lastBackupTimestamp = new Date().toISOString();
  saveDb();

  const token = `token_cust_${newCustomer.id}_${Date.now()}`;
  res.status(201).json({
    success: true,
    customer: safeCustomer(newCustomer),
    token,
    message: 'Cadastro efetuado com sucesso na Loja Online!',
  });
});

// Login customer in Online Store
app.post('/api/online/customers/login', (req: Request, res: Response) => {
  const { emailOrCpf, password } = req.body;

  if (!emailOrCpf || !password) {
    return res.status(400).json({ error: 'Informe seu e-mail ou CPF e sua senha para entrar.' });
  }

  const term = String(emailOrCpf).trim();
  const cleanDigits = term.replace(/\D/g, '');
  const pass = String(password).trim();

  const customer = db.customers.find((c) => {
    const matchEmail = c.email.toLowerCase() === term.toLowerCase();
    const matchCpf = cleanDigits.length >= 11 && c.cpf.replace(/\D/g, '') === cleanDigits;
    return matchEmail || matchCpf;
  });

  if (!customer) {
    return res.status(401).json({ error: 'Conta não encontrada. Verifique os dados digitados ou crie um novo cadastro.' });
  }

  if (customer.password && customer.password !== pass) {
    return res.status(401).json({ error: 'Senha incorreta. Tente novamente.' });
  }

  const token = `token_cust_${customer.id}_${Date.now()}`;
  res.json({
    success: true,
    customer: safeCustomer(customer),
    token,
    message: `Olá, ${customer.name}! Login efetuado com sucesso.`,
  });
});

// Current Customer session profile
app.get('/api/online/customers/me', (req: Request, res: Response) => {
  const customerId = (req.headers['x-customer-id'] as string) || (req.query.customerId as string);
  if (!customerId) {
    return res.status(401).json({ error: 'Sessão de cliente não informada.' });
  }

  const customer = db.customers.find((c) => c.id === customerId);
  if (!customer) {
    return res.status(404).json({ error: 'Cliente não encontrado.' });
  }

  res.json({ customer: safeCustomer(customer) });
});

// Online Customer orders history
app.get('/api/online/customers/:id/orders', (req: Request, res: Response) => {
  const { id } = req.params;
  const customer = db.customers.find((c) => c.id === id);
  if (!customer) {
    return res.status(404).json({ error: 'Cliente não encontrado.' });
  }

  const cleanCpf = customer.cpf ? customer.cpf.replace(/\D/g, '') : '';
  const customerOrders = (db.onlineOrders || []).filter((o) => {
    return (
      o.customerId === id ||
      (customer.email && o.customerEmail?.toLowerCase() === customer.email.toLowerCase()) ||
      (cleanCpf && o.customerCpf?.replace(/\D/g, '') === cleanCpf)
    );
  });

  res.json(customerOrders);
});

// List or search registered customers (for attendant search in physical store / PDV)
app.get('/api/customers', (req: Request, res: Response) => {
  const search = typeof req.query.search === 'string' ? req.query.search.toLowerCase().trim() : '';
  let result = db.customers;

  if (search) {
    const cleanDigits = search.replace(/\D/g, '');
    result = db.customers.filter((c) => {
      const matchName = c.name.toLowerCase().includes(search);
      const matchEmail = c.email.toLowerCase().includes(search);
      const matchPhone = c.phone.includes(search);
      const matchCpf = cleanDigits && c.cpf.replace(/\D/g, '').includes(cleanDigits);
      return matchName || matchEmail || matchPhone || matchCpf;
    });
  }

  res.json(result.map(safeCustomer));
});

// Create or update customer from physical store / PDV desk
app.post('/api/customers', (req: Request, res: Response) => {
  const { id, name, email, phone, cpf, address, notes } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Nome do cliente é obrigatório.' });
  }

  const rawCpf = cpf ? String(cpf).trim() : '';
  const cleanDigits = rawCpf.replace(/\D/g, '');

  let customer = id ? db.customers.find((c) => c.id === id) : null;
  if (!customer && cleanDigits.length >= 11) {
    customer = db.customers.find((c) => c.cpf && c.cpf.replace(/\D/g, '') === cleanDigits);
  }

  if (customer) {
    customer.name = name.trim();
    if (email) customer.email = email.trim().toLowerCase();
    if (phone) customer.phone = phone.trim();
    if (rawCpf) customer.cpf = rawCpf;
    if (address !== undefined) customer.address = address.trim();
    if (notes !== undefined) customer.notes = notes.trim();
  } else {
    customer = {
      id: `cust-${Date.now()}`,
      name: name.trim(),
      email: email ? email.trim().toLowerCase() : '',
      phone: phone ? phone.trim() : '',
      cpf: rawCpf,
      address: address ? address.trim() : '',
      notes: notes ? notes.trim() : '',
      createdAt: new Date().toISOString(),
    };
    db.customers.push(customer);
  }

  db.lastBackupTimestamp = new Date().toISOString();
  saveDb();
  res.json({ success: true, customer: safeCustomer(customer) });
});

// Complete Customer Purchase & Service Dossier
// Allows cashier / attendant to see EVERYTHING the customer has bought (products)
// or used (services), along with exact dates, times, sellers and amounts!
app.get('/api/customers/history', (req: Request, res: Response) => {
  const customerId = typeof req.query.customerId === 'string' ? req.query.customerId : undefined;
  const cpf = typeof req.query.cpf === 'string' ? req.query.cpf : undefined;
  const phone = typeof req.query.phone === 'string' ? req.query.phone : undefined;
  const query = typeof req.query.query === 'string' ? req.query.query.toLowerCase().trim() : undefined;

  let customer: Customer | undefined;

  if (customerId) {
    customer = db.customers.find((c) => c.id === customerId);
  }

  const cleanCpf = cpf ? cpf.replace(/\D/g, '') : '';
  if (!customer && cleanCpf) {
    customer = db.customers.find((c) => c.cpf && c.cpf.replace(/\D/g, '') === cleanCpf);
  }

  if (!customer && phone) {
    const cleanPhoneDigits = phone.replace(/\D/g, '');
    customer = db.customers.find((c) => c.phone && c.phone.replace(/\D/g, '').includes(cleanPhoneDigits));
  }

  if (!customer && query) {
    const cleanQDigits = query.replace(/\D/g, '');
    customer = db.customers.find((c) => {
      const matchName = c.name.toLowerCase().includes(query);
      const matchEmail = c.email.toLowerCase().includes(query);
      const matchCpf = cleanQDigits.length >= 8 && c.cpf.replace(/\D/g, '').includes(cleanQDigits);
      return matchName || matchEmail || matchCpf;
    });
  }

  // If customer not registered, generate fallback record for lookup
  if (!customer) {
    if (cpf || query) {
      customer = {
        id: `guest-${cleanCpf || 'search'}`,
        name: query && !query.includes('@') && !cleanCpf ? query : (cpf ? `Cliente CPF ${cpf}` : 'Cliente Avulso'),
        email: '',
        phone: '',
        cpf: cpf || '',
        createdAt: new Date().toISOString(),
      };
    } else {
      return res.status(400).json({ error: 'Informe customerId, cpf ou query para buscar o histórico.' });
    }
  }

  const targetCpfDigits = customer.cpf ? customer.cpf.replace(/\D/g, '') : '';
  const targetEmail = customer.email ? customer.email.toLowerCase() : '';
  const targetName = customer.name ? customer.name.toLowerCase() : '';

  // 1. Gather all in-store physical sales for this customer
  const customerSales = (db.sales || []).filter((s) => {
    if (s.customerId && s.customerId === customer?.id) return true;
    if (targetCpfDigits && s.customerCpf && s.customerCpf.replace(/\D/g, '') === targetCpfDigits) return true;
    if (targetName && s.customerName && s.customerName.toLowerCase() === targetName) return true;
    return false;
  });

  // 2. Gather all online orders for this customer
  const customerOnlineOrders = (db.onlineOrders || []).filter((o) => {
    if (o.customerId && o.customerId === customer?.id) return true;
    if (targetCpfDigits && o.customerCpf && o.customerCpf.replace(/\D/g, '') === targetCpfDigits) return true;
    if (targetEmail && o.customerEmail && o.customerEmail.toLowerCase() === targetEmail) return true;
    if (targetName && o.customerName && o.customerName.toLowerCase() === targetName) return true;
    return false;
  });

  // 3. Extract individual items with exact timestamp, type (product/service), seller
  const historyItems: Array<{
    id: string;
    transactionId: string;
    transactionNumber: string;
    type: 'product' | 'service';
    origin: 'pos' | 'online';
    productId: string;
    name: string;
    sku: string;
    price: number;
    quantity: number;
    discount: number;
    total: number;
    date: string;
    sellerName: string;
    paymentMethod: string;
    status: string;
  }> = [];

  for (const sale of customerSales) {
    for (const it of sale.items) {
      historyItems.push({
        id: `item-${sale.id}-${it.productId}-${Math.random().toString(36).substring(2, 6)}`,
        transactionId: sale.id,
        transactionNumber: sale.saleNumber,
        type: it.type || (it.productId.startsWith('serv-') || it.sku?.startsWith('SRV-') ? 'service' : 'product'),
        origin: 'pos',
        productId: it.productId,
        name: it.name,
        sku: it.sku,
        price: it.price,
        quantity: it.quantity,
        discount: it.discount || 0,
        total: it.total,
        date: sale.timestamp,
        sellerName: sale.sellerName || 'Atendente PDV',
        paymentMethod: sale.paymentMethod,
        status: sale.status,
      });
    }
  }

  for (const ord of customerOnlineOrders) {
    for (const it of ord.items) {
      const isService = it.productId.startsWith('serv-') || it.sku?.startsWith('SRV-');
      historyItems.push({
        id: `item-${ord.id}-${it.productId}-${Math.random().toString(36).substring(2, 6)}`,
        transactionId: ord.id,
        transactionNumber: ord.orderNumber,
        type: isService ? 'service' : 'product',
        origin: 'online',
        productId: it.productId,
        name: it.name,
        sku: it.sku,
        price: it.price,
        quantity: it.quantity,
        discount: 0,
        total: it.total,
        date: ord.createdAt,
        sellerName: 'Loja Online Oficial',
        paymentMethod: ord.paymentMethod,
        status: ord.orderStatus,
      });
    }
  }

  // Sort newest first
  historyItems.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Transactions list
  const transactions = [
    ...customerSales.map((s) => ({
      id: s.id,
      number: s.saleNumber,
      date: s.timestamp,
      origin: 'pos' as const,
      total: s.total,
      sellerName: s.sellerName,
      status: s.status,
      itemsCount: s.items.reduce((acc, i) => acc + i.quantity, 0),
      paymentMethod: s.paymentMethod,
    })),
    ...customerOnlineOrders.map((o) => ({
      id: o.id,
      number: o.orderNumber,
      date: o.createdAt,
      origin: 'online' as const,
      total: o.total,
      sellerName: 'Loja Online',
      status: o.orderStatus,
      itemsCount: o.items.reduce((acc, i) => acc + i.quantity, 0),
      paymentMethod: o.paymentMethod,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const totalSpent = transactions.reduce((sum, t) => sum + (t.status !== 'cancelled' ? t.total : 0), 0);
  const totalItemsPurchased = historyItems
    .filter((i) => i.type === 'product' && i.status !== 'cancelled')
    .reduce((sum, i) => sum + i.quantity, 0);
  const totalServicesUsed = historyItems
    .filter((i) => i.type === 'service' && i.status !== 'cancelled')
    .reduce((sum, i) => sum + i.quantity, 0);

  const firstVisit = transactions.length > 0 ? transactions[transactions.length - 1].date : customer.createdAt;
  const lastVisit = transactions.length > 0 ? transactions[0].date : customer.createdAt;

  res.json({
    customer: safeCustomer(customer),
    totalSpent,
    totalTransactions: transactions.length,
    totalItemsPurchased,
    totalServicesUsed,
    firstVisit,
    lastVisit,
    items: historyItems,
    transactions,
  });
});

app.get('/api/customers/:id/history', (req: Request, res: Response) => {
  const { id } = req.params;
  const customer = db.customers.find((c) => c.id === id);
  if (!customer) {
    return res.status(404).json({ error: 'Cliente não encontrado.' });
  }

  const targetCpfDigits = customer.cpf ? customer.cpf.replace(/\D/g, '') : '';
  const targetEmail = customer.email ? customer.email.toLowerCase() : '';
  const targetName = customer.name ? customer.name.toLowerCase() : '';

  const customerSales = (db.sales || []).filter((s) => {
    if (s.customerId && s.customerId === customer.id) return true;
    if (targetCpfDigits && s.customerCpf && s.customerCpf.replace(/\D/g, '') === targetCpfDigits) return true;
    if (targetName && s.customerName && s.customerName.toLowerCase() === targetName) return true;
    return false;
  });

  const customerOnlineOrders = (db.onlineOrders || []).filter((o) => {
    if (o.customerId && o.customerId === customer.id) return true;
    if (targetCpfDigits && o.customerCpf && o.customerCpf.replace(/\D/g, '') === targetCpfDigits) return true;
    if (targetEmail && o.customerEmail && o.customerEmail.toLowerCase() === targetEmail) return true;
    if (targetName && o.customerName && o.customerName.toLowerCase() === targetName) return true;
    return false;
  });

  const historyItems: any[] = [];
  for (const sale of customerSales) {
    for (const it of sale.items) {
      historyItems.push({
        id: `item-${sale.id}-${it.productId}-${Math.random().toString(36).substring(2, 6)}`,
        transactionId: sale.id,
        transactionNumber: sale.saleNumber,
        type: it.type || (it.productId.startsWith('serv-') || it.sku?.startsWith('SRV-') ? 'service' : 'product'),
        origin: 'pos',
        productId: it.productId,
        name: it.name,
        sku: it.sku,
        price: it.price,
        quantity: it.quantity,
        discount: it.discount || 0,
        total: it.total,
        date: sale.timestamp,
        sellerName: sale.sellerName || 'Atendente PDV',
        paymentMethod: sale.paymentMethod,
        status: sale.status,
      });
    }
  }

  for (const ord of customerOnlineOrders) {
    for (const it of ord.items) {
      const isService = it.productId.startsWith('serv-') || it.sku?.startsWith('SRV-');
      historyItems.push({
        id: `item-${ord.id}-${it.productId}-${Math.random().toString(36).substring(2, 6)}`,
        transactionId: ord.id,
        transactionNumber: ord.orderNumber,
        type: isService ? 'service' : 'product',
        origin: 'online',
        productId: it.productId,
        name: it.name,
        sku: it.sku,
        price: it.price,
        quantity: it.quantity,
        discount: 0,
        total: it.total,
        date: ord.createdAt,
        sellerName: 'Loja Online Oficial',
        paymentMethod: ord.paymentMethod,
        status: ord.orderStatus,
      });
    }
  }

  historyItems.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const transactions = [
    ...customerSales.map((s) => ({
      id: s.id,
      number: s.saleNumber,
      date: s.timestamp,
      origin: 'pos' as const,
      total: s.total,
      sellerName: s.sellerName,
      status: s.status,
      itemsCount: s.items.reduce((acc, i) => acc + i.quantity, 0),
      paymentMethod: s.paymentMethod,
    })),
    ...customerOnlineOrders.map((o) => ({
      id: o.id,
      number: o.orderNumber,
      date: o.createdAt,
      origin: 'online' as const,
      total: o.total,
      sellerName: 'Loja Online',
      status: o.orderStatus,
      itemsCount: o.items.reduce((acc, i) => acc + i.quantity, 0),
      paymentMethod: o.paymentMethod,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const totalSpent = transactions.reduce((sum, t) => sum + (t.status !== 'cancelled' ? t.total : 0), 0);
  const totalItemsPurchased = historyItems
    .filter((i) => i.type === 'product' && i.status !== 'cancelled')
    .reduce((sum, i) => sum + i.quantity, 0);
  const totalServicesUsed = historyItems
    .filter((i) => i.type === 'service' && i.status !== 'cancelled')
    .reduce((sum, i) => sum + i.quantity, 0);

  const firstVisit = transactions.length > 0 ? transactions[transactions.length - 1].date : customer.createdAt;
  const lastVisit = transactions.length > 0 ? transactions[0].date : customer.createdAt;

  res.json({
    customer: safeCustomer(customer),
    totalSpent,
    totalTransactions: transactions.length,
    totalItemsPurchased,
    totalServicesUsed,
    firstVisit,
    lastVisit,
    items: historyItems,
    transactions,
  });
});

// ==========================================
// E-COMMERCE / ONLINE STORE API ENDPOINTS
// ==========================================

// List online orders (for PDV omnichannel dispatch and online store tracking)
app.get('/api/online-orders', (_req: Request, res: Response) => {
  res.json(db.onlineOrders || []);
});

// Create new online order from E-Commerce storefront (Enforces customer account)
app.post('/api/online-orders', (req: Request, res: Response) => {
  const {
    customerId,
    customerName,
    customerEmail,
    customerPhone,
    customerCpf,
    deliveryType,
    deliveryAddress,
    items,
    paymentMethod,
    notes,
  } = req.body;

  let customer: Customer | undefined;
  if (customerId) {
    customer = db.customers.find((c) => c.id === customerId);
  } else if (customerEmail) {
    customer = db.customers.find((c) => c.email.toLowerCase() === String(customerEmail).toLowerCase().trim());
  }

  if (!customer) {
    return res.status(401).json({
      error: 'Autenticação necessária: É obrigatório fazer login ou cadastro na loja online para finalizar a compra.',
    });
  }

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'A sacola de compras está vazia.' });
  }

  // Calculate totals and deduct stock in central cloud database
  let subtotal = 0;
  const processedItems: OnlineOrderItem[] = [];

  for (const item of items) {
    const prod = db.products.find((p) => p.id === item.productId);
    if (!prod) continue;

    const qty = Number(item.quantity) || 1;
    // Auto deduct central stock for physical products
    if (prod.type === 'product') {
      prod.stock = Math.max(0, prod.stock - qty);
    }

    const itemTotal = prod.price * qty;
    subtotal += itemTotal;

    processedItems.push({
      productId: prod.id,
      name: prod.name,
      sku: prod.sku,
      price: prod.price,
      quantity: qty,
      total: itemTotal,
    });
  }

  const shippingFee = deliveryType === 'delivery' ? 15.00 : 0.00;
  const total = subtotal + shippingFee;

  const newOrder: OnlineOrder = {
    id: `ord-${Date.now()}`,
    orderNumber: `ONL-${Math.floor(1000 + Math.random() * 9000)}`,
    customerId: customer.id,
    customerName: customerName || customer.name,
    customerEmail: customerEmail || customer.email,
    customerPhone: customerPhone || customer.phone,
    customerCpf: customerCpf || customer.cpf,
    deliveryType: deliveryType === 'delivery' ? 'delivery' : 'pickup',
    deliveryAddress: deliveryAddress || (deliveryType === 'pickup' ? 'Retirada no Balcão da Loja Física' : customer.address || ''),
    items: processedItems,
    subtotal,
    shippingFee,
    total,
    paymentMethod: paymentMethod === 'cartao_credito' ? 'cartao_credito' : 'pix',
    paymentStatus: 'paid', // Simulated instant online payment approval
    orderStatus: 'pending',
    createdAt: new Date().toISOString(),
    notes: notes || '',
  };

  db.onlineOrders.unshift(newOrder);
  db.lastBackupTimestamp = new Date().toISOString();
  saveDb();

  res.status(201).json({
    success: true,
    order: newOrder,
    message: 'Pedido realizado com sucesso na loja online e sincronizado com o estoque da loja física!',
    updatedProducts: db.products,
  });
});

// Update online order status (e.g. from cashier PDV: 'preparing' -> 'ready_for_pickup' -> 'delivered')
app.patch('/api/online-orders/:id/status', (req: Request, res: Response) => {
  const { id } = req.params;
  const { orderStatus } = req.body;

  const order = db.onlineOrders.find((o) => o.id === id);
  if (!order) {
    return res.status(404).json({ error: 'Pedido online não encontrado.' });
  }

  order.orderStatus = orderStatus;
  saveDb();

  res.json({ success: true, order, message: `Status do pedido atualizado para ${orderStatus}` });
});

// ==========================================
// CLOUD BACKUP & AUTOMATIC 2-WAY SYNC APIS
// ==========================================

// Export full Cloud Database Snapshot for local backup / download
app.get('/api/backup/export', (_req: Request, res: Response) => {
  const snapshot = {
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    deviceOrigin: 'Nuvem Central / Servidor Store Cloud',
    totalProducts: db.products.length,
    totalSales: db.sales.length,
    totalOnlineOrders: (db.onlineOrders || []).length,
    products: db.products,
    sales: db.sales,
    onlineOrders: db.onlineOrders || [],
    cashSessions: db.cashSessions || [],
  };

  res.json(snapshot);
});

// Restore / Import Database Snapshot into Cloud
app.post('/api/backup/restore', (req: Request, res: Response) => {
  const snapshot = req.body;

  if (!snapshot || !Array.isArray(snapshot.products) || !Array.isArray(snapshot.sales)) {
    return res.status(400).json({ error: 'Arquivo de backup inválido ou corrompido.' });
  }

  db.products = snapshot.products;
  db.sales = snapshot.sales;
  if (Array.isArray(snapshot.onlineOrders)) {
    db.onlineOrders = snapshot.onlineOrders;
  }
  if (Array.isArray(snapshot.cashSessions)) {
    db.cashSessions = snapshot.cashSessions;
  }
  db.lastBackupTimestamp = new Date().toISOString();
  saveDb();

  res.json({
    success: true,
    message: 'Backup restaurado com sucesso no banco de dados em nuvem!',
    productsCount: db.products.length,
    salesCount: db.sales.length,
  });
});

// Automatic 2-way sync when physical store reconnects:
// 1. Receives offline sales and registers them centrally + deducts central stock
// 2. Returns current cloud state (products with real-time stock, new online orders)
app.post('/api/backup/auto-sync', (req: Request, res: Response) => {
  const { offlineSales, clientDeviceId } = req.body as { offlineSales?: Sale[]; clientDeviceId?: string };

  let mergedCount = 0;

  if (Array.isArray(offlineSales) && offlineSales.length > 0) {
    for (const sale of offlineSales) {
      const exists = db.sales.some((s) => s.id === sale.id);
      if (!exists) {
        // Deduct stock for products centrally
        for (const item of sale.items) {
          const prod = db.products.find((p) => p.id === item.productId);
          if (prod && prod.type === 'product') {
            prod.stock = Math.max(0, prod.stock - item.quantity);
          }
        }
        db.sales.push({ ...sale, syncedOffline: true });
        mergedCount++;
      }
    }
  }

  db.lastBackupTimestamp = new Date().toISOString();
  saveDb();

  res.json({
    success: true,
    mergedOfflineSalesCount: mergedCount,
    cloudTimestamp: db.lastBackupTimestamp,
    cloudProducts: db.products,
    cloudSales: db.sales,
    cloudOnlineOrders: db.onlineOrders || [],
    message: `Backup automático concluído. ${mergedCount} venda(s) offline sincronizada(s) na nuvem.`,
  });
});

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';
  const httpServer = http.createServer(app);

  if (isProd) {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    const isHmrDisabled = process.env.DISABLE_HMR === 'true';
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: isHmrDisabled ? false : { server: httpServer },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  const PORT = await listenWithRetry(httpServer, DEFAULT_PORT);

  if (PORT !== DEFAULT_PORT) {
    console.warn(`[PDV Server] Port ${DEFAULT_PORT} is busy. Using ${PORT} instead.`);
  }

  process.env.PORT = String(PORT);
  console.log(`[PDV Server] Running on http://0.0.0.0:${PORT}`);
}

startServer().catch((err) => {
  console.error('[PDV Server] Failed to start:', err);
});
