import React, { useState } from 'react';
import { Camera, Search, CheckCircle2, AlertTriangle, PackageCheck } from 'lucide-react';
import { ApiClient } from '../services/api';
import { QrScannerModal } from '../components/scanner/QrScannerModal';

export const DeliveryPage: React.FC = () => {
  const [scannerOpen, setScannerOpen] = useState(false);
  const [operationNumber, setOperationNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [saleData, setSaleData] = useState<any | null>(null);

  const handleVerify = async (opNumber: string) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);
    try {
      const receipt = await ApiClient.get(`/sales/receipt/${encodeURIComponent(opNumber)}`);
      setSaleData(receipt);
      setOperationNumber(opNumber);
    } catch (err: any) {
      setErrorMsg(err.message || 'No se encontró ninguna venta con ese número de operación');
      setSaleData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmDelivery = async () => {
    if (!saleData) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const result = await ApiClient.post('/sales/verify-delivery', {
        numero_operacion: saleData.numero_operacion,
      });
      setSuccessMsg(result.message || 'Venta entregada exitosamente');
      setSaleData({ ...saleData, estado: 'entregada' });
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al registrar la entrega');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-md p-4 pb-24">
      <div className="mb-4">
        <h2 className="text-xl font-bold text-gray-900">Verificación y Entrega</h2>
        <p className="text-xs text-gray-500">
          Escanea el código QR del comprobante del cliente para autorizar la entrega de mercadería.
        </p>
      </div>

      {/* Botón de Escáner y Formulario de Búsqueda */}
      <div className="space-y-2">
        <button
          onClick={() => setScannerOpen(true)}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gray-900 py-3.5 text-sm font-semibold text-white shadow-sm transition active:scale-[0.98]"
        >
          <Camera className="h-5 w-5 text-brand-400" />
          <span>Escanear QR de Comprobante</span>
        </button>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (operationNumber.trim()) handleVerify(operationNumber.trim());
          }}
          className="flex gap-2"
        >
          <input
            type="text"
            value={operationNumber}
            onChange={(e) => setOperationNumber(e.target.value)}
            placeholder="O ingresa el Nº (VTA-2026...)"
            className="flex-1 rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={loading || !operationNumber.trim()}
            className="rounded-xl bg-gray-800 px-4 py-2 text-xs font-semibold text-white transition hover:bg-gray-700 disabled:opacity-50"
          >
            <Search className="h-4 w-4" />
          </button>
        </form>
      </div>

      {errorMsg && (
        <div className="mt-4 flex items-center gap-2 rounded-xl bg-red-50 p-3 text-xs text-red-700">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="mt-4 flex items-center gap-2 rounded-xl bg-green-50 p-3 text-xs text-green-700">
          <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Resultado de la Venta */}
      {saleData && (
        <div className="mt-4 rounded-3xl bg-white p-5 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between border-b pb-3">
            <div>
              <span className="text-xs text-gray-400 block font-mono">
                {saleData.numero_operacion}
              </span>
              <span className="text-sm font-bold text-gray-900">
                Total: ${saleData.total.toLocaleString('es-AR')}
              </span>
            </div>
            <div>
              {saleData.estado === 'entregada' ? (
                <span className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-bold text-green-800">
                  Ya Entregada
                </span>
              ) : saleData.estado === 'pagada' ? (
                <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-bold text-blue-800">
                  Pagada (Lista para Entrega)
                </span>
              ) : (
                <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-800 capitalize">
                  {saleData.estado}
                </span>
              )}
            </div>
          </div>

          {/* Lista de Productos para control del vendedor */}
          <div className="py-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
              Productos a Entregar ({saleData.items.length})
            </h4>
            <div className="space-y-2">
              {saleData.items.map((it: any, idx: number) => (
                <div
                  key={idx}
                  className="flex items-center justify-between rounded-xl bg-gray-50 p-2.5 text-xs"
                >
                  <div>
                    <span className="font-semibold text-gray-900 block">{it.descripcion}</span>
                    <span className="text-[10px] text-gray-400 font-mono">SKU: {it.sku}</span>
                  </div>
                  <span className="rounded-lg bg-gray-900 px-2 py-1 text-xs font-bold text-white">
                    x{it.cantidad}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Botón de Entrega */}
          {saleData.estado === 'pagada' ? (
            <button
              onClick={handleConfirmDelivery}
              disabled={loading}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-600 py-3.5 text-sm font-bold text-white shadow-md shadow-brand-500/20 transition hover:bg-brand-700 active:scale-95"
            >
              <PackageCheck className="h-5 w-5" />
              <span>{loading ? 'Confirmando...' : 'Confirmar y Marcar Entrega'}</span>
            </button>
          ) : saleData.estado === 'entregada' ? (
            <div className="mt-2 rounded-xl bg-gray-100 py-3 text-center text-xs font-medium text-gray-500">
              Esta venta ya ha sido entregada y verificada
            </div>
          ) : (
            <div className="mt-2 rounded-xl bg-amber-50 p-3 text-center text-xs font-medium text-amber-800 border border-amber-200">
              Esta venta no está pagada. No se puede entregar la mercadería (RN-11).
            </div>
          )}
        </div>
      )}

      {/* Modal de Escáner QR */}
      <QrScannerModal
        isOpen={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScan={handleVerify}
        title="Escanear Comprobante de Venta"
        placeholderManual="Número de operación (VTA-...)"
      />
    </div>
  );
};
