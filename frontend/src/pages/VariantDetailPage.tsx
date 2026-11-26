import React, { useEffect, useState } from 'react';
import { ArrowLeft, ShoppingCart, AlertCircle, Plus, Minus, Check, ArrowRight, PackagePlus } from 'lucide-react';
import { ApiClient } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

interface VariantDetailPageProps {
  code: string;
  onBack: () => void;
  onAddToCart?: (code: string) => void;
  onViewCart?: () => void;
}

export const VariantDetailPage: React.FC<VariantDetailPageProps> = ({
  code,
  onBack,
  onAddToCart,
  onViewCart,
}) => {
  const { isStaff } = useAuth();
  const { addToCart, itemCount } = useCart();

  const [variant, setVariant] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [addedToast, setAddedToast] = useState(false);

  useEffect(() => {
    const fetchVariant = async () => {
      try {
        const data = await ApiClient.get(`/catalog/variants/by-code/${encodeURIComponent(code)}`);
        setVariant(data);
      } catch (err: any) {
        setError(err.message || 'No se encontró el producto o variante');
      } finally {
        setLoading(false);
      }
    };

    fetchVariant();
  }, [code]);

  const handleAdd = () => {
    if (!variant) return;

    // Si es personal de venta y se pasa el handler nativo del POS
    if (onAddToCart) {
      onAddToCart(variant.codigo);
    }

    // Agregar al carrito del cliente
    const stockAvailable = variant.stock_actual !== undefined ? variant.stock_actual : 999;
    const res = addToCart(
      {
        variant_id: variant.id,
        codigo: variant.codigo,
        sku: variant.sku,
        producto_nombre: variant.producto.nombre,
        talle: variant.talle,
        color: variant.color,
        precio: variant.precio,
        stock_disponible: stockAvailable,
      },
      quantity
    );

    if (res.success) {
      setAddedToast(true);
      setTimeout(() => setAddedToast(false), 4000);
    } else {
      alert(res.message || 'No fue posible agregar al carrito');
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-sm text-gray-500">Cargando ficha del producto...</p>
      </div>
    );
  }

  if (error || !variant) {
    return (
      <div className="p-6 text-center">
        <AlertCircle className="mx-auto h-10 w-10 text-red-500 mb-2" />
        <p className="text-sm text-gray-800 font-semibold">{error || 'Producto no encontrado'}</p>
        <button
          onClick={onBack}
          className="mt-4 rounded-xl bg-gray-900 px-4 py-2 text-xs font-semibold text-white"
        >
          Volver al catálogo
        </button>
      </div>
    );
  }

  const isOutOfStock =
    variant.disponibilidad === 'Sin stock' || (variant.stock_actual !== undefined && variant.stock_actual <= 0);

  return (
    <div className="mx-auto max-w-md p-4 pb-28 animate-in fade-in">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 shadow-sm"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Ficha del Producto</h2>
        </div>

        {onViewCart && itemCount > 0 && (
          <button
            onClick={onViewCart}
            className="flex items-center gap-1.5 rounded-xl bg-brand-50 dark:bg-brand-950/60 px-3 py-1.5 text-xs font-bold text-brand-700 dark:text-brand-300 border border-brand-200 dark:border-brand-800 shadow-2xs hover:bg-brand-100"
          >
            <ShoppingCart className="h-4 w-4" />
            <span>Carrito ({itemCount})</span>
          </button>
        )}
      </div>

      {/* Notificación Toast flotante de Agregado al Carrito */}
      {addedToast && (
        <div className="mb-4 rounded-2xl bg-gray-900 dark:bg-brand-900 p-3.5 text-white shadow-xl flex items-center justify-between animate-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <Check className="h-5 w-5 text-green-400" />
            <span className="text-xs font-semibold">¡Prenda agregada a tu carrito!</span>
          </div>
          {onViewCart && (
            <button
              onClick={onViewCart}
              className="flex items-center gap-1 text-xs font-bold text-brand-300 hover:text-brand-200 underline ml-2"
            >
              <span>Ver Carrito</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}

      <div className="overflow-hidden rounded-3xl bg-white dark:bg-gray-900 p-6 shadow-sm border border-gray-100 dark:border-gray-800">
        <span className="text-[10px] font-bold uppercase tracking-wider text-brand-700 dark:text-brand-300 bg-brand-50 dark:bg-brand-950/60 px-2.5 py-1 rounded-md">
          {variant.producto.categoria}
        </span>
        <h3 className="mt-2 text-xl font-black text-gray-900 dark:text-gray-100 leading-tight">
          {variant.producto.nombre}
        </h3>
        {variant.producto.descripcion && (
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{variant.producto.descripcion}</p>
        )}

        {/* Foto de la prenda */}
        {variant.producto.imagenes && variant.producto.imagenes[0] && (
          <div className="my-3.5 h-52 w-full overflow-hidden rounded-2xl bg-gray-50 dark:bg-gray-950 border border-gray-100 dark:border-gray-800 shadow-sm">
            <img
              src={variant.producto.imagenes[0]}
              alt={variant.producto.nombre}
              className="h-full w-full object-cover"
            />
          </div>
        )}

        {/* Indicador de reingreso reciente por devolución (para staff) */}
        {isStaff && variant.ultimo_movimiento?.tipo === 'devolucion' && (
          <div className="my-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 p-2.5 flex items-center gap-2 text-xs text-emerald-800 dark:text-emerald-300">
            <PackagePlus className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <div>
              <span className="font-bold">Mercadería reincorporada por Devolución</span>
              <span className="block text-[11px] text-emerald-700 dark:text-emerald-400 mt-0.5">
                +{variant.ultimo_movimiento.cantidad} u. repuesta el {new Date(variant.ultimo_movimiento.fecha).toLocaleString('es-AR')}
              </span>
            </div>
          </div>
        )}

        {/* Atributos: Talle, Color, SKU */}
        <div className="grid grid-cols-2 gap-2 my-4 text-xs">
          <div className="rounded-2xl bg-gray-50 dark:bg-gray-800/60 p-3 border border-gray-100 dark:border-gray-700">
            <span className="text-[10px] uppercase font-bold text-gray-400 block">Talle</span>
            <span className="text-sm font-black text-gray-800 dark:text-gray-100">{variant.talle || 'Único'}</span>
          </div>
          <div className="rounded-2xl bg-gray-50 dark:bg-gray-800/60 p-3 border border-gray-100 dark:border-gray-700">
            <span className="text-[10px] uppercase font-bold text-gray-400 block">Color</span>
            <span className="text-sm font-black text-gray-800 dark:text-gray-100">{variant.color || 'Estándar'}</span>
          </div>
          <div className="col-span-2 rounded-2xl bg-gray-50 dark:bg-gray-800/60 p-2.5 border border-gray-100 dark:border-gray-700 flex justify-between items-center">
            <div>
              <span className="text-[10px] text-gray-400 uppercase font-semibold block">SKU</span>
              <span className="font-mono text-xs font-bold text-gray-800 dark:text-gray-200">{variant.sku}</span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-gray-400 uppercase font-semibold block">Código</span>
              <span className="font-mono text-xs text-gray-600 dark:text-gray-300">{variant.codigo}</span>
            </div>
          </div>
        </div>

        {/* Disponibilidad y Precio */}
        <div className="mt-2 pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-gray-400 block font-semibold uppercase">Precio Final (IVA inc.)</span>
            <span className="text-2xl font-black text-gray-900 dark:text-white">
              ${variant.precio.toLocaleString('es-AR')} ARS
            </span>
          </div>

          <div>
            {isStaff ? (
              <span className="text-xs font-mono font-bold rounded-xl bg-gray-100 dark:bg-gray-800 px-3 py-1.5 text-gray-700 dark:text-gray-200">
                Stock: {variant.stock_actual} u.
              </span>
            ) : (
              <span
                className={`text-xs font-bold px-3 py-1.5 rounded-full ${
                  variant.disponibilidad === 'Disponible'
                    ? 'bg-green-100 dark:bg-green-950/60 text-green-800 dark:text-green-300'
                    : variant.disponibilidad === 'Últimas unidades'
                    ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300'
                    : 'bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-300'
                }`}
              >
                {variant.disponibilidad}
              </span>
            )}
          </div>
        </div>

        {/* Selector de Cantidad y Botón de Carrito */}
        {!isOutOfStock ? (
          <div className="mt-5 space-y-3">
            <div className="flex items-center justify-between rounded-2xl bg-gray-50 dark:bg-gray-800/80 p-2 border border-gray-100 dark:border-gray-700">
              <span className="text-xs font-bold text-gray-700 dark:text-gray-300 ml-2">Cantidad:</span>
              <div className="flex items-center rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-0.5 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 active:scale-95"
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <span className="w-9 text-center text-xs font-bold text-gray-900 dark:text-white">{quantity}</span>
                <button
                  type="button"
                  onClick={() => setQuantity((q) => q + 1)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 active:scale-95"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <button
              onClick={handleAdd}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-600 py-4 text-sm font-bold text-white shadow-lg shadow-brand-500/25 transition hover:bg-brand-700 active:scale-95"
            >
              <ShoppingCart className="h-5 w-5" />
              <span>Agregar al Carrito • ${(variant.precio * quantity).toLocaleString('es-AR')}</span>
            </button>
          </div>
        ) : (
          <div className="mt-5 rounded-2xl bg-red-50 dark:bg-red-950/60 p-3 text-center text-xs font-semibold text-red-700 dark:text-red-300 border border-red-100 dark:border-red-900">
            Prenda momentáneamente agotada
          </div>
        )}
      </div>
    </div>
  );
};
