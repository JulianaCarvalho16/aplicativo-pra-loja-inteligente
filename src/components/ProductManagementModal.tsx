import React, { useState, useMemo } from 'react';
import {
  X,
  Plus,
  Edit2,
  Trash2,
  Search,
  Package,
  Wrench,
  ShieldAlert,
  ShieldCheck,
  KeyRound,
  AlertCircle,
  Check,
  DollarSign,
  Barcode,
  Layers,
  Image as ImageIcon,
  Save,
  Lock,
  Unlock,
  Eye,
  EyeOff
} from 'lucide-react';
import { Product, User, ItemType } from '../types';
import { formatCurrency } from '../utils/formatters';

interface ProductManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  currentUser: User | null;
  onProductCreated: (product: Product) => void;
  onProductUpdated: (product: Product) => void;
  onProductDeleted: (productId: string) => void;
}

export const ProductManagementModal: React.FC<ProductManagementModalProps> = ({
  isOpen,
  onClose,
  products,
  currentUser,
  onProductCreated,
  onProductUpdated,
  onProductDeleted,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todos');

  // Admin elevation state (allows non-admin operators to elevate with supervisor PIN)
  const [elevatedAdminPin, setElevatedAdminPin] = useState<string | null>(null);
  const [isPinDialogOpen, setIsPinDialogOpen] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  // Form State for Add / Edit
  const [isEditing, setIsEditing] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const [formData, setFormData] = useState<{
    name: string;
    category: string;
    type: ItemType;
    price: string;
    costPrice: string;
    stock: string;
    unit: string;
    sku: string;
    barcode: string;
    imageUrl: string;
  }>({
    name: '',
    category: 'Geral',
    type: 'product',
    price: '',
    costPrice: '',
    stock: '10',
    unit: 'un',
    sku: '',
    barcode: '',
    imageUrl: '',
  });

  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete Confirmation State
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);

  if (!isOpen) return null;

  const isAdmin = currentUser?.role === 'admin' || elevatedAdminPin === '1234';

  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return ['Todos', ...Array.from(set)];
  }, [products]);

  const filteredProducts = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    return products.filter((p) => {
      const matchCat =
        selectedCategory === 'Todos' || p.category.toLowerCase() === selectedCategory.toLowerCase();
      if (!matchCat) return false;
      if (!term) return true;
      return (
        p.name.toLowerCase().includes(term) ||
        p.sku.toLowerCase().includes(term) ||
        p.barcode.toLowerCase().includes(term)
      );
    });
  }, [products, selectedCategory, searchTerm]);

  // Request admin authorization if user is not admin
  const requireAdmin = (action: () => void) => {
    if (isAdmin) {
      action();
    } else {
      setPendingAction(() => action);
      setPinInput('');
      setPinError(null);
      setIsPinDialogOpen(true);
    }
  };

  const handleValidatePin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput.trim() === '1234') {
      setElevatedAdminPin('1234');
      setIsPinDialogOpen(false);
      setPinError(null);
      if (pendingAction) {
        pendingAction();
        setPendingAction(null);
      }
    } else {
      setPinError('PIN de administrador incorreto. O PIN padrão da Administradora (Ana Gestora) é 1234.');
    }
  };

  const handleOpenAddForm = () => {
    requireAdmin(() => {
      setEditingProduct(null);
      setFormData({
        name: '',
        category: 'Geral',
        type: 'product',
        price: '',
        costPrice: '',
        stock: '10',
        unit: 'un',
        sku: `SKU-${Math.floor(1000 + Math.random() * 9000)}`,
        barcode: `789${Math.floor(1000000000 + Math.random() * 9000000000)}`,
        imageUrl: '',
      });
      setFormError(null);
      setIsEditing(true);
    });
  };

  const handleOpenEditForm = (product: Product) => {
    requireAdmin(() => {
      setEditingProduct(product);
      setFormData({
        name: product.name,
        category: product.category,
        type: product.type,
        price: product.price.toFixed(2),
        costPrice: product.costPrice.toFixed(2),
        stock: String(product.stock),
        unit: product.unit,
        sku: product.sku,
        barcode: product.barcode,
        imageUrl: product.imageUrl || '',
      });
      setFormError(null);
      setIsEditing(true);
    });
  };

  const handleDeleteClick = (product: Product) => {
    requireAdmin(() => {
      setProductToDelete(product);
    });
  };

  const handleConfirmDelete = async () => {
    if (!productToDelete) return;
    setIsSubmitting(true);
    try {
      const { deleteProduct } = await import('../services/api');
      await deleteProduct(productToDelete.id, {
        adminPin: elevatedAdminPin || currentUser?.pin || '1234',
        user: currentUser,
      });
      onProductDeleted(productToDelete.id);
      setProductToDelete(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao excluir item.';
      alert(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setFormError('O nome do item é obrigatório.');
      return;
    }
    const numPrice = parseFloat(formData.price.replace(',', '.'));
    if (isNaN(numPrice) || numPrice < 0) {
      setFormError('Informe um preço de venda válido.');
      return;
    }

    const numCost = parseFloat(formData.costPrice.replace(',', '.')) || numPrice * 0.4;
    const numStock = formData.type === 'service' ? 9999 : parseInt(formData.stock, 10) || 0;

    setIsSubmitting(true);
    setFormError(null);

    try {
      const { createProduct, updateProduct } = await import('../services/api');
      const adminAuth = {
        adminPin: elevatedAdminPin || currentUser?.pin || '1234',
        user: currentUser,
      };

      if (editingProduct) {
        const updated = await updateProduct(
          editingProduct.id,
          {
            name: formData.name.trim(),
            category: formData.category.trim(),
            type: formData.type,
            price: numPrice,
            costPrice: numCost,
            stock: numStock,
            unit: formData.unit.trim(),
            sku: formData.sku.trim(),
            barcode: formData.barcode.trim(),
            imageUrl: formData.imageUrl.trim() || undefined,
          },
          adminAuth
        );
        onProductUpdated(updated);
      } else {
        const created = await createProduct(
          {
            name: formData.name.trim(),
            category: formData.category.trim(),
            type: formData.type,
            price: numPrice,
            costPrice: numCost,
            stock: numStock,
            unit: formData.unit.trim(),
            sku: formData.sku.trim(),
            barcode: formData.barcode.trim(),
            imageUrl: formData.imageUrl.trim() || undefined,
          },
          adminAuth
        );
        onProductCreated(created);
      }

      setIsEditing(false);
      setEditingProduct(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao salvar produto.';
      setFormError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 select-none">
      <div className="w-full max-w-4xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden text-slate-100 animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Top Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">Gerenciamento de Itens & Estoque</h2>
                {isAdmin ? (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-emerald-950/80 border border-emerald-600/60 text-emerald-400 font-medium">
                    <ShieldCheck className="w-3 h-3" />
                    Admin Ativo
                  </span>
                ) : (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-amber-950/80 border border-amber-600/60 text-amber-400 font-medium">
                    <Lock className="w-3 h-3" />
                    Apenas Admin Edita
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                Adicionar, editar e remover produtos físicos e serviços da loja
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isAdmin && (
              <button
                type="button"
                onClick={() => {
                  setPinInput('');
                  setPinError(null);
                  setIsPinDialogOpen(true);
                }}
                className="px-3 py-1.5 rounded-lg bg-amber-950/60 hover:bg-amber-900/60 border border-amber-700 text-amber-300 text-xs font-semibold flex items-center gap-1.5 transition"
                title="Desbloquear permissão de administrador com PIN"
              >
                <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                <span>Liberar Admin</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Security Alert Banner for Non-Admin */}
        {!isAdmin && (
          <div className="px-6 py-2.5 bg-amber-950/30 border-b border-amber-900/40 flex items-center justify-between text-xs text-amber-300">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0 text-amber-400" />
              <span>
                Operador atual (<strong>{currentUser?.name}</strong> - {currentUser?.role}). Apenas usuários com permissão de administrador podem alterar produtos. Ao tentar cadastrar, editar ou excluir, o PIN de supervisor será solicitado.
              </span>
            </div>
          </div>
        )}

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {isEditing ? (
            /* Add / Edit Form */
            <form onSubmit={handleSaveProduct} className="space-y-4 max-w-2xl mx-auto">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  {editingProduct ? <Edit2 className="w-4 h-4 text-emerald-400" /> : <Plus className="w-4 h-4 text-emerald-400" />}
                  {editingProduct ? `Editar Item: ${editingProduct.name}` : 'Cadastrar Novo Item no Catálogo'}
                </h3>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="text-xs text-slate-400 hover:text-slate-200"
                >
                  Cancelar
                </button>
              </div>

              {formError && (
                <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-800 text-xs text-rose-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Item Type & Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Tipo de Item
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, type: 'product' })}
                      className={`py-2 rounded-lg border text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                        formData.type === 'product'
                          ? 'bg-emerald-950/70 border-emerald-500 text-emerald-300'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-850'
                      }`}
                    >
                      <Package className="w-3.5 h-3.5" />
                      <span>Produto Físico</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, type: 'service' })}
                      className={`py-2 rounded-lg border text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                        formData.type === 'service'
                          ? 'bg-sky-950/70 border-sky-500 text-sky-300'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-850'
                      }`}
                    >
                      <Wrench className="w-3.5 h-3.5" />
                      <span>Serviço</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Categoria
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Bebidas, Alimentos, Eletrônicos..."
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Nome do Item *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Café Espresso Gourmet 100ml"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Pricing & Stock */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Preço de Venda (R$) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    min="0"
                    placeholder="0.00"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-base font-bold font-mono text-emerald-400 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Preço de Custo (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={formData.costPrice}
                    onChange={(e) => setFormData({ ...formData, costPrice: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm font-mono text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    {formData.type === 'service' ? 'Disponibilidade' : 'Estoque Físico'}
                  </label>
                  <input
                    type="number"
                    disabled={formData.type === 'service'}
                    min="0"
                    value={formData.type === 'service' ? 9999 : formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm font-mono text-slate-200 focus:outline-none focus:border-emerald-500 disabled:opacity-50"
                  />
                </div>
              </div>

              {/* SKU, Barcode, Unit */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Código SKU
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: BEB-001"
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Código de Barras (EAN)
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: 7891000100011"
                    value={formData.barcode}
                    onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Unidade
                  </label>
                  <select
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="un">un (Unidade)</option>
                    <option value="kg">kg (Quilograma)</option>
                    <option value="kit">kit (Conjunto)</option>
                    <option value="pct">pct (Pacote)</option>
                    <option value="hr">hr (Hora de Serviço)</option>
                  </select>
                </div>
              </div>

              {/* Image URL */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  URL da Imagem (Opcional)
                </label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/..."
                  value={formData.imageUrl}
                  onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 rounded-xl border border-slate-700 text-xs font-semibold text-slate-300 hover:bg-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider shadow-lg transition flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {isSubmitting ? 'Salvando...' : editingProduct ? 'Atualizar Item (Admin)' : 'Cadastrar Item (Admin)'}
                </button>
              </div>
            </form>
          ) : (
            /* Items List Table */
            <div className="space-y-4">
              {/* Toolbar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-950 p-3 rounded-xl border border-slate-800">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Buscar por nome, SKU ou código de barras..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>

                  <button
                    onClick={handleOpenAddForm}
                    className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md transition whitespace-nowrap"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Novo Item</span>
                    {!isAdmin && <Lock className="w-3 h-3 text-emerald-200" />}
                  </button>
                </div>
              </div>

              {/* Items Counter */}
              <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                <span>Exibindo <strong>{filteredProducts.length}</strong> itens cadastrados</span>
                <span>Estoque central sincronizado com PDV físico e Loja Online</span>
              </div>

              {/* Products Table */}
              <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-900/90 text-slate-400 font-semibold border-b border-slate-800">
                      <tr>
                        <th className="py-2.5 px-3">Item / Descrição</th>
                        <th className="py-2.5 px-3">Categoria</th>
                        <th className="py-2.5 px-3">Tipo</th>
                        <th className="py-2.5 px-3 text-right">Preço de Venda</th>
                        <th className="py-2.5 px-3 text-right">Custo</th>
                        <th className="py-2.5 px-3 text-center">Estoque</th>
                        <th className="py-2.5 px-3 text-right">Ações (Admin)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {filteredProducts.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-slate-500">
                            Nenhum item encontrado correspondente aos filtros.
                          </td>
                        </tr>
                      ) : (
                        filteredProducts.map((p) => {
                          const isService = p.type === 'service';
                          return (
                            <tr key={p.id} className="hover:bg-slate-900/50 transition">
                              <td className="py-2.5 px-3">
                                <div className="flex items-center gap-2.5">
                                  {p.imageUrl ? (
                                    <img
                                      src={p.imageUrl}
                                      alt={p.name}
                                      className="w-9 h-9 rounded-lg object-cover bg-slate-900 border border-slate-800 shrink-0"
                                      onError={(e) => {
                                        (e.target as HTMLElement).style.display = 'none';
                                      }}
                                    />
                                  ) : (
                                    <div className="w-9 h-9 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 shrink-0">
                                      <Package className="w-4 h-4" />
                                    </div>
                                  )}
                                  <div>
                                    <span className="font-semibold text-slate-200 block line-clamp-1">
                                      {p.name}
                                    </span>
                                    <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono">
                                      <span>SKU: {p.sku}</span>
                                      <span>•</span>
                                      <span>EAN: {p.barcode}</span>
                                    </div>
                                  </div>
                                </div>
                              </td>

                              <td className="py-2.5 px-3 text-slate-300">
                                <span className="px-2 py-0.5 rounded bg-slate-800/80 border border-slate-700/60 text-[10px]">
                                  {p.category}
                                </span>
                              </td>

                              <td className="py-2.5 px-3">
                                {isService ? (
                                  <span className="text-sky-400 font-mono text-[11px] font-semibold">Serviço</span>
                                ) : (
                                  <span className="text-slate-400 font-mono text-[11px]">Produto</span>
                                )}
                              </td>

                              <td className="py-2.5 px-3 text-right font-bold font-mono text-emerald-400">
                                {formatCurrency(p.price)}
                              </td>

                              <td className="py-2.5 px-3 text-right font-mono text-slate-400">
                                {formatCurrency(p.costPrice)}
                              </td>

                              <td className="py-2.5 px-3 text-center">
                                {isService ? (
                                  <span className="text-[10px] text-sky-400 font-mono">Ilimitado</span>
                                ) : (
                                  <span
                                    className={`font-mono font-bold text-[11px] px-2 py-0.5 rounded ${
                                      p.stock <= 5
                                        ? 'bg-rose-950/80 text-rose-300 border border-rose-800'
                                        : 'bg-slate-800/80 text-slate-300'
                                    }`}
                                  >
                                    {p.stock} {p.unit}
                                  </span>
                                )}
                              </td>

                              <td className="py-2.5 px-3 text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <button
                                    onClick={() => handleOpenEditForm(p)}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-slate-800 transition"
                                    title="Editar Item (Requer Permissão de Admin)"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteClick(p)}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
                                    title="Excluir Item (Requer Permissão de Admin)"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Bottom Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Permissões ativas: <strong>{isAdmin ? 'Administrador Geral' : 'Operador Padrão (Leitura)'}</strong></span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-700 text-xs font-semibold text-slate-300 hover:bg-slate-800 transition"
          >
            Fechar Janela (Esc)
          </button>
        </div>
      </div>

      {/* Admin PIN Elevation Dialog */}
      {isPinDialogOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in">
          <div className="w-full max-w-sm bg-slate-900 border border-amber-800/80 rounded-2xl shadow-2xl p-5 space-y-4 text-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-950/80 border border-amber-600 flex items-center justify-center text-amber-400 shrink-0">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Autorização de Administrador</h3>
                <p className="text-[11px] text-slate-400">
                  Insira o PIN de Administrador para liberar a alteração de itens
                </p>
              </div>
            </div>

            <form onSubmit={handleValidatePin} className="space-y-3">
              <div>
                <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                  <span>Supervisor: Ana Gestora (Admin)</span>
                  <span className="font-mono text-slate-500">PIN padrão: 1234</span>
                </div>
                <input
                  type="password"
                  maxLength={6}
                  autoFocus
                  required
                  placeholder="PIN de 4 dígitos..."
                  value={pinInput}
                  onChange={(e) => {
                    setPinInput(e.target.value);
                    setPinError(null);
                  }}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-center text-lg font-mono tracking-widest text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              {pinError && (
                <div className="p-2 rounded-lg bg-rose-950/70 border border-rose-800 text-[11px] text-rose-300 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-400" />
                  <span>{pinError}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsPinDialogOpen(false)}
                  className="py-2.5 rounded-xl border border-slate-700 text-xs font-semibold text-slate-300 hover:bg-slate-800 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 font-bold text-xs uppercase tracking-wider text-white shadow-lg transition"
                >
                  Autorizar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {productToDelete && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in">
          <div className="w-full max-w-sm bg-slate-900 border border-rose-800 rounded-2xl shadow-2xl p-5 space-y-4 text-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-950/80 border border-rose-600 flex items-center justify-center text-rose-400 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Excluir Item do Catálogo</h3>
                <p className="text-[11px] text-slate-400">
                  Esta ação não pode ser desfeita no banco central
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Tem certeza que deseja remover o item <strong>"{productToDelete.name}"</strong> (SKU: {productToDelete.sku})?
            </p>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => setProductToDelete(null)}
                className="py-2.5 rounded-xl border border-slate-700 text-xs font-semibold text-slate-300 hover:bg-slate-800 transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleConfirmDelete}
                className="py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 font-bold text-xs uppercase tracking-wider text-white shadow-lg transition"
              >
                {isSubmitting ? 'Excluindo...' : 'Sim, Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
