/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Header } from './components/Header';
import { ProductCatalog } from './components/ProductCatalog';
import { Cart } from './components/Cart';
import { CheckoutModal } from './components/CheckoutModal';
import { ReceiptModal } from './components/ReceiptModal';
import { CashRegisterModal } from './components/CashRegisterModal';
import { SyncQueueModal } from './components/SyncQueueModal';
import { CustomerModal } from './components/CustomerModal';
import { ShortcutsModal } from './components/ShortcutsModal';
import { LoginModal } from './components/LoginModal';
import { OfflineIndicator } from './components/OfflineIndicator';
import { OnlineStoreView } from './components/OnlineStoreView';
import { OnlineOrdersOmnichannelModal } from './components/OnlineOrdersOmnichannelModal';
import { CloudBackupModal } from './components/CloudBackupModal';
import { DashboardModal } from './components/DashboardModal';
import { ProductManagementModal } from './components/ProductManagementModal';
import { CustomerHistoryModal } from './components/CustomerHistoryModal';

import { useOnlineStatus } from './hooks/useOnlineStatus';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';

import { 
  User, 
  Product, 
  CartItem, 
  Sale, 
  CashSession, 
  PaymentMethod, 
  PaymentDetails,
  OnlineOrder 
} from './types';

import { 
  fetchProducts, 
  fetchClientIp, 
  loginUser, 
  submitSale, 
  syncOfflineSales, 
  fetchCurrentCashSession, 
  openCashSession, 
  recordCashMovement, 
  closeCashSession,
  fetchOnlineOrders,
  fetchSales,
  performAutoBackupSync 
} from './services/api';

import { localDB, OfflineSaleItem } from './services/db';

export default function App() {
  const rawOnline = useOnlineStatus();
  // Simulated offline toggle to test the offline -> online automatic cloud backup
  const [isSimulatedOffline, setIsSimulatedOffline] = useState(false);
  const isOnline = rawOnline && !isSimulatedOffline;

  // Active View: 'pos' (Loja Física) vs 'online_store' (Loja Online do Cliente)
  const [activeAppView, setActiveAppView] = useState<'pos' | 'online_store'>('pos');

  // User Authentication State
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    return localDB.getCurrentUser();
  });
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(() => !localDB.getCurrentUser());

  // Cash Session State
  const [cashSession, setCashSession] = useState<CashSession | null>(null);

  // Products Catalog State
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  // Online Orders State
  const [onlineOrders, setOnlineOrders] = useState<OnlineOrder[]>([]);

  // Sales History State (for Dashboard and Reports)
  const [sales, setSales] = useState<Sale[]>([]);

  // Cart State
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [customerCpf, setCustomerCpf] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [clientIp, setClientIp] = useState('127.0.0.1');
  const [discount, setDiscount] = useState(0);

  // Offline Sync Queue State
  const [offlineQueue, setOfflineQueue] = useState<OfflineSaleItem[]>([]);

  // Modals Visibility
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [isCashModalOpen, setIsCashModalOpen] = useState(false);
  const [isSyncQueueModalOpen, setIsSyncQueueModalOpen] = useState(false);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);
  const [isOnlineOrdersModalOpen, setIsOnlineOrdersModalOpen] = useState(false);
  const [isCloudBackupModalOpen, setIsCloudBackupModalOpen] = useState(false);
  const [isDashboardModalOpen, setIsDashboardModalOpen] = useState(false);
  const [isProductManagementModalOpen, setIsProductManagementModalOpen] = useState(false);
  const [isCustomerHistoryModalOpen, setIsCustomerHistoryModalOpen] = useState(false);
  const [customerHistoryQuery, setCustomerHistoryQuery] = useState('');

  // Last Completed Sale for Receipt Printing
  const [lastSale, setLastSale] = useState<Sale | null>(null);

  // Search input ref for F2 shortcut
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Mobile Active View: 'catalog' | 'cart'
  const [mobileTab, setMobileTab] = useState<'catalog' | 'cart'>('catalog');

  // Load Initial Data
  const loadData = useCallback(async () => {
    try {
      setLoadingProducts(true);
      const [prods, ip, cash, queue, orders, salesList] = await Promise.all([
        fetchProducts(),
        fetchClientIp(),
        fetchCurrentCashSession(),
        localDB.getOfflineQueue(),
        fetchOnlineOrders(),
        fetchSales(),
      ]);
      setProducts(prods);
      setClientIp(ip);
      setCashSession(cash);
      setOfflineQueue(queue);
      setOnlineOrders(orders);
      setSales(salesList);
    } catch (err) {
      console.error('Error loading initial data:', err);
    } finally {
      setLoadingProducts(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Automatic Background Cloud Backup & 2-way Sync when internet reconnects
  useEffect(() => {
    if (isOnline) {
      performAutoBackupSync().then((res) => {
        if (res.success) {
          localDB.getOfflineQueue().then(setOfflineQueue);
          if (res.cloudProducts) setProducts(res.cloudProducts);
          if (res.cloudOnlineOrders) setOnlineOrders(res.cloudOnlineOrders);
          fetchSales().then(setSales);
        }
      });
    }
  }, [isOnline]);

  // Live polling for online orders and stock sync every 15 seconds when online
  useEffect(() => {
    if (!isOnline) return;

    const interval = setInterval(() => {
      fetchOnlineOrders().then((orders) => {
        setOnlineOrders(orders);
      });
      fetchProducts().then((prods) => {
        setProducts(prods);
      });
    }, 15000);

    return () => clearInterval(interval);
  }, [isOnline]);

  // Keyboard Shortcuts Handlers
  const handleFocusSearch = useCallback(() => {
    if (searchInputRef.current) {
      searchInputRef.current.focus();
      searchInputRef.current.select();
    }
  }, []);

  const handleOpenCustomerModal = useCallback(() => {
    setIsCustomerModalOpen(true);
  }, []);

  const handleOpenCustomerHistory = useCallback((query?: string) => {
    setCustomerHistoryQuery(query || customerCpf || customerName || '');
    setIsCustomerHistoryModalOpen(true);
  }, [customerCpf, customerName]);

  const handleOpenCashModal = useCallback(() => {
    setIsCashModalOpen(true);
  }, []);

  const handleOpenCashSummary = useCallback(() => {
    setIsCashModalOpen(true);
  }, []);

  const handleCheckoutShortcut = useCallback(() => {
    if (cartItems.length > 0) {
      setIsCheckoutModalOpen(true);
    }
  }, [cartItems.length]);

  const handleEscapeShortcut = useCallback(() => {
    setIsCheckoutModalOpen(false);
    setIsReceiptModalOpen(false);
    setIsCashModalOpen(false);
    setIsSyncQueueModalOpen(false);
    setIsCustomerModalOpen(false);
    setIsCustomerHistoryModalOpen(false);
    setIsShortcutsModalOpen(false);
    setIsOnlineOrdersModalOpen(false);
    setIsCloudBackupModalOpen(false);
    setIsDashboardModalOpen(false);
    setIsProductManagementModalOpen(false);
  }, []);

  useKeyboardShortcuts({
    onSearchFocus: handleFocusSearch,
    onCustomerModal: handleOpenCustomerModal,
    onCustomerHistory: () => handleOpenCustomerHistory(),
    onCashMovement: handleOpenCashModal,
    onCashSummary: handleOpenCashSummary,
    onDashboard: () => setIsDashboardModalOpen(true),
    onCheckout: handleCheckoutShortcut,
    onEscape: handleEscapeShortcut,
  });

  // Cart Operations
  const handleAddToCart = (product: Product) => {
    setCartItems((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1, discount: 0 }];
    });
  };

  const handleUpdateQuantity = (productId: string, delta: number) => {
    setCartItems((prev) => {
      return prev
        .map((item) => {
          if (item.product.id === productId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter((item): item is CartItem => item !== null);
    });
  };

  const handleRemoveItem = (productId: string) => {
    setCartItems((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const handleClearCart = () => {
    setCartItems([]);
    setDiscount(0);
    setCustomerCpf('');
    setCustomerName('');
  };

  // Finalize Sale
  const handleConfirmSale = async (
    paymentMethod: PaymentMethod,
    paymentDetails: PaymentDetails
  ) => {
    if (!currentUser) {
      setIsLoginModalOpen(true);
      return;
    }

    const subtotal = cartItems.reduce(
      (sum, item) => sum + (item.product.price * item.quantity - item.discount),
      0
    );
    const total = Math.max(0, subtotal - discount);

    const saleNumber = `#${Math.floor(100000 + Math.random() * 900000)}`;

    const sale: Sale = {
      id: `sale-${Date.now()}`,
      saleNumber,
      timestamp: new Date().toISOString(),
      sellerId: currentUser.id,
      sellerName: currentUser.name,
      customerCpf: customerCpf || undefined,
      customerIp: clientIp,
      customerName: customerName || undefined,
      items: cartItems.map((item) => ({
        productId: item.product.id,
        name: item.product.name,
        sku: item.product.sku,
        price: item.product.price,
        quantity: item.quantity,
        discount: item.discount,
        total: item.product.price * item.quantity - item.discount,
        type: item.product.type,
      })),
      subtotal,
      discount,
      total,
      paymentMethod,
      paymentDetails,
      status: 'completed',
    };

    // Close checkout modal
    setIsCheckoutModalOpen(false);

    // Submit sale to central API or queue locally
    const result = await submitSale(sale, isOnline);

    // Save and preview receipt
    setLastSale(result.sale);
    setSales((prev) => [result.sale, ...prev]);
    setIsReceiptModalOpen(true);

    // Deduct stock in UI state
    setProducts((prev) =>
      prev.map((prod) => {
        const itemSold = cartItems.find((i) => i.product.id === prod.id);
        if (itemSold && prod.type === 'product') {
          return { ...prod, stock: Math.max(0, prod.stock - itemSold.quantity) };
        }
        return prod;
      })
    );

    // Refresh queue count
    const updatedQueue = await localDB.getOfflineQueue();
    setOfflineQueue(updatedQueue);

    // Reset Cart
    handleClearCart();
  };

  // Cash Operations
  const handleOpenCash = async (initialAmount: number) => {
    if (!currentUser) return;
    const session = await openCashSession(initialAmount, currentUser);
    setCashSession(session);
  };

  const handleRecordMovement = async (
    type: 'sangria' | 'suprimento',
    amount: number,
    reason: string,
    adminValidation?: { adminPin: string; adminUsername?: string }
  ) => {
    if (!currentUser) return;
    await recordCashMovement(type, amount, reason, currentUser, adminValidation);
    const updated = await fetchCurrentCashSession();
    setCashSession(updated);
  };

  const handleCloseCash = async (
    actualAmount: number,
    closingNotes: string,
    adminValidation: { adminPin: string; adminUsername?: string }
  ) => {
    await closeCashSession(actualAmount, closingNotes, {
      adminPin: adminValidation.adminPin,
      adminUsername: adminValidation.adminUsername,
      user: currentUser,
    });
    setCashSession(null);
  };

  // Product Management Callbacks (Admin Protected)
  const handleProductCreated = (newProduct: Product) => {
    setProducts((prev) => [...prev, newProduct]);
  };

  const handleProductUpdated = (updatedProduct: Product) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === updatedProduct.id ? updatedProduct : p))
    );
  };

  const handleProductDeleted = (deletedId: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== deletedId));
    setCartItems((prev) => prev.filter((item) => item.product.id !== deletedId));
  };

  // Sync Queue Manual Trigger
  const handleManualSync = async () => {
    const res = await syncOfflineSales();
    const refreshed = await localDB.getOfflineQueue();
    setOfflineQueue(refreshed);
    if (res.success) {
      const prods = await fetchProducts();
      setProducts(prods);
      fetchSales().then(setSales);
    }
  };

  // Online Store Order Placed callback
  const handleOnlineOrderCreated = (order: OnlineOrder) => {
    setOnlineOrders((prev) => [order, ...prev]);
    // Refresh stock
    fetchProducts().then(setProducts);
  };

  // Auth Operations
  const handleLogin = async (username: string, pin: string) => {
    const user = await loginUser(username, pin);
    localDB.setCurrentUser(user);
    setCurrentUser(user);
    setIsLoginModalOpen(false);
  };

  const handleLogout = () => {
    localDB.setCurrentUser(null);
    setCurrentUser(null);
    setIsLoginModalOpen(true);
  };

  const cartTotal = Math.max(
    0,
    cartItems.reduce(
      (sum, item) => sum + (item.product.price * item.quantity - item.discount),
      0
    ) - discount
  );

  const pendingOnlineOrdersCount = onlineOrders.filter(
    (o) => o.orderStatus !== 'delivered' && o.orderStatus !== 'cancelled'
  ).length;

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-950 font-sans text-slate-100">
      {/* If active view is online store, render Customer Storefront */}
      {activeAppView === 'online_store' ? (
        <OnlineStoreView
          products={products}
          onBackToPos={() => setActiveAppView('pos')}
          onOpenDashboard={() => setIsDashboardModalOpen(true)}
          onOrderCreated={handleOnlineOrderCreated}
          isOnline={isOnline}
        />
      ) : (
        /* Regular PDV In-Store Caixa View */
        <>
          {/* Universal Top Bar */}
          <Header
            currentUser={currentUser}
            cashSession={cashSession}
            isOnline={isOnline}
            pendingSyncCount={offlineQueue.length}
            onlineOrdersCount={pendingOnlineOrdersCount}
            onOpenSyncQueue={() => setIsSyncQueueModalOpen(true)}
            onOpenCashModal={() => setIsCashModalOpen(true)}
            onOpenShortcutsModal={() => setIsShortcutsModalOpen(true)}
            onOpenCustomerModal={() => setIsCustomerModalOpen(true)}
            onOpenOnlineStore={() => setActiveAppView('online_store')}
            onOpenOnlineOrders={() => setIsOnlineOrdersModalOpen(true)}
            onOpenCloudBackup={() => setIsCloudBackupModalOpen(true)}
            onOpenDashboard={() => setIsDashboardModalOpen(true)}
            onOpenProductManagement={() => setIsProductManagementModalOpen(true)}
            onOpenCustomerHistory={() => handleOpenCustomerHistory()}
            onFocusSearch={handleFocusSearch}
            onLogout={handleLogout}
          />

          {/* Mobile Screen Switcher Bar (Small screens only) */}
          <div className="lg:hidden flex items-center justify-between px-3 py-2 bg-slate-900 border-b border-slate-800 text-xs">
            <div className="flex gap-1.5 overflow-x-auto scrollbar-none py-0.5">
              <button
                onClick={() => setMobileTab('catalog')}
                className={`px-3 py-1.5 rounded-lg font-bold transition whitespace-nowrap ${
                  mobileTab === 'catalog'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-800 text-slate-300'
                }`}
              >
                Catálogo
              </button>
              <button
                onClick={() => setMobileTab('cart')}
                className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
                  mobileTab === 'cart'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-800 text-slate-300'
                }`}
              >
                <span>Carrinho</span>
                {cartItems.length > 0 && (
                  <span className="w-5 h-5 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center text-[10px] font-black">
                    {cartItems.reduce((s, i) => s + i.quantity, 0)}
                  </span>
                )}
              </button>
              <button
                onClick={() => setIsDashboardModalOpen(true)}
                className="px-2.5 py-1.5 rounded-lg font-bold bg-slate-800 text-emerald-400 border border-slate-700 whitespace-nowrap"
              >
                Dashboard
              </button>
              <button
                onClick={() => setActiveAppView('online_store')}
                className="px-2.5 py-1.5 rounded-lg font-bold bg-slate-800 text-sky-400 border border-slate-700 whitespace-nowrap"
              >
                Loja Online
              </button>
            </div>

            {cartItems.length > 0 && (
              <button
                onClick={() => setIsCheckoutModalOpen(true)}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-xs"
              >
                Pagar (F9)
              </button>
            )}
          </div>

          {/* Main Split Layout */}
          <main className="flex-1 flex overflow-hidden">
            {/* Left Column: Products & Services Catalog */}
            <section
              className={`flex-1 flex flex-col h-full overflow-hidden ${
                mobileTab === 'cart' ? 'hidden lg:flex' : 'flex'
              }`}
            >
              <ProductCatalog
                products={products}
                onAddToCart={handleAddToCart}
                searchRef={searchInputRef}
                onOpenProductManagement={() => setIsProductManagementModalOpen(true)}
                currentUser={currentUser}
              />
            </section>

            {/* Right Column: Dynamic Cart & Checkout */}
            <aside
              className={`w-full lg:w-[380px] xl:w-[440px] flex flex-col h-full overflow-hidden shrink-0 ${
                mobileTab === 'catalog' ? 'hidden lg:flex' : 'flex'
              }`}
            >
              <Cart
                items={cartItems}
                currentUser={currentUser}
                customerCpf={customerCpf}
                customerName={customerName}
                clientIp={clientIp}
                discount={discount}
                onUpdateQuantity={handleUpdateQuantity}
                onRemoveItem={handleRemoveItem}
                onClearCart={handleClearCart}
                onOpenCustomerModal={() => setIsCustomerModalOpen(true)}
                onOpenCustomerHistory={handleOpenCustomerHistory}
                onSetDiscount={setDiscount}
                onCheckout={() => setIsCheckoutModalOpen(true)}
              />
            </aside>
          </main>

          {/* Floating Offline Resilience Banner */}
          <OfflineIndicator
            isOnline={isOnline}
            pendingCount={offlineQueue.length}
            onOpenSyncQueue={() => setIsSyncQueueModalOpen(true)}
          />
        </>
      )}

      {/* Modals */}
      <CheckoutModal
        total={cartTotal}
        isOpen={isCheckoutModalOpen}
        onClose={() => setIsCheckoutModalOpen(false)}
        onConfirmSale={handleConfirmSale}
      />

      <ReceiptModal
        sale={lastSale}
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
        onNewSale={() => {
          setIsReceiptModalOpen(false);
          handleClearCart();
          handleFocusSearch();
        }}
      />

      <CashRegisterModal
        isOpen={isCashModalOpen}
        onClose={() => setIsCashModalOpen(false)}
        session={cashSession}
        currentUser={currentUser}
        onOpenCash={handleOpenCash}
        onRecordMovement={handleRecordMovement}
        onCloseCash={handleCloseCash}
      />

      <SyncQueueModal
        isOpen={isSyncQueueModalOpen}
        onClose={() => setIsSyncQueueModalOpen(false)}
        queue={offlineQueue}
        isOnline={isOnline}
        onSyncNow={handleManualSync}
      />

      <CustomerModal
        isOpen={isCustomerModalOpen}
        onClose={() => setIsCustomerModalOpen(false)}
        currentCpf={customerCpf}
        currentName={customerName}
        clientIp={clientIp}
        onSaveCustomer={(cpf, name) => {
          setCustomerCpf(cpf);
          setCustomerName(name);
        }}
        onClearCustomer={() => {
          setCustomerCpf('');
          setCustomerName('');
        }}
        onOpenCustomerHistory={handleOpenCustomerHistory}
      />

      <CustomerHistoryModal
        isOpen={isCustomerHistoryModalOpen}
        onClose={() => setIsCustomerHistoryModalOpen(false)}
        initialCustomerQuery={customerHistoryQuery}
        onSelectCustomerForCart={(cpf, name) => {
          setCustomerCpf(cpf);
          setCustomerName(name);
        }}
        onAddToCart={(productId) => {
          const prod = products.find((p) => p.id === productId);
          if (prod) handleAddToCart(prod);
        }}
        availableProducts={products}
      />

      <ShortcutsModal
        isOpen={isShortcutsModalOpen}
        onClose={() => setIsShortcutsModalOpen(false)}
      />

      <OnlineOrdersOmnichannelModal
        isOpen={isOnlineOrdersModalOpen}
        onClose={() => setIsOnlineOrdersModalOpen(false)}
        orders={onlineOrders}
        onRefreshOrders={() => fetchOnlineOrders().then(setOnlineOrders)}
      />

      <CloudBackupModal
        isOpen={isCloudBackupModalOpen}
        onClose={() => setIsCloudBackupModalOpen(false)}
        isOnline={isOnline}
        onRefreshAllData={loadData}
        onToggleSimulatedOffline={() => setIsSimulatedOffline(!isSimulatedOffline)}
        isSimulatedOffline={isSimulatedOffline}
      />

      <DashboardModal
        isOpen={isDashboardModalOpen}
        onClose={() => setIsDashboardModalOpen(false)}
        sales={sales}
        onlineOrders={onlineOrders}
      />

      <ProductManagementModal
        isOpen={isProductManagementModalOpen}
        onClose={() => setIsProductManagementModalOpen(false)}
        products={products}
        currentUser={currentUser}
        onProductCreated={handleProductCreated}
        onProductUpdated={handleProductUpdated}
        onProductDeleted={handleProductDeleted}
      />

      <LoginModal
        isOpen={isLoginModalOpen || !currentUser}
        onLogin={handleLogin}
      />
    </div>
  );
}
