import React, { useEffect, useState } from 'react';
import {
  DollarSign,
  Building2,
  CreditCard,
  ShoppingBag,
  Receipt,
  Calendar,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  QrCode,
  CheckCircle2,
  Clock,
  ArrowRight,
  User,
} from 'lucide-react';
import { ApiClient } from '../services/api';

interface SaleItem {
  id: string;
  descripcion: string;
  sku: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
  codigo_variante?: string;
  talle?: string;
  color?: string;
}

interface SalePayment {
  id: string;
  medio: 'efectivo' | 'transferencia' | 'posnet' | 'billetera_virtual';
  importe: number;
  importe_recibido?: number | null;
  vuelto?: number;
  referencia_externa?: string;
  estado: string;
  fecha: string;
}

interface Sale {
  id: string;
  numero_operacion: string;
  canal: string;
  subtotal: number;
  total: number;
  moneda: string;
  estado: string;
  carga_diferida: boolean;
  fecha_real: string;
  created_at: string;
  entregada_en?: string | null;
  vendedor_nombre?: string;
  customer_nombre?: string;
  items: SaleItem[];
  pagos: SalePayment[];
}

interface CierreCaja {
  total_operaciones: number;
  total_general: number;
  total_efectivo: number;
  total_transferencia: number;
  total_posnet: number;
  efectivo_recibido: number;
  efectivo_vuelto: number;
}

interface SalesHistoryPageProps {
  onViewReceipt: (receiptNumber: string) => void;
  onNavigatePos: () => void;
}

export const SalesHistoryPage: React.FC<SalesHistoryPageProps> = ({
  onViewReceipt,
  onNavigatePos,
}) => {
  const [ventas, setVentas] = useState<Sale[]>([]);
  const [cierreCaja, setCierreCaja] = useState<CierreCaja>({
    total_operaciones: 0,
    total_general: 0,
    total_efectivo: 0,
    total_transferencia: 0,
    total_posnet: 0,
    efectivo_recibido: 0,
    efectivo_vuelto: 0,
  });

  const [filterPeriod, setFilterPeriod] = useState<'hoy' | 'ayer' | 'semana' | 'todas'>('hoy');
  const [loading, setLoading] = useState(true);
  const [expandedSaleId, setExpandedSaleId] = useState<string | null>(null);

  const fetchSales = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();

      const now = new Date();
      if (filterPeriod === 'hoy') {
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
        params.set('desde', start.toISOString());
      } else if (filterPeriod === 'ayer') {
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0);
        const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59);
        params.set('desde', start.toISOString());
        params.set('hasta', end.toISOString());
      } else if (filterPeriod === 'semana') {
        const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        params.set('desde', start.toISOString());
      }

      params.set('limit', '50');

      const data = await ApiClient.get<{ ventas: Sale[]; cierre_caja: CierreCaja }>(
        `/sales?${params.toString()}`
      );

      if (data) {
        setVentas(data.ventas || []);
        if (data.cierre_caja) {
          setCierreCaja(data.cierre_caja);
        }
      }
    } catch (err) {
      console.error('Error al cargar ventas y cierre de caja:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSales();
  }, [filterPeriod]);

  const toggleExpand = (id: string) => {
    setExpandedSaleId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="p-4 pb-28 animate-in fade-in">
      {/* Encabezado y Acción de Recarga */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="text-xl font-black text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Receipt className="h-6 w-6 text-brand-600 dark:text-brand-400" />
            <span>Cierre de Caja & Ventas</span>
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Arqueo de cobros del local físico, auditoría y comprobantes emitidos.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchSales}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 shadow-2xs transition"
            title="Actualizar datos"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-brand-600' : ''}`} />
            <span>Actualizar</span>
          </button>

          <button
            onClick={onNavigatePos}
            className="flex items-center gap-1.5 rounded-xl bg-brand-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-brand-700 shadow-sm transition"
          >
            <DollarSign className="h-4 w-4" />
            <span>Ir a Cobrar (POS)</span>
          </button>
        </div>
      </div>

      {/* Selector de Período / Filtro Rápido */}
      <div className="no-scrollbar flex gap-1.5 overflow-x-auto pb-1 mb-4">
        {(
          [
            { id: 'hoy', label: 'Ventas de Hoy' },
            { id: 'ayer', label: 'Ayer' },
            { id: 'semana', label: 'Últimos 7 días' },
            { id: 'todas', label: 'Historial Completo' },
          ] as const
        ).map((item) => (
          <button
            key={item.id}
            onClick={() => setFilterPeriod(item.id)}
            className={`rounded-xl px-3.5 py-1.5 text-xs font-bold whitespace-nowrap transition ${
              filterPeriod === item.id
                ? 'bg-gray-900 dark:bg-brand-600 text-white shadow-xs'
                : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* ============================================================ */}
      {/* TARJETAS DE CIERRE / ARQUEO DE CAJA */}
      {/* ============================================================ */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-6">
        {/* Total General Facturado */}
        <div className="col-span-2 rounded-2xl bg-gradient-to-br from-brand-600 to-brand-800 p-4 text-white shadow-md">
          <span className="text-[11px] font-bold uppercase tracking-wider text-brand-100 block">
            Total General en Caja
          </span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-black tracking-tight">
              ${cierreCaja.total_general.toLocaleString('es-AR')}
            </span>
            <span className="rounded-lg bg-white/20 px-2 py-0.5 text-xs font-bold">
              {cierreCaja.total_operaciones} {cierreCaja.total_operaciones === 1 ? 'venta' : 'ventas'}
            </span>
          </div>
          <span className="text-[10px] text-brand-100 mt-1 block">
            Suma neta de todas las operaciones registradas en el período.
          </span>
        </div>

        {/* Total en Efectivo */}
        <div className="rounded-2xl bg-white dark:bg-gray-900 p-3.5 border border-gray-100 dark:border-gray-800 shadow-2xs">
          <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 mb-1">
            <DollarSign className="h-4 w-4" />
            <span className="text-[11px] font-bold uppercase">Efectivo en Caja</span>
          </div>
          <span className="text-lg font-black text-gray-900 dark:text-white block">
            ${cierreCaja.total_efectivo.toLocaleString('es-AR')}
          </span>
          {cierreCaja.efectivo_vuelto > 0 && (
            <span className="text-[10px] text-gray-400 dark:text-gray-500 block mt-0.5">
              Vueltos dados: ${cierreCaja.efectivo_vuelto.toLocaleString('es-AR')}
            </span>
          )}
        </div>

        {/* Total en Transferencias */}
        <div className="rounded-2xl bg-white dark:bg-gray-900 p-3.5 border border-gray-100 dark:border-gray-800 shadow-2xs">
          <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 mb-1">
            <Building2 className="h-4 w-4" />
            <span className="text-[11px] font-bold uppercase">Transferencias</span>
          </div>
          <span className="text-lg font-black text-gray-900 dark:text-white block">
            ${cierreCaja.total_transferencia.toLocaleString('es-AR')}
          </span>
          <span className="text-[10px] text-gray-400 dark:text-gray-500 block mt-0.5">
            Cobros por alias / CBU
          </span>
        </div>

        {/* Total en Posnet / Tarjetas */}
        <div className="col-span-2 sm:col-span-4 rounded-2xl bg-white dark:bg-gray-900 p-3.5 border border-gray-100 dark:border-gray-800 shadow-2xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400">
              <CreditCard className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase text-gray-500 dark:text-gray-400 block">
                Posnet / Tarjetas de Débito & Crédito
              </span>
              <span className="text-base font-black text-gray-900 dark:text-white">
                ${cierreCaja.total_posnet.toLocaleString('es-AR')} ARS
              </span>
            </div>
          </div>
          <span className="text-[11px] text-gray-400 dark:text-gray-500 hidden sm:block">
            Cobros verificados con número de cupón
          </span>
        </div>
      </div>

      {/* ============================================================ */}
      {/* LISTADO DETALLADO DE VENTAS */}
      {/* ============================================================ */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
          <span>Detalle de Ventas Registradas</span>
          <span className="rounded-full bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-xs text-gray-600 dark:text-gray-300 font-mono">
            {ventas.length}
          </span>
        </h3>
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center rounded-2xl border border-dashed border-gray-200 dark:border-gray-800">
          <p className="text-xs text-gray-400 animate-pulse">Cargando ventas y arqueo de caja...</p>
        </div>
      ) : ventas.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-800 p-8 text-center">
          <ShoppingBag className="mx-auto h-10 w-10 text-gray-300 dark:text-gray-600 mb-2" />
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
            No se registraron ventas en el período seleccionado
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            Usa el botón de arriba para cambiar el filtro a "Historial Completo" o cobra una nueva venta en el POS.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {ventas.map((venta) => {
            const isExpanded = expandedSaleId === venta.id;
            const primerPago = venta.pagos?.[0];
            const dateFormatted = new Date(venta.fecha_real).toLocaleString('es-AR', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <div
                key={venta.id}
                className="overflow-hidden rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm transition hover:shadow-md"
              >
                {/* Cabecera de la Tarjeta */}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-black text-brand-700 dark:text-brand-400">
                          {venta.numero_operacion}
                        </span>
                        {venta.carga_diferida && (
                          <span className="rounded bg-amber-100 dark:bg-amber-950/60 px-1.5 py-0.5 text-[10px] font-bold text-amber-800 dark:text-amber-300">
                            Carga diferida
                          </span>
                        )}
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            venta.estado === 'entregada'
                              ? 'bg-green-100 dark:bg-green-950/60 text-green-800 dark:text-green-300'
                              : venta.estado === 'cancelada'
                              ? 'bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-300'
                              : 'bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300'
                          }`}
                        >
                          {venta.estado.toUpperCase()}
                        </span>
                      </div>

                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5 text-gray-400" />
                          <span>{dateFormatted}</span>
                        </span>
                        {venta.vendedor_nombre && (
                          <span className="flex items-center gap-1">
                            <User className="h-3.5 w-3.5 text-gray-400" />
                            <span>Vendido por {venta.vendedor_nombre}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-gray-400 uppercase font-semibold block">Total</span>
                      <span className="text-lg font-black text-gray-900 dark:text-white">
                        ${venta.total.toLocaleString('es-AR')}
                      </span>
                    </div>
                  </div>

                  {/* Medio de Pago utilizado */}
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-gray-50 dark:border-gray-800 pt-2.5">
                    <div className="flex items-center gap-1.5 text-xs">
                      <span className="text-gray-400 font-medium">Cobrado en:</span>
                      <span className="font-bold text-gray-800 dark:text-gray-200 capitalize flex items-center gap-1">
                        {primerPago?.medio === 'efectivo' && <DollarSign className="h-3.5 w-3.5 text-emerald-600" />}
                        {primerPago?.medio === 'transferencia' && <Building2 className="h-3.5 w-3.5 text-blue-600" />}
                        {primerPago?.medio === 'posnet' && <CreditCard className="h-3.5 w-3.5 text-purple-600" />}
                        <span>{primerPago?.medio || 'Manual'}</span>
                      </span>

                      {primerPago?.medio === 'efectivo' && primerPago.vuelto > 0 && (
                        <span className="text-[11px] text-gray-500 dark:text-gray-400 font-mono">
                          (Recibido ${primerPago.importe_recibido?.toLocaleString('es-AR')} • Vuelto ${primerPago.vuelto.toLocaleString('es-AR')})
                        </span>
                      )}

                      {primerPago?.referencia_externa && (
                        <span className="text-[11px] text-gray-500 dark:text-gray-400 font-mono">
                          • Comprobante: {primerPago.referencia_externa}
                        </span>
                      )}
                    </div>

                    {/* Botón Ver Comprobante QR */}
                    <button
                      onClick={() => onViewReceipt(venta.numero_operacion)}
                      className="flex items-center gap-1 rounded-xl bg-gray-100 dark:bg-gray-800 px-3 py-1.5 text-xs font-bold text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 transition"
                      title="Abrir comprobante con QR"
                    >
                      <QrCode className="h-3.5 w-3.5 text-brand-600 dark:text-brand-400" />
                      <span>Ver Comprobante QR</span>
                    </button>
                  </div>
                </div>

                {/* Acordeón para ver los productos vendidos */}
                <div className="border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-950/40 px-4 py-2">
                  <button
                    onClick={() => toggleExpand(venta.id)}
                    className="flex w-full items-center justify-between text-xs font-semibold text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                  >
                    <span>
                      {isExpanded ? 'Ocultar prendas vendidas' : `Ver prendas vendidas (${venta.items?.length || 0})`}
                    </span>
                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>

                  {isExpanded && (
                    <div className="mt-2 space-y-1.5 pb-2 border-t border-gray-100 dark:border-gray-800 pt-2 animate-in fade-in">
                      {venta.items?.map((it) => (
                        <div
                          key={it.id}
                          className="flex items-center justify-between text-xs py-1 border-b border-gray-100/60 dark:border-gray-800/60 last:border-0"
                        >
                          <div>
                            <span className="font-bold text-gray-800 dark:text-gray-200">{it.descripcion}</span>
                            <div className="flex items-center gap-1.5 text-[11px] text-gray-500 dark:text-gray-400">
                              <span className="font-mono">{it.sku}</span>
                              {it.talle && <span>• Talle: {it.talle}</span>}
                              {it.color && <span>• Color: {it.color}</span>}
                              <span>• {it.cantidad} u.</span>
                            </div>
                          </div>
                          <span className="font-black text-gray-900 dark:text-white">
                            ${it.subtotal.toLocaleString('es-AR')}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
