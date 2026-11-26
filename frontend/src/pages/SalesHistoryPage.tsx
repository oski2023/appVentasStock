import React, { useEffect, useState } from 'react';
import {
  DollarSign,
  Building2,
  CreditCard,
  ShoppingBag,
  Receipt,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  QrCode,
  Clock,
  RotateCcw,
  PackagePlus,
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

interface RefundItem {
  variant_id: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
  producto_nombre?: string;
  sku?: string;
  codigo?: string;
  talle?: string;
  color?: string;
}

interface Refund {
  id: string;
  sale_id: string;
  numero_operacion: string;
  importe: number;
  medio: 'efectivo' | 'transferencia' | 'cambio';
  referencia_externa?: string;
  motivo: string;
  fecha: string;
  registrado_por_nombre: string;
  autorizado_por_nombre?: string;
  items: RefundItem[];
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
  // Devoluciones y Reintegros
  total_devoluciones: number;
  total_reintegros: number;
  reintegros_efectivo: number;
  reintegros_transferencia: number;
  cambios_prendas: number;
  // Saldos Netos
  total_neto: number;
  efectivo_neto_caja: number;
  transferencia_neta: number;
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
  const [devoluciones, setDevoluciones] = useState<Refund[]>([]);
  const [activeTab, setActiveTab] = useState<'ventas' | 'devoluciones'>('ventas');
  const [cierreCaja, setCierreCaja] = useState<CierreCaja>({
    total_operaciones: 0,
    total_general: 0,
    total_efectivo: 0,
    total_transferencia: 0,
    total_posnet: 0,
    efectivo_recibido: 0,
    efectivo_vuelto: 0,
    total_devoluciones: 0,
    total_reintegros: 0,
    reintegros_efectivo: 0,
    reintegros_transferencia: 0,
    cambios_prendas: 0,
    total_neto: 0,
    efectivo_neto_caja: 0,
    transferencia_neta: 0,
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

      const data = await ApiClient.get<{
        ventas: Sale[];
        devoluciones?: Refund[];
        cierre_caja: CierreCaja;
      }>(`/sales?${params.toString()}`);

      if (data) {
        setVentas(data.ventas || []);
        setDevoluciones(data.devoluciones || []);
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
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-5">
        {/* Total Neto Recaudado */}
        <div className="col-span-2 rounded-2xl bg-gradient-to-br from-brand-600 to-brand-800 p-4 text-white shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-brand-100 block">
              Recaudación Neta en Caja
            </span>
            <span className="rounded-lg bg-white/20 px-2 py-0.5 text-xs font-bold">
              {cierreCaja.total_operaciones} {cierreCaja.total_operaciones === 1 ? 'venta' : 'ventas'}
            </span>
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-black tracking-tight">
              ${cierreCaja.total_neto.toLocaleString('es-AR')}
            </span>
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[10px] text-brand-100">
            <span>Ventas brutas: ${cierreCaja.total_general.toLocaleString('es-AR')}</span>
            {cierreCaja.total_reintegros > 0 && (
              <span className="rounded bg-black/20 px-1.5 py-0.5 font-semibold text-rose-200">
                Reintegros: -${cierreCaja.total_reintegros.toLocaleString('es-AR')}
              </span>
            )}
          </div>
        </div>

        {/* Total en Efectivo Real en Mano */}
        <div className="rounded-2xl bg-white dark:bg-gray-900 p-3.5 border border-gray-100 dark:border-gray-800 shadow-2xs">
          <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 mb-1">
            <DollarSign className="h-4 w-4" />
            <span className="text-[11px] font-bold uppercase">Efectivo en Mano</span>
          </div>
          <span className="text-lg font-black text-gray-900 dark:text-white block">
            ${cierreCaja.efectivo_neto_caja.toLocaleString('es-AR')}
          </span>
          <div className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5 space-y-0.5">
            {cierreCaja.reintegros_efectivo > 0 ? (
              <span className="text-rose-500 dark:text-rose-400 block font-medium">
                Devuelto en efectivo: -${cierreCaja.reintegros_efectivo.toLocaleString('es-AR')}
              </span>
            ) : (
              <span>Sin salidas por devolución</span>
            )}
            {cierreCaja.efectivo_vuelto > 0 && (
              <span>Vueltos dados: ${cierreCaja.efectivo_vuelto.toLocaleString('es-AR')}</span>
            )}
          </div>
        </div>

        {/* Total en Transferencias Netas */}
        <div className="rounded-2xl bg-white dark:bg-gray-900 p-3.5 border border-gray-100 dark:border-gray-800 shadow-2xs">
          <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 mb-1">
            <Building2 className="h-4 w-4" />
            <span className="text-[11px] font-bold uppercase">Transferencias Netas</span>
          </div>
          <span className="text-lg font-black text-gray-900 dark:text-white block">
            ${cierreCaja.transferencia_neta.toLocaleString('es-AR')}
          </span>
          <div className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
            {cierreCaja.reintegros_transferencia > 0 ? (
              <span className="text-rose-500 dark:text-rose-400 font-medium">
                Reintegros transf: -${cierreCaja.reintegros_transferencia.toLocaleString('es-AR')}
              </span>
            ) : (
              <span>Cobros por alias / CBU</span>
            )}
          </div>
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

      {/* Banner Informativo si se registraron devoluciones en el período */}
      {cierreCaja.total_devoluciones > 0 && (
        <div className="mb-5 rounded-2xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/80 dark:bg-amber-950/30 p-3.5 flex items-start gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300">
            <RotateCcw className="h-4 w-4" />
          </div>
          <div className="flex-1 text-xs">
            <div className="flex items-center justify-between font-bold text-amber-900 dark:text-amber-200">
              <span>{cierreCaja.total_devoluciones} Devolución(es) registrada(s) en este período</span>
              <span className="font-mono text-rose-600 dark:text-rose-400 font-black">
                -${cierreCaja.total_reintegros.toLocaleString('es-AR')} ARS
              </span>
            </div>
            <p className="text-amber-800 dark:text-amber-300 mt-0.5 text-[11px]">
              La mercadería devuelta ya fue reingresada al stock. Salidas de caja:
              {cierreCaja.reintegros_efectivo > 0 && ` Efectivo -$${cierreCaja.reintegros_efectivo.toLocaleString('es-AR')}`}
              {cierreCaja.reintegros_transferencia > 0 && ` • Transferencias -$${cierreCaja.reintegros_transferencia.toLocaleString('es-AR')}`}
              {cierreCaja.cambios_prendas > 0 && ` • Cambios por otra prenda: $${cierreCaja.cambios_prendas.toLocaleString('es-AR')}`}
            </p>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* SELECTOR DE LISTAS: VENTAS VS DEVOLUCIONES */}
      {/* ============================================================ */}
      <div className="flex items-center justify-between mb-3 border-b border-gray-200 dark:border-gray-800 pb-2">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('ventas')}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition ${
              activeTab === 'ventas'
                ? 'bg-brand-600 text-white shadow-xs'
                : 'bg-transparent text-gray-500 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            <ShoppingBag className="h-3.5 w-3.5" />
            <span>Ventas Realizadas</span>
            <span className="ml-1 rounded-full bg-white/20 px-1.5 py-0.2 text-[10px] font-mono">
              {ventas.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('devoluciones')}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition ${
              activeTab === 'devoluciones'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-transparent text-gray-500 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Devoluciones & Reingresos</span>
            <span className="ml-1 rounded-full bg-white/20 px-1.5 py-0.2 text-[10px] font-mono">
              {devoluciones.length}
            </span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center rounded-2xl border border-dashed border-gray-200 dark:border-gray-800">
          <p className="text-xs text-gray-400 animate-pulse">Cargando datos de caja y operaciones...</p>
        </div>
      ) : activeTab === 'devoluciones' ? (
        /* ============================================================ */
        /* LISTADO DE DEVOLUCIONES Y REINGRESOS DE STOCK */
        /* ============================================================ */
        devoluciones.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-800 p-8 text-center">
            <RotateCcw className="mx-auto h-10 w-10 text-gray-300 dark:text-gray-600 mb-2" />
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              No se registraron devoluciones en este período
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              Todas las devoluciones procesadas desde la pestaña "Devoluciones" aparecerán aquí con el dinero reintegrado y el reingreso de mercadería.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {devoluciones.map((dev) => (
              <div
                key={dev.id}
                className="overflow-hidden rounded-2xl border border-amber-200/70 dark:border-amber-900/40 bg-white dark:bg-gray-900 shadow-2xs transition"
              >
                <div className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 dark:border-gray-800 pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-gray-900 dark:text-gray-100">
                          Devolución de Venta: {dev.numero_operacion}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          <PackagePlus className="h-3 w-3" />
                          <span>Mercadería Repuesta en Stock</span>
                        </span>
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-[11px] text-gray-500 dark:text-gray-400">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(dev.fecha).toLocaleString('es-AR')}
                        </span>
                        <span>• Registró: {dev.registrado_por_nombre}</span>
                        {dev.autorizado_por_nombre && (
                          <span>• Autorizó: {dev.autorizado_por_nombre}</span>
                        )}
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] font-bold uppercase text-rose-500 block">
                        Reintegro al Cliente
                      </span>
                      <span className="text-base sm:text-lg font-black text-rose-600 dark:text-rose-400">
                        -${dev.importe.toLocaleString('es-AR')} ARS
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                    <div className="text-xs">
                      <span className="font-semibold text-gray-700 dark:text-gray-300">Motivo: </span>
                      <span className="text-gray-600 dark:text-gray-400 italic">{dev.motivo}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs font-bold text-gray-700 dark:text-gray-300 capitalize">
                      <span className="text-gray-400 font-normal">Medio:</span>
                      <span className="rounded-md bg-gray-100 dark:bg-gray-800 px-2 py-0.5">
                        {dev.medio}
                      </span>
                      {dev.referencia_externa && (
                        <span className="font-mono text-[11px] text-gray-500">
                          (Ref: {dev.referencia_externa})
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Detalle de prendas reingresadas */}
                  {dev.items && dev.items.length > 0 && (
                    <div className="mt-3 rounded-xl bg-gray-50 dark:bg-gray-950/60 p-2.5 border border-gray-100 dark:border-gray-800">
                      <span className="text-[11px] font-bold text-gray-700 dark:text-gray-300 block mb-1">
                        Prendas reincorporadas al inventario:
                      </span>
                      <div className="space-y-1">
                        {dev.items.map((it, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between text-xs py-0.5"
                          >
                            <span className="text-gray-800 dark:text-gray-200">
                              <strong>+{it.cantidad} u.</strong> {it.producto_nombre || 'Producto'} {it.talle ? `(${it.talle})` : ''} {it.color ? `(${it.color})` : ''}
                            </span>
                            <span className="font-mono text-gray-600 dark:text-gray-400">
                              Subtotal: ${it.subtotal.toLocaleString('es-AR')}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        /* ============================================================ */
        /* LISTADO DE VENTAS REGISTRADAS */
        /* ============================================================ */
        ventas.length === 0 ? (
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

                      {primerPago?.medio === 'efectivo' && (primerPago.vuelto ?? 0) > 0 && (
                        <span className="text-[11px] text-gray-500 dark:text-gray-400 font-mono">
                          (Recibido ${primerPago.importe_recibido?.toLocaleString('es-AR')} • Vuelto ${primerPago.vuelto?.toLocaleString('es-AR')})
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
        )
      )}
    </div>
  );
};
