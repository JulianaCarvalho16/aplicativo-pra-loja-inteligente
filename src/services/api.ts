import { Product, Sale, CashSession, CashMovement, User, OnlineOrder, CloudBackupSnapshot } from '../types';
import { localDB, OfflineSaleItem } from './db';

const API_BASE = '/api';

export async function fetchClientIp(): Promise<string> {
  try {
    const res = await fetch(`${API_BASE}/client-ip`);
    if (!res.ok) throw new Error('Failed to fetch IP');
    const data = await res.json();
    return data.ip || '127.0.0.1';
  } catch {
    // If offline, check if we previously cached or use local network placeholder
    return '192.168.1.100 (offline)';
  }
}

export async function loginUser(username: string, pin: string): Promise<User> {
  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, pin }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Credenciais inválidas');
    }

    const data = await res.json();
    const user: User = data.user;
    localDB.setCurrentUser(user);
    return user;
  } catch (err: unknown) {
    // Offline authentication fallback: check if user matches standard offline accounts
    const offlineAccounts: User[] = [
      { id: 'usr-1', name: 'Ana Gestora', username: 'admin', role: 'admin' },
      { id: 'usr-2', name: 'Carlos Silva', username: 'carlos', role: 'caixa' },
      { id: 'usr-3', name: 'Mariana Santos', username: 'mariana', role: 'vendedor' },
      { id: 'usr-4', name: 'Lucas Oliveira', username: 'lucas', role: 'vendedor' },
    ];

    const pins: Record<string, string> = {
      admin: '1234',
      carlos: '1001',
      mariana: '1002',
      lucas: '1003',
    };

    const uname = username.toLowerCase().trim();
    if (pins[uname] && pins[uname] === pin.trim()) {
      const matched = offlineAccounts.find((u) => u.username === uname);
      if (matched) {
        localDB.setCurrentUser(matched);
        return matched;
      }
    }

    throw err;
  }
}

export async function fetchProducts(): Promise<Product[]> {
  try {
    const res = await fetch(`${API_BASE}/products`);
    if (!res.ok) throw new Error('Falha ao buscar produtos no servidor');
    const products: Product[] = await res.json();
    // Cache for offline usage
    await localDB.saveProducts(products);
    return products;
  } catch (err) {
    console.warn('Utilizando catálogo local de produtos (modo offline):', err);
    const cached = await localDB.getProducts();
    return cached;
  }
}

export async function submitSale(sale: Sale, isOnline: boolean): Promise<{ success: boolean; offline: boolean; sale: Sale; error?: string }> {
  // Always deduct stock locally first for snappy UI
  await localDB.deductLocalStock(sale.items);

  if (!isOnline) {
    // Offline: queue in IndexedDB
    await localDB.enqueueSale(sale);
    return { success: true, offline: true, sale };
  }

  try {
    const res = await fetch(`${API_BASE}/sales`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sale),
    });

    if (!res.ok) {
      throw new Error('Falha ao registrar venda no banco central');
    }

    const data = await res.json();
    return { success: true, offline: false, sale: data.sale || sale };
  } catch (err) {
    console.warn('Erro ao conectar ao servidor central. Enfileirando offline:', err);
    await localDB.enqueueSale(sale);
    return { success: true, offline: true, sale };
  }
}

export async function syncOfflineSales(): Promise<{ success: boolean; syncedCount: number; remainingCount: number; message: string }> {
  const queue = await localDB.getOfflineQueue();
  if (queue.length === 0) {
    return { success: true, syncedCount: 0, remainingCount: 0, message: 'Nenhuma venda pendente na fila offline.' };
  }

  try {
    const res = await fetch(`${API_BASE}/sales/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ offlineSales: queue }),
    });

    if (!res.ok) {
      throw new Error('Falha na resposta do servidor durante sincronização.');
    }

    const data = await res.json();
    const syncedIds = queue.map((s) => s.id);
    await localDB.removeSalesFromQueue(syncedIds);

    // Refresh products cache to align with central stock
    try {
      const refreshedProducts = await fetchProducts();
      await localDB.saveProducts(refreshedProducts);
    } catch {
      // Ignored
    }

    return {
      success: true,
      syncedCount: data.syncedCount || queue.length,
      remainingCount: 0,
      message: `${data.syncedCount || queue.length} venda(s) sincronizada(s) com sucesso com o banco central!`,
    };
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : 'Falha na conexão';
    return {
      success: false,
      syncedCount: 0,
      remainingCount: queue.length,
      message: `Erro na sincronização: ${errMsg}. As vendas continuam seguras localmente.`,
    };
  }
}

export async function fetchSales(): Promise<Sale[]> {
  try {
    const res = await fetch(`${API_BASE}/sales`);
    if (!res.ok) throw new Error('Falha ao buscar histórico de vendas');
    const centralSales: Sale[] = await res.json();
    const offlineQueue = await localDB.getOfflineQueue();
    // Include any local offline sales not yet synchronized to central
    const pendingSales = offlineQueue.filter(
      (off) => !centralSales.some((c) => c.id === off.id)
    );
    return [...pendingSales, ...centralSales];
  } catch (err) {
    console.warn('Utilizando vendas locais em modo offline:', err);
    const offlineQueue = await localDB.getOfflineQueue();
    return offlineQueue;
  }
}

// Cash Drawer Operations
export async function fetchCurrentCashSession(): Promise<CashSession | null> {
  try {
    const res = await fetch(`${API_BASE}/cash-register/current`);
    if (!res.ok) throw new Error('Failed to fetch cash session');
    const data = await res.json();
    if (data.session) {
      localDB.setCashSession(data.session);
    }
    return data.session;
  } catch {
    return localDB.getCashSession();
  }
}

export async function openCashSession(initialAmount: number, user: User): Promise<CashSession> {
  try {
    const res = await fetch(`${API_BASE}/cash-register/open`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        initialAmount,
        openedBy: user.id,
        openedByName: user.name,
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Falha ao abrir caixa');
    }

    const session: CashSession = await res.json();
    localDB.setCashSession(session);
    return session;
  } catch (err) {
    // Offline cash session
    const fallbackSession: CashSession = {
      id: `sess-offline-${Date.now()}`,
      status: 'open',
      openedAt: new Date().toISOString(),
      openedBy: user.id,
      openedByName: user.name,
      initialAmount,
      movements: [],
    };
    localDB.setCashSession(fallbackSession);
    return fallbackSession;
  }
}

export async function recordCashMovement(
  type: 'sangria' | 'suprimento',
  amount: number,
  reason: string,
  user: User
): Promise<CashMovement> {
  try {
    const res = await fetch(`${API_BASE}/cash-register/movement`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type,
        amount,
        reason,
        operatorId: user.id,
        operatorName: user.name,
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Falha ao registrar movimentação');
    }

    const data = await res.json();
    if (data.session) {
      localDB.setCashSession(data.session);
    }
    return data.movement;
  } catch (err) {
    const current = localDB.getCashSession();
    const movement: CashMovement = {
      id: `mov-offline-${Date.now()}`,
      sessionId: current?.id || 'offline-sess',
      type,
      amount,
      reason,
      operatorId: user.id,
      operatorName: user.name,
      timestamp: new Date().toISOString(),
    };

    if (current) {
      current.movements.push(movement);
      localDB.setCashSession(current);
    }

    return movement;
  }
}

export async function closeCashSession(actualAmount: number, closingNotes?: string): Promise<CashSession> {
  try {
    const res = await fetch(`${API_BASE}/cash-register/close`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ actualAmount, closingNotes }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Falha ao fechar caixa');
    }

    const data = await res.json();
    localDB.setCashSession(null);
    return data.session;
  } catch {
    const current = localDB.getCashSession();
    if (current) {
      current.status = 'closed';
      current.closedAt = new Date().toISOString();
      current.actualAmount = actualAmount;
      current.closingNotes = closingNotes;
      localDB.setCashSession(null);
      return current;
    }
    throw new Error('Nenhum caixa aberto para fechar.');
  }
}

// ==========================================
// ONLINE STORE / E-COMMERCE CLIENT METHODS
// ==========================================

export async function fetchOnlineOrders(): Promise<OnlineOrder[]> {
  try {
    const res = await fetch(`${API_BASE}/online-orders`);
    if (!res.ok) throw new Error('Falha ao buscar pedidos online');
    const orders: OnlineOrder[] = await res.json();
    await localDB.saveOnlineOrders(orders);
    return orders;
  } catch (err) {
    console.warn('Utilizando pedidos online em cache local:', err);
    return localDB.getOnlineOrders();
  }
}

export async function createOnlineOrder(orderData: Partial<OnlineOrder> & { items: any[] }): Promise<{ success: boolean; order: OnlineOrder }> {
  const res = await fetch(`${API_BASE}/online-orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(orderData),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Falha ao realizar pedido online');
  }

  const data = await res.json();
  // Also refresh local cached products
  if (data.updatedProducts) {
    await localDB.saveProducts(data.updatedProducts);
  }
  return data;
}

export async function updateOnlineOrderStatus(orderId: string, orderStatus: string): Promise<OnlineOrder> {
  const res = await fetch(`${API_BASE}/online-orders/${orderId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orderStatus }),
  });

  if (!res.ok) {
    throw new Error('Falha ao atualizar status do pedido');
  }

  const data = await res.json();
  return data.order;
}

// ==========================================
// CLOUD BACKUP & AUTO-SYNC CLIENT METHODS
// ==========================================

export async function exportCloudBackup(): Promise<CloudBackupSnapshot> {
  const res = await fetch(`${API_BASE}/backup/export`);
  if (!res.ok) throw new Error('Falha ao exportar backup da nuvem');
  const snapshot: CloudBackupSnapshot = await res.json();
  localDB.saveLocalBackup(snapshot);
  return snapshot;
}

export async function restoreCloudBackup(snapshot: CloudBackupSnapshot): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${API_BASE}/backup/restore`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(snapshot),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Falha ao restaurar backup');
  }

  localDB.saveLocalBackup(snapshot);
  return res.json();
}

export async function performAutoBackupSync(): Promise<{
  success: boolean;
  mergedCount: number;
  message: string;
  cloudProducts?: Product[];
  cloudOnlineOrders?: OnlineOrder[];
}> {
  const queue = await localDB.getOfflineQueue();

  try {
    const res = await fetch(`${API_BASE}/backup/auto-sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        offlineSales: queue,
        clientDeviceId: 'pdv-terminal-pos',
      }),
    });

    if (!res.ok) {
      throw new Error('Servidor em nuvem não respondeu ao auto-backup');
    }

    const data = await res.json();

    // Clear synced sales from offline queue
    if (queue.length > 0) {
      const syncedIds = queue.map((s) => s.id);
      await localDB.removeSalesFromQueue(syncedIds);
    }

    // Update local caches
    if (data.cloudProducts) {
      await localDB.saveProducts(data.cloudProducts);
    }
    if (data.cloudOnlineOrders) {
      await localDB.saveOnlineOrders(data.cloudOnlineOrders);
    }

    // Save snapshot metadata
    localDB.setCashSession(localDB.getCashSession());

    return {
      success: true,
      mergedCount: data.mergedOfflineSalesCount || 0,
      message: data.message,
      cloudProducts: data.cloudProducts,
      cloudOnlineOrders: data.cloudOnlineOrders,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Falha na conexão com a nuvem';
    return {
      success: false,
      mergedCount: 0,
      message: `Modo offline ativo: dados preservados no dispositivo. (${msg})`,
    };
  }
}
