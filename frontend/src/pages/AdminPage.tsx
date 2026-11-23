import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Printer,
  FileSpreadsheet,
  Download,
  Upload,
  RefreshCw,
  CheckCircle,
} from 'lucide-react';
import { ApiClient } from '../services/api';

export const AdminPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'alerts' | 'labels' | 'imports' | 'adjust'>('alerts');

  // Estados Alertas
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loadingAlerts, setLoadingAlerts] = useState(false);

  // Estados Etiquetas
  const [outdatedLabels, setOutdatedLabels] = useState<any[]>([]);
  const [posicionInicial, setPosicionInicial] = useState<number>(1);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  // Estados Importación
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importReport, setImportReport] = useState<any | null>(null);

  // Cargar datos
  const fetchAlerts = async () => {
    setLoadingAlerts(true);
    try {
      const data = await ApiClient.get('/inventory/alerts?estado=activa');
      setAlerts(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAlerts(false);
    }
  };

  const fetchOutdatedLabels = async () => {
    try {
      const data = await ApiClient.get('/labels/outdated');
      setOutdatedLabels(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (activeTab === 'alerts') fetchAlerts();
    if (activeTab === 'labels') fetchOutdatedLabels();
  }, [activeTab]);

  // Generar y descargar PDF de etiquetas
  const handleDownloadLabelsPdf = async (variantIdsWithCopies: Array<{ variant_id: string; copias: number }>) => {
    setGeneratingPdf(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/labels/pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          posicion_inicial: posicionInicial,
          items: variantIdsWithCopies,
          marcar_impresas: true,
        }),
      });

      if (!response.ok) {
        throw new Error('Error al generar el PDF de etiquetas');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `etiquetas_a4_pos${posicionInicial}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      fetchOutdatedLabels();
    } catch (err: any) {
      alert(err.message || 'Error al generar PDF');
    } finally {
      setGeneratingPdf(false);
    }
  };

  // Subir archivo para importación
  const handleImportFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    setImporting(true);
    setImportReport(null);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const token = localStorage.getItem('token');
      const response = await fetch('/api/imports/upload', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || 'Error en la importación');
      }
      setImportReport(result);
      setSelectedFile(null);
    } catch (err: any) {
      alert(err.message || 'Error al procesar el archivo');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl p-4 pb-24">
      <div className="mb-4">
        <h2 className="text-xl font-bold text-gray-900">Panel de Administración</h2>
        <p className="text-xs text-gray-500">Gestión de alertas, etiquetas PDF e importación masiva.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto border-b border-gray-200 pb-2 mb-4">
        <button
          onClick={() => setActiveTab('alerts')}
          className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold whitespace-nowrap transition ${
            activeTab === 'alerts'
              ? 'bg-brand-600 text-white shadow-sm'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <AlertTriangle className="h-4 w-4" />
          <span>Alertas de Stock ({alerts.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('labels')}
          className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold whitespace-nowrap transition ${
            activeTab === 'labels'
              ? 'bg-brand-600 text-white shadow-sm'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <Printer className="h-4 w-4" />
          <span>Etiquetas A4</span>
        </button>

        <button
          onClick={() => setActiveTab('imports')}
          className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold whitespace-nowrap transition ${
            activeTab === 'imports'
              ? 'bg-brand-600 text-white shadow-sm'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <FileSpreadsheet className="h-4 w-4" />
          <span>Importación CSV/Excel</span>
        </button>
      </div>

      {/* TAB 1: Alertas de Stock Bajo (RF-14, RF-15) */}
      {activeTab === 'alerts' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">
              Variantes con existencias iguales o inferiores a su stock mínimo (umbral: 5).
            </span>
            <button onClick={fetchAlerts} className="p-1 text-gray-400 hover:text-gray-700">
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>

          {loadingAlerts ? (
            <p className="text-xs text-gray-400 py-6 text-center">Cargando alertas...</p>
          ) : alerts.length === 0 ? (
            <div className="rounded-2xl border border-gray-100 bg-white p-8 text-center text-gray-400">
              <CheckCircle className="mx-auto h-10 w-10 text-brand-500 mb-2" />
              <p className="text-sm font-semibold text-gray-800">Todo el inventario está en orden</p>
              <p className="text-xs mt-0.5">No hay variantes por debajo del stock mínimo.</p>
            </div>
          ) : (
            alerts.map((al) => (
              <div
                key={al.id}
                className="flex items-center justify-between rounded-2xl bg-white p-4 shadow-sm border border-red-100"
              >
                <div>
                  <span className="text-[10px] font-mono bg-red-50 text-red-700 px-1.5 py-0.5 rounded font-bold">
                    {al.variante.sku}
                  </span>
                  <h4 className="text-sm font-bold text-gray-900 mt-1">
                    {al.variante.producto_nombre} ({al.variante.talle || '-'} / {al.variante.color || '-'})
                  </h4>
                  <span className="text-xs text-red-600 font-semibold block mt-0.5">
                    Stock actual: {al.stock_actual} u. (Umbral alerta: {al.umbral} u.)
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB 2: Generador de Etiquetas A4 (RF-30, CP-19) */}
      {activeTab === 'labels' && (
        <div className="space-y-4">
          <div className="rounded-2xl bg-white p-4 shadow-sm border border-gray-100">
            <h3 className="text-sm font-bold text-gray-900 mb-2">Configuración de Hoja A4</h3>
            <p className="text-xs text-gray-500 mb-3">
              Formato: 24 etiquetas autoadhesivas precortadas (70×37 mm, 3 columnas × 8 filas).
            </p>

            <div className="flex items-center gap-3">
              <label className="text-xs font-semibold text-gray-700">
                Posición inicial en la hoja (1 a 24):
              </label>
              <input
                type="number"
                min="1"
                max="24"
                value={posicionInicial}
                onChange={(e) => setPosicionInicial(parseInt(e.target.value, 10) || 1)}
                className="w-16 rounded-xl border border-gray-300 p-2 text-center text-sm font-bold text-gray-900 focus:outline-none"
              />
            </div>
            <p className="text-[11px] text-gray-400 mt-1">
              Permite aprovechar hojas que ya tienen etiquetas usadas (CP-19).
            </p>
          </div>

          {/* Etiquetas desactualizadas por cambio de precio */}
          <div className="rounded-2xl bg-white p-4 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-600">
                Etiquetas a Reimprimir por cambio de precio ({outdatedLabels.length})
              </h4>
              {outdatedLabels.length > 0 && (
                <button
                  onClick={() =>
                    handleDownloadLabelsPdf(
                      outdatedLabels.map((ol) => ({ variant_id: ol.id, copias: 1 }))
                    )
                  }
                  disabled={generatingPdf}
                  className="flex items-center gap-1.5 rounded-xl bg-brand-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-brand-700 disabled:opacity-50"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>{generatingPdf ? 'Generando...' : 'Imprimir Todas'}</span>
                </button>
              )}
            </div>

            {outdatedLabels.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">
                No hay etiquetas pendientes de reimpresión.
              </p>
            ) : (
              <div className="space-y-2">
                {outdatedLabels.map((ol) => (
                  <div
                    key={ol.id}
                    className="flex items-center justify-between rounded-xl bg-amber-50/50 p-2.5 text-xs border border-amber-100"
                  >
                    <div>
                      <span className="font-semibold text-gray-800 block">
                        {ol.producto_nombre} ({ol.talle || '-'} / {ol.color || '-'})
                      </span>
                      <span className="text-[10px] text-gray-400 font-mono">
                        SKU: {ol.sku} | Nuevo precio: ${ol.precio.toLocaleString('es-AR')}
                      </span>
                    </div>
                    <button
                      onClick={() =>
                        handleDownloadLabelsPdf([{ variant_id: ol.id, copias: 1 }])
                      }
                      className="rounded-lg bg-gray-900 px-2.5 py-1 text-[11px] font-semibold text-white"
                    >
                      Imprimir
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: Importador Masivo CSV / Excel (RF-31, CA-18) */}
      {activeTab === 'imports' && (
        <div className="space-y-4">
          <form
            onSubmit={handleImportFile}
            className="rounded-2xl bg-white p-5 shadow-sm border border-gray-100"
          >
            <h3 className="text-sm font-bold text-gray-900 mb-1">
              Importar Catálogo e Inventario Inicial
            </h3>
            <p className="text-xs text-gray-500 mb-4">
              Sube un archivo <code>.csv</code> o <code>.xlsx</code> con columnas:{' '}
              <em>categoria, producto, sku, talle, color, precio, stock_actual</em>.
            </p>

            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              className="w-full text-xs text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100"
            />

            <button
              type="submit"
              disabled={importing || !selectedFile}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 py-3 text-xs font-bold text-white shadow-md transition hover:bg-brand-700 disabled:opacity-50"
            >
              <Upload className="h-4 w-4" />
              <span>{importing ? 'Procesando archivo...' : 'Comenzar Importación'}</span>
            </button>
          </form>

          {/* Reporte de Resultados */}
          {importReport && (
            <div className="rounded-2xl bg-white p-5 shadow-sm border border-gray-100">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-800 mb-2">
                Resultado de la Importación
              </h4>
              <p className="text-xs text-gray-600">{importReport.mensaje}</p>

              <div className="mt-3 grid grid-cols-2 gap-2 text-center text-xs">
                <div className="rounded-xl bg-green-50 p-2.5 font-bold text-green-700">
                  Correctas: {importReport.job.filas_correctas}
                </div>
                <div className="rounded-xl bg-red-50 p-2.5 font-bold text-red-700">
                  Con error: {importReport.job.filas_con_error}
                </div>
              </div>

              {importReport.job.detalle_errores?.length > 0 && (
                <div className="mt-3">
                  <span className="text-[11px] font-bold text-red-800 block mb-1">
                    Detalle de errores (filas omitidas):
                  </span>
                  <div className="max-h-40 overflow-y-auto space-y-1 text-[11px]">
                    {importReport.job.detalle_errores.map((err: any, idx: number) => (
                      <div key={idx} className="rounded-lg bg-red-50/70 p-2 text-red-700">
                        <strong>Fila {err.fila}:</strong> {err.motivo}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
