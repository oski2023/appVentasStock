import React, { useState } from 'react';
import { Clock, Trash2, Camera, AlertCircle, CheckCircle2 } from 'lucide-react';
import { ApiClient } from '../services/api';
import { QrScannerModal } from '../components/scanner/QrScannerModal';

export const DeferredSalePage: React.FC = () => {
  const [fechaReal, setFechaReal] = useState(() => {
    // Inicializar con la fecha/hora local actual en formato input datetime-local
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  });

  const [items, setItems] = useState<Array<{ variant_id: string; sku: string; nombre: string; cantidad: number; precio: number }>>([]);
  const [medio, setMedio] = useState<'efectivo' | 'transferencia' | 'posnet'>('efectivo');
  const [referencia, setReferencia] = useState('');
  const [scannerOpen, setScannerOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleAddItemByCode = async (code: string) => {
    setErrorMsg(null);
    try {
      const variant = await ApiClient.get(`/catalog/variants/by-code/${encodeURIComponent(code)}`);
      setItems((prev) => {
        const exists = prev.find((it) => it.variant_id === variant.id);
        if (exists) {
          return prev.map((it) =>
            it.variant_id === variant.id ? { ...it, cantidad: it.cantidad + 1 } : it
          );
        }
        return [
          ...prev,
          {
            variant_id: variant.id,
            sku: variant.sku,
            nombre: `${variant.producto.nombre} (${variant.talle || '-'})`,
            cantidad: 1,
            precio: variant.precio,
          },
        ];
      });
    } catch (err: any) {
      setErrorMsg(err.message || 'Variante no encontrada');
    }
  };

  const handleRemoveItem = (id: string) => {
    setItems((prev) => prev.filter((it) => it.variant_id !== id));
  };

  const total = items.reduce((acc, it) => acc + it.precio * it.cantidad, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (items.length === 0) {
      setErrorMsg('Debe agregar al menos un producto a la venta diferida');
      return;
    }

    setLoading(true);
    try {
      const isoDate = new Date(fechaReal).toISOString();
      const payload = {
        fecha_real: isoDate,
        items: items.map((it) => ({ variant_id: it.variant_id, cantidad: it.cantidad })),
        pago: {
          medio,
          referencia_externa: medio !== 'efectivo' ? referencia : undefined,
        },
      };

      const res = await ApiClient.post('/sales/deferred', payload);
      setSuccessMsg(
        `Venta diferida ${res.venta.numero_operacion} registrada con éxito. Fecha real guardada y stock descontado.`
      );
      setItems([]);
      setReferencia('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al registrar la venta diferida');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-md p-4 pb-24">
      <div className="mb-4">
        <div className="flex items-center gap-2">
          <Clock className="h-6 w-6 text-amber-600" />
          <h2 className="text-xl font-bold text-gray-900">Carga de Ventas Diferidas</h2>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Carga las ventas anotadas en la planilla de papel durante el corte de internet. Conserva la
          fecha/hora histórica real y descuenta el stock (RF-33, RN-18).
        </p>
      </div>

      {errorMsg && (
        <div className="mb-4 flex items-start gap-2 rounded-2xl bg-red-50 p-3.5 text-xs text-red-700 border border-red-200">
          <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <div>{errorMsg}</div>
        </div>
      )}

      {successMsg && (
        <div className="mb-4 flex items-center gap-2 rounded-2xl bg-green-50 p-3.5 text-xs text-green-700 border border-green-200">
          <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
          <div>{successMsg}</div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Fecha y Hora Real de la Venta */}
        <div className="rounded-2xl bg-white p-4 shadow-sm border border-gray-100">
          <label className="text-xs font-bold text-gray-700 block mb-1">
            Fecha y Hora Real de la Venta (según planilla)
          </label>
          <input
            type="datetime-local"
            value={fechaReal}
            onChange={(e) => setFechaReal(e.target.value)}
            className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 p-2.5 text-sm text-gray-900 dark:text-gray-100 focus:border-brand-500 focus:outline-none transition-colors"
            required
          />
        </div>

        {/* Productos */}
        <div className="rounded-2xl bg-white p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">
              Productos Anotados ({items.length})
            </span>
            <button
              type="button"
              onClick={() => setScannerOpen(true)}
              className="flex items-center gap-1 text-xs font-bold text-brand-600 hover:underline"
            >
              <Camera className="h-3.5 w-3.5" />
              <span>Escanear / Agregar</span>
            </button>
          </div>

          {items.length === 0 ? (
            <p className="text-center text-xs text-gray-400 py-4">
              Usa "Escanear / Agregar" para incorporar los productos anotados en la planilla.
            </p>
          ) : (
            <div className="space-y-2">
              {items.map((it) => (
                <div
                  key={it.variant_id}
                  className="flex items-center justify-between rounded-xl bg-gray-50 p-2.5 text-xs"
                >
                  <div className="pr-2">
                    <span className="font-semibold text-gray-800 block">{it.nombre}</span>
                    <span className="text-[10px] text-gray-400 font-mono">
                      {it.cantidad} x ${it.precio.toLocaleString('es-AR')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-900">
                      ${(it.cantidad * it.precio).toLocaleString('es-AR')}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(it.variant_id)}
                      className="p-1 text-gray-400 hover:text-red-500"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
              <div className="pt-2 border-t flex justify-between font-bold text-sm text-gray-900">
                <span>Total:</span>
                <span>${total.toLocaleString('es-AR')}</span>
              </div>
            </div>
          )}
        </div>

        {/* Medio de Pago Cobrado durante contingencia */}
        <div className="rounded-2xl bg-white p-4 shadow-sm border border-gray-100 space-y-3">
          <div>
            <label className="text-xs font-bold text-gray-700 block mb-1">
              Medio de Pago Cobrado
            </label>
            <select
              value={medio}
              onChange={(e: any) => setMedio(e.target.value)}
              className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 p-2.5 text-xs text-gray-900 dark:text-gray-100 focus:outline-none focus:border-brand-500"
            >
              <option value="efectivo" className="text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800">Efectivo</option>
              <option value="transferencia" className="text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800">Transferencia</option>
              <option value="posnet" className="text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800">Posnet (terminal física)</option>
            </select>
          </div>

          {medio !== 'efectivo' && (
            <div>
              <label className="text-xs font-bold text-gray-700 dark:text-gray-300 block mb-1">
                Número de comprobante / cupón anotado
              </label>
              <input
                type="text"
                value={referencia}
                onChange={(e) => setReferencia(e.target.value)}
                placeholder="Ej: Cupón Nº 12345"
                className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 p-2.5 text-xs text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-brand-500"
                required
              />
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={loading || items.length === 0}
          className="w-full rounded-2xl bg-amber-600 py-3.5 text-sm font-bold text-white shadow-md transition hover:bg-amber-700 disabled:opacity-50"
        >
          {loading ? 'Cargando venta...' : 'Registrar Venta Diferida'}
        </button>
      </form>

      <QrScannerModal
        isOpen={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScan={handleAddItemByCode}
        title="Agregar Producto a Venta Diferida"
      />
    </div>
  );
};
