import React, { useEffect, useState } from 'react';
import { CheckCircle, ArrowLeft, Clock, ShieldAlert } from 'lucide-react';
import { ApiClient } from '../services/api';
import { useAuth } from '../context/AuthContext';

interface ReceiptPageProps {
  receiptNumber: string;
  onBackToPos: () => void;
}

export const ReceiptPage: React.FC<ReceiptPageProps> = ({ receiptNumber, onBackToPos }) => {
  const { isStaff } = useAuth();
  const [receipt, setReceipt] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [markingDelivery, setMarkingDelivery] = useState(false);

  const fetchReceipt = async () => {
    try {
      const data = await ApiClient.get(`/sales/receipt/${receiptNumber}`);
      setReceipt(data);
    } catch (err: any) {
      setError(err.message || 'No se pudo cargar el comprobante');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReceipt();
  }, [receiptNumber]);

  const handleMarkDelivered = async () => {
    setMarkingDelivery(true);
    try {
      await ApiClient.post('/sales/verify-delivery', { numero_operacion: receiptNumber });
      await fetchReceipt();
    } catch (err: any) {
      alert(err.message || 'Error al marcar como entregada');
    } finally {
      setMarkingDelivery(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-sm text-gray-500">Cargando comprobante...</p>
      </div>
    );
  }

  if (error || !receipt) {
    return (
      <div className="p-6 text-center">
        <p className="text-sm text-red-600">{error || 'Comprobante no encontrado'}</p>
        <button
          onClick={onBackToPos}
          className="mt-4 rounded-xl bg-gray-900 px-4 py-2 text-sm text-white"
        >
          Volver
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md p-4 pb-24">
      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={onBackToPos}
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-white border border-gray-200 text-gray-700 shadow-sm"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h2 className="text-lg font-bold text-gray-900">Comprobante de Venta</h2>
      </div>

      <div className="overflow-hidden rounded-3xl bg-white p-6 shadow-md border border-gray-100 text-center">
        {/* Estado */}
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-100 text-brand-600 mb-3">
          <CheckCircle className="h-8 w-8" />
        </div>
        <h3 className="text-xl font-black text-gray-900">¡Venta Confirmada!</h3>
        <p className="text-xs text-gray-500 font-mono mt-0.5">{receipt.numero_operacion}</p>

        {/* Leyenda Fiscal Obligatoria (RF-21, CA-17) */}
        <div className="my-3 flex items-center justify-center gap-1.5 rounded-xl bg-amber-50 py-1.5 px-3 border border-amber-200 text-[11px] font-semibold text-amber-900">
          <ShieldAlert className="h-3.5 w-3.5 flex-shrink-0 text-amber-600" />
          <span>{receipt.leyenda_fiscal}</span>
        </div>

        {/* Código QR de Verificación (RF-21) */}
        <div className="my-4 flex flex-col items-center justify-center">
          <img
            src={receipt.qr_code}
            alt="QR de Comprobante"
            className="h-36 w-36 rounded-2xl border border-gray-200 p-1 shadow-sm"
          />
          <span className="text-[10px] text-gray-400 mt-1">
            Código QR de verificación para entrega y devoluciones
          </span>
        </div>

        {/* Detalle de Artículos */}
        <div className="border-t border-b border-gray-100 py-3 text-left">
          <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
            Detalle de Productos
          </h4>
          <div className="space-y-2">
            {receipt.items.map((item: any, idx: number) => (
              <div key={idx} className="flex justify-between items-start text-xs">
                <div className="pr-2">
                  <span className="font-semibold text-gray-800 block leading-tight">
                    {item.descripcion}
                  </span>
                  <span className="text-[10px] text-gray-500 font-mono">
                    {item.cantidad} x ${item.precio_unitario.toLocaleString('es-AR')}
                  </span>
                </div>
                <span className="font-bold text-gray-900 whitespace-nowrap">
                  ${item.subtotal.toLocaleString('es-AR')}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-3 pt-3 border-t border-dashed border-gray-200 flex justify-between items-center text-sm font-black text-gray-900">
            <span>TOTAL:</span>
            <span>${receipt.total.toLocaleString('es-AR')} {receipt.moneda}</span>
          </div>
        </div>

        {/* Medio de pago y Vuelto */}
        <div className="mt-3 text-left text-xs text-gray-600 space-y-1">
          {receipt.pagos.map((pago: any, pIdx: number) => (
            <div key={pIdx} className="bg-gray-50 rounded-xl p-2.5 border border-gray-100">
              <div className="flex justify-between font-medium">
                <span className="capitalize">Medio: {pago.medio}</span>
                <span>${pago.importe.toLocaleString('es-AR')}</span>
              </div>
              {pago.importe_recibido && (
                <div className="flex justify-between text-[11px] text-gray-500 mt-0.5">
                  <span>Recibido: ${pago.importe_recibido.toLocaleString('es-AR')}</span>
                  <span className="font-bold text-brand-600">
                    Vuelto: ${pago.vuelto.toLocaleString('es-AR')}
                  </span>
                </div>
              )}
              {pago.referencia && (
                <div className="text-[10px] text-gray-400 font-mono mt-0.5">
                  Ref: {pago.referencia}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Estado de entrega y botón para marcar si es Staff */}
        <div className="mt-4">
          {receipt.estado === 'entregada' ? (
            <div className="flex items-center justify-center gap-1.5 rounded-xl bg-green-50 py-2 text-xs font-bold text-green-700 border border-green-200">
              <CheckCircle className="h-4 w-4" />
              <span>Mercadería Entregada en Local</span>
            </div>
          ) : (
            isStaff && (
              <button
                onClick={handleMarkDelivered}
                disabled={markingDelivery}
                className="w-full rounded-2xl bg-brand-600 py-3 text-sm font-bold text-white shadow-md transition hover:bg-brand-700"
              >
                {markingDelivery ? 'Marcando...' : 'Marcar como Entregada'}
              </button>
            )
          )}
        </div>

        <div className="mt-4 text-[11px] text-gray-400 flex items-center justify-center gap-1">
          <Clock className="h-3 w-3" />
          <span>{new Date(receipt.fecha).toLocaleString('es-AR')}</span>
        </div>
      </div>

      <button
        onClick={onBackToPos}
        className="mt-4 w-full rounded-2xl bg-gray-900 py-3.5 text-sm font-bold text-white transition hover:bg-gray-800"
      >
        Nueva Venta
      </button>
    </div>
  );
};
