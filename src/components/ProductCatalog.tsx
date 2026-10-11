import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Search, Plus, Sparkles, Wrench, Package, Barcode, Check, Coffee, Smartphone, Shirt, ShoppingBag, Settings2, Lock, ShieldCheck } from 'lucide-react';
import { Product, User } from '../types';
import { formatCurrency } from '../utils/formatters';

interface ProductCatalogProps {
  products: Product[];
  onAddToCart: (product: Product) => void;
  searchRef?: React.RefObject<HTMLInputElement | null>;
  onOpenProductManagement?: () => void;
  currentUser?: User | null;
}

export const ProductCatalog: React.FC<ProductCatalogProps> = ({
  products,
  onAddToCart,
  searchRef,
  onOpenProductManagement,
  currentUser,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [justAddedId, setJustAddedId] = useState<string | null>(null);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  // Extract distinct categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return ['Todos', ...Array.from(set)];
  }, [products]);

  // Filter products by category and search (name, SKU, barcode)
  const filteredProducts = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    return products.filter((p) => {
      const matchesCategory =
        selectedCategory === 'Todos' || p.category.toLowerCase() === selectedCategory.toLowerCase();
      if (!matchesCategory) return false;

      if (!term) return true;
      return (
        p.name.toLowerCase().includes(term) ||
        p.sku.toLowerCase().includes(term) ||
        p.barcode.toLowerCase().includes(term)
      );
    });
  }, [products, selectedCategory, searchTerm]);

  // Barcode / Fast Enter press: if exactly 1 item matches, add immediately!
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (filteredProducts.length === 1) {
        handleProductClick(filteredProducts[0]);
        setSearchTerm('');
      } else if (filteredProducts.length > 0) {
        // Check exact barcode match
        const exact = filteredProducts.find(
          (p) => p.barcode === searchTerm.trim() || p.sku.toLowerCase() === searchTerm.toLowerCase().trim()
        );
        if (exact) {
          handleProductClick(exact);
          setSearchTerm('');
        }
      }
    }
  };

  const handleProductClick = (product: Product) => {
    if (product.type === 'product' && product.stock <= 0) {
      return; // out of stock
    }
    onAddToCart(product);
    setJustAddedId(product.id);
    setTimeout(() => {
      setJustAddedId((curr) => (curr === product.id ? null : curr));
    }, 450);
  };

  // Helper icon for categories without explicit photos
  const getCategoryFallbackIcon = (category: string) => {
    const cat = category.toLowerCase();
    if (cat.includes('bebida') || cat.includes('café') || cat.includes('alimento')) {
      return <Coffee className="w-6 h-6 text-emerald-400/60" />;
    }
    if (cat.includes('eletrônico')) {
      return <Smartphone className="w-6 h-6 text-sky-400/60" />;
    }
    if (cat.includes('vestuário') || cat.includes('moda')) {
      return <Shirt className="w-6 h-6 text-purple-400/60" />;
    }
    if (cat.includes('serviço')) {
      return <Wrench className="w-6 h-6 text-amber-400/60" />;
    }
    return <Package className="w-6 h-6 text-slate-400/60" />;
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 overflow-hidden">
      {/* Search and Barcode Input Bar */}
      <div className="p-3 bg-slate-900 border-b border-slate-800 flex items-center gap-3">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            ref={searchRef}
            type="text"
            placeholder="Buscar produto por nome, SKU ou Código de Barras (F2)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-10 py-2.5 text-sm text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-xs text-slate-400 hover:text-slate-200"
            >
              Limpar
            </button>
          )}
        </div>

        <div className="hidden sm:flex items-center gap-1.5 px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-lg text-xs text-slate-300">
          <Barcode className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="font-mono text-[11px]">Leitor Ativo</span>
        </div>

        {onOpenProductManagement && (
          <button
            onClick={onOpenProductManagement}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border transition shrink-0 ${
              currentUser?.role === 'admin'
                ? 'bg-emerald-950/70 border-emerald-600 text-emerald-300 hover:bg-emerald-900/60 shadow-sm'
                : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-750'
            }`}
            title="Adicionar, editar ou remover itens da loja (Permissão de Administrador)"
          >
            <Package className="w-4 h-4 text-emerald-400" />
            <span className="hidden md:inline">Gerenciar Itens</span>
            {currentUser?.role === 'admin' ? (
              <span className="px-1.5 py-0.2 rounded text-[10px] bg-emerald-500/20 text-emerald-300 font-mono font-bold">
                Admin
              </span>
            ) : (
              <Lock className="w-3.5 h-3.5 text-slate-400" />
            )}
          </button>
        )}
      </div>

      {/* Category Segmented Tabs (Interactive Filter Controls) */}
      <div className="px-3 py-2 bg-slate-900/50 border-b border-slate-800/80 overflow-x-auto scrollbar-none flex items-center gap-1.5">
        {categories.map((cat) => {
          const isActive = selectedCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                isActive
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-700/60'
              }`}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* Product & Services Grid */}
      <div className="flex-1 overflow-y-auto p-3">
        {filteredProducts.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
            <Package className="w-12 h-12 stroke-[1.5] text-slate-600 mb-3" />
            <p className="text-sm font-medium text-slate-300">Nenhum item encontrado</p>
            <p className="text-xs text-slate-500 mt-1">
              Verifique a grafia ou o código digitado, ou selecione outra categoria.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-2.5">
            {filteredProducts.map((product) => {
              const isService = product.type === 'service';
              const isOutOfStock = !isService && product.stock <= 0;
              const isJustAdded = justAddedId === product.id;

              return (
                <button
                  key={product.id}
                  onClick={() => handleProductClick(product)}
                  disabled={isOutOfStock}
                  className={`group relative text-left flex flex-col justify-between p-2.5 rounded-xl border transition duration-150 select-none ${
                    isOutOfStock
                      ? 'bg-slate-900/40 border-slate-800/40 opacity-50 cursor-not-allowed'
                      : isJustAdded
                      ? 'bg-emerald-950/70 border-emerald-500 scale-[0.98]'
                      : 'bg-slate-900/90 border-slate-800 hover:border-slate-700 hover:bg-slate-850 active:scale-[0.98] shadow-sm'
                  }`}
                >
                  {/* Photo Container */}
                  <div className="w-full aspect-[4/3] rounded-lg overflow-hidden bg-slate-950 border border-slate-800/80 mb-2 relative flex items-center justify-center">
                    {product.imageUrl && !failedImages[product.id] ? (
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                        onError={() => {
                          setFailedImages((prev) => ({ ...prev, [product.id]: true }));
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 to-slate-950 p-2">
                        {getCategoryFallbackIcon(product.category)}
                        <span className="text-[10px] text-slate-500 font-mono mt-1">{product.category}</span>
                      </div>
                    )}

                    {/* Service / Stock badge over image */}
                    <div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded bg-slate-950/80 backdrop-blur-xs text-[10px] font-mono border border-slate-700/60">
                      {isService ? (
                        <span className="text-sky-400 font-semibold">Serviço</span>
                      ) : (
                        <span className={product.stock <= 5 ? 'text-amber-400 font-bold' : 'text-slate-300'}>
                          Qtd: {product.stock}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Card Header: Type indicator & SKU */}
                  <div className="flex items-center justify-between text-[10px] text-slate-400 mb-0.5 w-full">
                    <span className="font-mono text-slate-400 truncate max-w-[100px]">{product.sku}</span>
                    <span className="text-slate-500">{product.category}</span>
                  </div>

                  {/* Card Title */}
                  <div className="flex-1 my-0.5">
                    <h3 className="text-xs sm:text-sm font-semibold text-slate-100 line-clamp-2 leading-snug group-hover:text-emerald-300 transition">
                      {product.name}
                    </h3>
                  </div>

                  {/* Card Footer: Price and Add Indicator */}
                  <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between w-full">
                    <div className="text-sm sm:text-base font-bold text-white font-mono tabular-nums">
                      {formatCurrency(product.price)}
                    </div>

                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center transition ${
                        isJustAdded
                          ? 'bg-emerald-500 text-white'
                          : 'bg-slate-800 text-slate-300 group-hover:bg-emerald-600 group-hover:text-white'
                      }`}
                    >
                      {isJustAdded ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

