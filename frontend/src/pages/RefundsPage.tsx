import React, { useState } from 'react';
import { Camera, Search, RotateCcw, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { ApiClient } from '../services/api';
import { QrScannerModal } from '../components/scanner/QrScannerModal';
import { useAuth } from '../context/AuthContext';

export const RefundsPage: React.FC = () => {
  const { isAdmin } = useAuth();
  const [scannerOpen, setScannerOpen] = useState(false);
  const [operationNumber, setOperationNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [eligibility, setEligibility] = useState<any | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Formulario de devolución
  const [selectedItems, setSelectedItems] = useState<{ [variantId: string]: number }>({});
  const [medio, setMedio] = useState<'efectivo' | 'transferencia' | 'cambio'>('efectivo');
  const [motivo, setMotivo] = useState('');
  const [sinComprobante, setSinComprobante] = useState(false);
  const [adminAuthId, setAdminAuthId] = useState('');

  const handleCheckEligibility = async (opNum: string) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);
    setEligibility(null);
    setSelectedItems({});

    try {
      const data = await ApiClient.get(`/refunds/check-eligibility/${encodeURIComponent(opNum)}`);
      setEligibility(data);
      setOperationNumber(opNum);
      if (!data.elegible) {
        setErrorMsg(data.motivo || 'Venta no elegible para devolución');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al validar la venta');
    } finally {
      setLoading(false);
    }
  };

  const handleItemQtyChange = (variantId: string, qty: number, maxQty: number) => {
    const validQty = Math.max(0, Math.min(qty, maxQty));
    setSelectedItems((prev) => ({
      ...prev,
      [variantId]: validQty,
    }));
  };

  const handleProcessRefund = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);

    const itemsToSend = Object.entries(selectedItems)
      .filter(([_, qty]) => qty > 0)
      .map(([variant_id, cantidad]) => ({ variant_id, cantidad }));

    if (itemsToSend.length === 0) {
      setErrorMsg('Debe seleccionar al menos un producto a devolver');
      return;
    }

    if (!motivo.trim() || motivo.trim().length < 4) {
      setErrorMsg('Debe indicar un motivo de al menos 4 caracteres');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        numero_operacion: eligibility.numero_operacion,
        items: itemsToSend,
        medio,
        motivo,
        sin_comprobante: sinComprobante,
        autorizado_por_id: sinComprobante && !isAdmin ? adminAuthId : undefined,
      };

      const result = await ApiClient.post('/refunds', payload);
      setSuccessMsg(result.mensaje || 'Devolución procesada y stock restituido.');
      setEligibility(null);
      setSelectedItems({});
      setMotivo('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al procesar la devolución');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-md p-4 pb-24">
      <div className="mb-4">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Registro de Devoluciones</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Plazo máximo permitido: <strong>3 días corridos</strong> desde la compra (RN-17). La
          unidad vuelve al stock al registrar la devolución (RN-09).
        </p>
      </div>

      {/* Buscar Comprobante */}
      <div className="space-y-2">
        <button
          onClick={() => setScannerOpen(true)}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gray-900 dark:bg-brand-600 py-3 text-sm font-semibold text-white shadow-sm transition active:scale-[0.98] hover:bg-gray-800 dark:hover:bg-brand-700"
        >
          <Camera className="h-5 w-5 text-brand-400 dark:text-white" />
          <span>Escanear Comprobante para Devolución</span>
        </button>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (operationNumber.trim()) handleCheckEligibility(operationNumber.trim());
          }}
          className="flex gap-2"
        >
          <input
            type="text"
            value={operationNumber}
            onChange={(e) => setOperationNumber(e.target.value)}
            placeholder="Nº Comprobante (VTA-2026...)"
            className="flex-1 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:border-brand-500 focus:outline-none transition-colors"
          />
          <button
            type="submit"
            disabled={loading || !operationNumber.trim()}
            className="rounded-xl bg-gray-800 dark:bg-gray-700 px-4 py-2 text-xs font-semibold text-white transition hover:bg-gray-700 dark:hover:bg-gray-600 disabled:opacity-50"
          >
            <Search className="h-4 w-4" />
          </button>
        </form>
      </div>

      {errorMsg && (
        <div className="mt-4 flex items-center gap-2 rounded-xl bg-red-50 dark:bg-red-950/60 p-3 text-xs text-red-700 dark:text-red-300 border border-red-100 dark:border-red-900">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="mt-4 flex items-center gap-2 rounded-xl bg-green-50 dark:bg-green-950/60 p-3 text-xs text-green-700 dark:text-green-300 border border-green-100 dark:border-green-900">
          <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Formulario de Devolución si es elegible */}
      {eligibility && eligibility.elegible && (
        <div className="mt-4 rounded-3xl bg-white dark:bg-gray-900 p-5 shadow-sm border border-gray-200 dark:border-gray-800">
          <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
            <div>
              <span className="text-xs font-mono font-bold text-gray-800 dark:text-gray-200 block">
                {eligibility.numero_operacion}
              </span>
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 block mt-0.5">
                Fecha de compra: {new Date(eligibility.fecha_venta).toLocaleDateString('es-AR')}
              </span>
            </div>
            <div className="rounded-full bg-green-100 dark:bg-green-950/60 border border-green-200 dark:border-green-800 px-3 py-1 text-xs font-bold text-green-800 dark:text-green-300">
              {Math.floor(eligibility.dias_transcurridos ?? 0)} de 3 día(s) transcurridos
            </div>
          </div>

          {/* Selección de ítems */}
          <div className="py-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2">
              Seleccionar Productos a Devolver
            </h4>
            <div className="space-y-2.5">
              {eligibility.items.map((it: any) => {
                const max = it.cantidad_disponible_devolucion;
                const current = selectedItems[it.variant_id] || 0;

                return (
                  <div
                    key={it.variant_id}
                    className="flex items-center justify-between rounded-xl bg-gray-50 dark:bg-gray-800/60 p-3 text-xs border border-gray-100 dark:border-gray-700/60"
                  >
                    <div className="pr-2">
                      <span className="font-semibold text-gray-900 dark:text-gray-100 block leading-tight">
                        {it.descripcion}
                      </span>
                      <span className="text-[10px] text-gray-500 dark:text-gray-400 font-mono">
                        Compradas: {it.cantidad_original} | Reintegrables: {max}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min="0"
                        max={max}
                        value={current}
                        onChange={(e) =>
                          handleItemQtyChange(it.variant_id, parseInt(e.target.value, 10) || 0, max)
                        }
                        className="w-14 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 p-1.5 text-center text-sm font-bold text-gray-900 dark:text-gray-100 focus:outline-none focus:border-brand-500"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Medio de reintegro */}
          <div className="mt-2 space-y-3">
            <div>
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block mb-1">
                Medio de Reintegro / Solución
              </label>
              <select
                value={medio}
                onChange={(e: any) => setMedio(e.target.value)}
                className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 p-2.5 text-xs text-gray-900 dark:text-gray-100 focus:outline-none focus:border-brand-500"
              >
                <option value="efectivo" className="text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800">Efectivo</option>
                <option value="transferencia" className="text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800">Transferencia</option>
                <option value="cambio" className="text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800">Cambio por otra prenda / producto</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block mb-1">
                Motivo de la Devolución (Obligatorio)
              </label>
              <input
                type="text"
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Ej: Cambio de talle, falla de costura..."
                className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 p-2.5 text-xs text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-brand-500"
              />
            </div>

            {/* Checkbox de devolución sin comprobante (RN-19) */}
            <div className="rounded-xl bg-amber-50 dark:bg-amber-950/40 p-3 border border-amber-200 dark:border-amber-900/60">
              <label className="flex items-center gap-2 text-xs font-medium text-amber-900 dark:text-amber-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={sinComprobante}
                  onChange={(e) => setSinComprobante(e.target.checked)}
                  className="rounded text-brand-600 focus:ring-0"
                />
                <span>El cliente no presenta comprobante físico/digital</span>
              </label>

              {sinComprobante && !isAdmin && (
                <div className="mt-2 pt-2 border-t border-amber-200/60 dark:border-amber-900/40">
                  <span className="text-[11px] text-amber-800 dark:text-amber-300 block mb-1">
                    Requiere autorización de Administrador (RN-19):
                  </span>
                  <input
                    type="text"
                    value={adminAuthId}
                    onChange={(e) => setAdminAuthId(e.target.value)}
                    placeholder="ID o token de administrador autorizador"
                    className="w-full rounded-lg border border-amber-300 dark:border-amber-700 bg-white dark:bg-gray-800 p-2 text-xs text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none"
                  />
                </div>
              )}
            </div>

            <button
              onClick={handleProcessRefund}
              disabled={submitting}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-600 py-3.5 text-sm font-bold text-white shadow-md transition hover:bg-brand-700 active:scale-95 disabled:opacity-50"
            >
              <RotateCcw className="h-5 w-5" />
              <span>{submitting ? 'Procesando...' : 'Confirmar Devolución y Reponer Stock'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Modal de Escáner QR */}
      <QrScannerModal
        isOpen={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScan={handleCheckEligibility}
        title="Escanear Comprobante para Devolución"
        placeholderManual="Número de comprobante..."
      />
    </div>
  );
};
