import React from 'react';
import {
  ShoppingBag,
  Trash2,
  Plus,
  Minus,
  ArrowLeft,
  CheckCircle2,
  QrCode as QrIcon,
  Sparkles,
} from 'lucide-react';
import { useCart } from '../context/CartContext';

interface CustomerCartPageProps {
  onBackToCatalog: () => void;
}

export const CustomerCartPage: React.FC<CustomerCartPageProps> = ({ onBackToCatalog }) => {
  const {
    items,
    updateQuantity,
    removeFromCart,
    clearCart,
    total,
    itemCount,
    activeOrder,
    createOrder,
    clearOrder,
  } = useCart();

  // Si el cliente tiene un pedido activo confirmado
  if (activeOrder) {
    const qrDataUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
      activeOrder.orderNumber
    )}`;

    return (
      <div className="mx-auto max-w-md p-4 pb-24 animate-in fade-in">
        <div className="rounded-3xl bg-white dark:bg-gray-900 p-6 shadow-sm border border-gray-100 dark:border-gray-800 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 mb-3">
            <CheckCircle2 className="h-8 w-8 text-brand-600 dark:text-brand-400" />
          </div>

          <h2 className="text-xl font-black text-gray-900 dark:text-gray-100">¡Pedido Generado!</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Acercate al mostrador o mostrale esta pantalla al vendedor para pagar y retirar tus prendas.
          </p>

          <div className="my-5 rounded-2xl bg-gray-50 dark:bg-gray-800/60 p-4 border border-gray-100 dark:border-gray-700">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 block">
              Código de Pedido
            </span>
            <span className="text-xl font-black tracking-widest text-brand-700 dark:text-brand-400 font-mono block mt-1">
              {activeOrder.orderNumber}
            </span>

            {/* QR del Pedido para que el vendedor lo lea con la tablet */}
            <div className="my-3 flex justify-center">
              <img
                src={qrDataUrl}
                alt={`QR ${activeOrder.orderNumber}`}
                className="h-44 w-44 rounded-xl bg-white p-2 shadow-sm border border-gray-200"
              />
            </div>

            <span className="text-[11px] text-gray-500 dark:text-gray-400 block">
              El vendedor puede escanear este QR o ingresar el código en su tablet.
            </span>
          </div>

          {/* Detalle del Pedido */}
          <div className="text-left border-t border-gray-100 dark:border-gray-800 pt-4 mb-4">
            <h4 className="text-xs font-bold uppercase text-gray-400 dark:text-gray-500 mb-2">Detalle de tus prendas</h4>
            <div className="space-y-2">
              {activeOrder.items.map((it) => (
                <div key={it.variant_id} className="flex justify-between text-xs py-1 border-b border-gray-50 dark:border-gray-800">
                  <div>
                    <span className="font-bold text-gray-800 dark:text-gray-200">{it.producto_nombre}</span>
                    <span className="text-[11px] text-gray-500 dark:text-gray-400 block">
                      Talle: {it.talle || '-'} • Color: {it.color || '-'} • {it.cantidad} u.
                    </span>
                  </div>
                  <span className="font-bold text-gray-900 dark:text-white">
                    ${(it.precio * it.cantidad).toLocaleString('es-AR')}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-3 flex justify-between items-center text-sm font-black text-gray-900 dark:text-white pt-2 border-t border-gray-100 dark:border-gray-800">
              <span>Total a Pagar (ARS):</span>
              <span className="text-brand-700 dark:text-brand-400 text-lg">
                ${activeOrder.total.toLocaleString('es-AR')}
              </span>
            </div>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 text-center">
              Aceptamos Efectivo, Transferencia, Posnet o Mercado Pago en el local.
            </p>
          </div>

          <div className="space-y-2">
            <button
              onClick={clearOrder}
              className="w-full rounded-2xl bg-gray-900 dark:bg-brand-600 py-3 text-xs font-bold text-white hover:bg-gray-800 dark:hover:bg-brand-700 transition"
            >
              Hacer una Nueva Compra
            </button>
            <button
              onClick={onBackToCatalog}
              className="w-full rounded-2xl py-2 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
            >
              Volver al Catálogo
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Carrito vacío
  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-md p-4 pb-24 text-center">
        <div className="rounded-3xl bg-white dark:bg-gray-900 p-8 shadow-sm border border-gray-100 dark:border-gray-800 mt-6">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-50 dark:bg-gray-800 text-gray-400 mb-4">
            <ShoppingBag className="h-8 w-8 text-gray-300 dark:text-gray-600" />
          </div>
          <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">Tu carrito está vacío</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-xs mx-auto">
            Escaneá el código QR de cualquier prenda en el local o explorá nuestro catálogo para agregarla a tu compra.
          </p>

          <button
            onClick={onBackToCatalog}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-600 py-3.5 text-xs font-bold text-white shadow-md shadow-brand-500/20 hover:bg-brand-700 transition"
          >
            <Sparkles className="h-4 w-4" />
            <span>Ver Catálogo de Productos</span>
          </button>
        </div>
      </div>
    );
  }

  // Carrito con productos
  return (
    <div className="mx-auto max-w-md p-4 pb-28 animate-in fade-in">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <button
            onClick={onBackToCatalog}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 shadow-sm"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Mi Carrito</h2>
            <span className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">
              {itemCount} {itemCount === 1 ? 'prenda seleccionada' : 'prendas seleccionadas'}
            </span>
          </div>
        </div>

        <button
          onClick={clearCart}
          className="text-xs text-red-600 dark:text-red-400 font-semibold hover:underline"
        >
          Vaciar
        </button>
      </div>

      {/* Lista de Prendas en el Carrito */}
      <div className="space-y-3">
        {items.map((item) => (
          <div
            key={item.variant_id}
            className="rounded-2xl bg-white dark:bg-gray-900 p-4 shadow-sm border border-gray-100 dark:border-gray-800 flex items-center justify-between gap-3"
          >
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">
                {item.producto_nombre}
              </h4>
              <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                {item.talle && <span>Talle: <strong>{item.talle}</strong></span>}
                {item.color && <span>• Color: <strong>{item.color}</strong></span>}
              </div>
              <span className="text-xs font-black text-brand-700 dark:text-brand-400 mt-1 block">
                ${item.precio.toLocaleString('es-AR')} ARS
              </span>
            </div>

            {/* Controles de Cantidad */}
            <div className="flex items-center gap-2">
              <div className="flex items-center rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-0.5">
                <button
                  onClick={() => updateQuantity(item.variant_id, item.cantidad - 1)}
                  className="flex h-7 w-7 items-center justify-center rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 shadow-2xs hover:bg-gray-100 dark:hover:bg-gray-600"
                >
                  <Minus className="h-3 w-3" />
                </button>
                <span className="w-8 text-center text-xs font-bold text-gray-900 dark:text-white">
                  {item.cantidad}
                </span>
                <button
                  onClick={() => updateQuantity(item.variant_id, item.cantidad + 1)}
                  disabled={item.cantidad >= item.stock_disponible}
                  className="flex h-7 w-7 items-center justify-center rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 shadow-2xs hover:bg-gray-100 dark:hover:bg-gray-600 disabled:opacity-40"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>

              <button
                onClick={() => removeFromCart(item.variant_id)}
                className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 transition"
                title="Eliminar del carrito"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Resumen y Botón de Confirmación */}
      <div className="mt-5 rounded-3xl bg-white dark:bg-gray-900 p-5 shadow-sm border border-gray-100 dark:border-gray-800 space-y-3">
        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>Subtotal</span>
          <span>${total.toLocaleString('es-AR')} ARS</span>
        </div>
        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>IVA e Impuestos</span>
          <span className="text-green-600 dark:text-green-400 font-medium">Incluidos</span>
        </div>
        <div className="border-t border-gray-100 dark:border-gray-800 pt-2 flex justify-between items-baseline">
          <span className="text-sm font-bold text-gray-800 dark:text-gray-200">Total a Pagar</span>
          <span className="text-2xl font-black text-brand-700 dark:text-brand-400">
            ${total.toLocaleString('es-AR')} ARS
          </span>
        </div>

        <button
          onClick={createOrder}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-600 py-4 text-sm font-bold text-white shadow-lg shadow-brand-500/25 hover:bg-brand-700 active:scale-95 transition"
        >
          <QrIcon className="h-5 w-5" />
          <span>Confirmar Pedido y Pagar en Caja</span>
        </button>

        <p className="text-[11px] text-gray-400 dark:text-gray-500 text-center leading-relaxed">
          Al confirmar, se generará tu pase con código QR para abonar en el mostrador por el medio que elijas.
        </p>
      </div>
    </div>
  );
};
