import React, { useState } from 'react';
import {
  Camera,
  Search,
  Plus,
  Minus,
  Trash2,
  DollarSign,
  CreditCard,
  Building2,
  AlertCircle,
  Receipt,
} from 'lucide-react';
import { ApiClient } from '../services/api';
import { QrScannerModal } from '../components/scanner/QrScannerModal';
import { useAuth } from '../context/AuthContext';

export interface CartItem {
  variant_id: string;
  sku: string;
  codigo: string;
  producto_nombre: string;
  modelo?: string;
  talle?: string;
  color?: string;
  precio: number;
  cantidad: number;
  stock_disponible: number;
}

interface PosPageProps {
  onSaleCompleted: (receiptNumber: string) => void;
  onNavigateLogin: () => void;
}

export const PosPage: React.FC<PosPageProps> = ({ onSaleCompleted, onNavigateLogin }) => {
  const { isStaff } = useAuth();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Estado de checkout y pago
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [medioPago, setMedioPago] = useState<'efectivo' | 'transferencia' | 'posnet'>('efectivo');
  const [importeRecibido, setImporteRecibido] = useState<string>('');
  const [referenciaExterna, setReferenciaExterna] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Agregar variante al carrito tras escaneo o búsqueda
  const handleAddItemByCode = async (code: string) => {
    setErrorMsg(null);
    setSearchLoading(true);
    try {
      const variant = await ApiClient.get(`/catalog/variants/by-code/${encodeURIComponent(code)}`);
      
      const stockDisp = variant.stock_actual !== undefined ? variant.stock_actual : 999;
      if (stockDisp <= 0) {
        setErrorMsg(`"${variant.producto.nombre}" (${variant.sku}) se encuentra sin stock.`);
        return;
      }

      setCart((prev) => {
        const existing = prev.find((item) => item.variant_id === variant.id);
        if (existing) {
          if (existing.cantidad + 1 > stockDisp) {
            setErrorMsg(`Stock máximo alcanzado para ${variant.sku} (disponibles: ${stockDisp})`);
            return prev;
          }
          return prev.map((item) =>
            item.variant_id === variant.id ? { ...item, cantidad: item.cantidad + 1 } : item
          );
        } else {
          return [
            ...prev,
            {
              variant_id: variant.id,
              sku: variant.sku,
              codigo: variant.codigo,
              producto_nombre: variant.producto.nombre,
              modelo: variant.modelo,
              talle: variant.talle,
              color: variant.color,
              precio: variant.precio,
              cantidad: 1,
              stock_disponible: stockDisp,
            },
          ];
        }
      });
      setSearchQuery('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Código o SKU no encontrado');
    } finally {
      setSearchLoading(false);
    }
  };

  const handleUpdateQuantity = (variantId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.variant_id === variantId) {
            const newQty = item.cantidad + delta;
            if (newQty <= 0) return null;
            if (newQty > item.stock_disponible) {
              setErrorMsg(`Stock máximo alcanzado (disponibles: ${item.stock_disponible})`);
              return item;
            }
            return { ...item, cantidad: newQty };
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const handleRemoveItem = (variantId: string) => {
    setCart((prev) => prev.filter((it) => it.variant_id !== variantId));
  };

  const total = cart.reduce((acc, it) => acc + it.precio * it.cantidad, 0);
  const recibidoNum = parseFloat(importeRecibido) || 0;
  const vuelto = medioPago === 'efectivo' && recibidoNum >= total ? recibidoNum - total : 0;

  const handleOpenCheckout = () => {
    if (!isStaff) {
      onNavigateLogin();
      return;
    }
    setImporteRecibido(total.toString());
    setReferenciaExterna('');
    setCheckoutModalOpen(true);
  };

  const handleConfirmSale = async () => {
    setErrorMsg(null);
    setSubmitting(true);
    try {
      const payload = {
        items: cart.map((it) => ({ variant_id: it.variant_id, cantidad: it.cantidad })),
        pago: {
          medio: medioPago,
          importe_recibido: medioPago === 'efectivo' ? recibidoNum : total,
          referencia_externa: medioPago !== 'efectivo' ? referenciaExterna : undefined,
        },
        marcar_entregada: true,
      };

      const result = await ApiClient.post('/sales/assisted', payload);
      setCart([]);
      setCheckoutModalOpen(false);
      onSaleCompleted(result.venta.numero_operacion);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al procesar la venta');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="pb-24 pt-2">
      {/* Barra de Acciones Superior: Escáner y Búsqueda */}
      <div className="px-4">
        <div className="flex gap-2">
          <button
            onClick={() => setScannerOpen(true)}
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-brand-600 px-4 py-3.5 text-white font-semibold shadow-md shadow-brand-500/20 transition active:scale-[0.98]"
          >
            <Camera className="h-5 w-5" />
            <span>Escanear QR</span>
          </button>
        </div>

        {/* Buscador de código o SKU */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (searchQuery.trim()) handleAddItemByCode(searchQuery.trim());
          }}
          className="mt-3 flex gap-2"
        >
          <div className="relative flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar SKU, código de variante..."
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 pl-9 text-sm focus:border-brand-500 focus:outline-none"
            />
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          </div>
          <button
            type="submit"
            disabled={searchLoading || !searchQuery.trim()}
            className="rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800 disabled:opacity-50"
          >
            {searchLoading ? '...' : 'Agregar'}
          </button>
        </form>

        {errorMsg && (
          <div className="mt-3 flex items-center gap-2 rounded-xl bg-red-50 p-3 text-xs text-red-700">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
      </div>

      {/* Lista del Carrito */}
      <div className="mt-4 px-4">
        <div className="flex items-center justify-between pb-2">
          <h2 className="text-sm font-bold text-gray-800">
            Productos en venta ({cart.reduce((a, b) => a + b.cantidad, 0)})
          </h2>
          {cart.length > 0 && (
            <button
              onClick={() => setCart([])}
              className="text-xs text-red-600 hover:underline"
            >
              Vaciar venta
            </button>
          )}
        </div>

        {cart.length === 0 ? (
          <div className="mt-6 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 p-8 text-center">
            <Camera className="h-10 w-10 text-gray-300 mb-2" />
            <p className="text-sm font-medium text-gray-600">El carrito de venta está vacío</p>
            <p className="mt-1 text-xs text-gray-400 max-w-xs">
              Usa el botón "Escanear QR" con la cámara de tu tablet o celular para agregar productos.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5 mt-2">
            {cart.map((item) => (
              <div
                key={item.variant_id}
                className="flex items-center justify-between rounded-2xl bg-white p-3.5 shadow-sm border border-gray-100"
              >
                <div className="flex-1 pr-2">
                  <h4 className="text-sm font-semibold text-gray-900 leading-tight">
                    {item.producto_nombre}
                  </h4>
                  <div className="mt-1 flex flex-wrap gap-1 text-[11px] text-gray-500">
                    <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                      {item.sku}
                    </span>
                    {item.talle && <span>Talle: {item.talle}</span>}
                    {item.color && <span>• {item.color}</span>}
                  </div>
                  <div className="mt-1.5 text-xs font-bold text-brand-700">
                    ${item.precio.toLocaleString('es-AR')} c/u
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2">
                  <div className="flex items-center gap-2 rounded-xl bg-gray-50 p-1 border border-gray-200">
                    <button
                      onClick={() => handleUpdateQuantity(item.variant_id, -1)}
                      className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-gray-700 shadow-sm transition active:scale-95"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="w-6 text-center text-sm font-bold">{item.cantidad}</span>
                    <button
                      onClick={() => handleUpdateQuantity(item.variant_id, 1)}
                      className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-gray-700 shadow-sm transition active:scale-95"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <button
                    onClick={() => handleRemoveItem(item.variant_id)}
                    className="p-1 text-gray-400 hover:text-red-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Resumen Fijo Inferior si hay items */}
      {cart.length > 0 && (
        <div className="fixed bottom-16 left-0 right-0 z-30 border-t border-gray-200 bg-white/95 p-4 shadow-lg backdrop-blur-md">
          <div className="mx-auto flex max-w-md items-center justify-between">
            <div>
              <span className="text-xs text-gray-500 block">Total a cobrar (ARS)</span>
              <span className="text-2xl font-black text-gray-900">
                ${total.toLocaleString('es-AR')}
              </span>
            </div>
            <button
              onClick={handleOpenCheckout}
              className="flex items-center gap-2 rounded-2xl bg-brand-600 px-6 py-3.5 text-base font-bold text-white shadow-lg shadow-brand-500/25 transition active:scale-95"
            >
              <DollarSign className="h-5 w-5" />
              <span>Cobrar</span>
            </button>
          </div>
        </div>
      )}

      {/* Modal de Cobro Manual */}
      {checkoutModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
            <h3 className="text-lg font-bold text-gray-900">Registrar Cobro Manual</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Total venta: <strong className="text-gray-800">${total.toLocaleString('es-AR')}</strong>
            </p>

            {/* Selector de medio de pago */}
            <div className="mt-4 grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setMedioPago('efectivo')}
                className={`flex flex-col items-center justify-center rounded-xl p-3 border text-xs font-semibold transition ${
                  medioPago === 'efectivo'
                    ? 'border-brand-600 bg-brand-50 text-brand-700'
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                <DollarSign className="h-5 w-5 mb-1" />
                <span>Efectivo</span>
              </button>
              <button
                type="button"
                onClick={() => setMedioPago('transferencia')}
                className={`flex flex-col items-center justify-center rounded-xl p-3 border text-xs font-semibold transition ${
                  medioPago === 'transferencia'
                    ? 'border-brand-600 bg-brand-50 text-brand-700'
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Building2 className="h-5 w-5 mb-1" />
                <span>Transferencia</span>
              </button>
              <button
                type="button"
                onClick={() => setMedioPago('posnet')}
                className={`flex flex-col items-center justify-center rounded-xl p-3 border text-xs font-semibold transition ${
                  medioPago === 'posnet'
                    ? 'border-brand-600 bg-brand-50 text-brand-700'
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                <CreditCard className="h-5 w-5 mb-1" />
                <span>Posnet</span>
              </button>
            </div>

            {/* Opciones según medio de pago */}
            {medioPago === 'efectivo' ? (
              <div className="mt-4 space-y-3">
                <div>
                  <label className="text-xs font-medium text-gray-700 block mb-1">
                    Importe Recibido ($)
                  </label>
                  <input
                    type="number"
                    value={importeRecibido}
                    onChange={(e) => setImporteRecibido(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 p-2.5 text-lg font-bold text-gray-900 focus:border-brand-500 focus:outline-none"
                    placeholder="Monto entregado por el cliente"
                  />
                </div>

                {/* Botones de denominaciones rápidas */}
                <div className="flex flex-wrap gap-1.5">
                  {[total, 5000, 10000, 20000, 50000].map((monto) => (
                    <button
                      key={monto}
                      type="button"
                      onClick={() => setImporteRecibido(monto.toString())}
                      className="rounded-lg bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-200"
                    >
                      ${monto.toLocaleString('es-AR')}
                    </button>
                  ))}
                </div>

                {/* Vuelto */}
                <div className="rounded-xl bg-gray-50 p-3 border border-gray-200 flex justify-between items-center">
                  <span className="text-xs font-medium text-gray-600">Vuelto a entregar:</span>
                  <span
                    className={`text-lg font-black ${
                      recibidoNum >= total ? 'text-brand-600' : 'text-red-500'
                    }`}
                  >
                    ${vuelto.toLocaleString('es-AR')}
                  </span>
                </div>
              </div>
            ) : (
              <div className="mt-4">
                <label className="text-xs font-medium text-gray-700 block mb-1">
                  Número de Comprobante / Cupón
                </label>
                <input
                  type="text"
                  value={referenciaExterna}
                  onChange={(e) => setReferenciaExterna(e.target.value)}
                  placeholder="Ej: Nº de operación bancaria o cupón posnet"
                  className="w-full rounded-xl border border-gray-300 p-2.5 text-sm focus:border-brand-500 focus:outline-none"
                />
              </div>
            )}

            {/* Botones de acción */}
            <div className="mt-6 flex gap-2">
              <button
                type="button"
                onClick={() => setCheckoutModalOpen(false)}
                className="flex-1 rounded-xl bg-gray-100 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-200"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmSale}
                disabled={
                  submitting ||
                  (medioPago === 'efectivo' && recibidoNum < total) ||
                  (medioPago !== 'efectivo' && !referenciaExterna.trim())
                }
                className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-brand-600 py-3 text-sm font-bold text-white transition hover:bg-brand-700 disabled:opacity-50"
              >
                <Receipt className="h-4 w-4" />
                <span>{submitting ? 'Registrando...' : 'Confirmar Cobro'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Escáner QR */}
      <QrScannerModal
        isOpen={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScan={handleAddItemByCode}
        title="Escanear Producto para Venta"
      />
    </div>
  );
};
