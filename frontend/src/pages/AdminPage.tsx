import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Printer,
  FileSpreadsheet,
  Download,
  Upload,
  RefreshCw,
  CheckCircle,
  PackagePlus,
  SlidersHorizontal,
  History,
  Plus,
  Edit2,
  Save,
  X,
  QrCode,
  Image as ImageIcon,
} from 'lucide-react';
import { ApiClient } from '../services/api';
import { parseCurrencyAr, formatCurrencyAr } from '../utils/currency';

export const AdminPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'alerts' | 'labels' | 'imports' | 'products' | 'adjust'>('alerts');

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

  // Estados Productos y Variantes
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [showNewProductModal, setShowNewProductModal] = useState(false);
  const [newProduct, setNewProduct] = useState({ category_id: 0, categoria_nombre: '', nombre: '', descripcion: '' });
  const [productImageFile, setProductImageFile] = useState<File | null>(null);
  const [productImagePreview, setProductImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [isCreatingNewCategory, setIsCreatingNewCategory] = useState(false);
  const [showNewVariantModal, setShowNewVariantModal] = useState(false);
  const [selectedProductForVariant, setSelectedProductForVariant] = useState<string | null>(null);
  const [createdVariantQr, setCreatedVariantQr] = useState<any | null>(null);
  const [newVariant, setNewVariant] = useState({
    sku: '',
    modelo: '',
    talle: '',
    color: '',
    precioInput: '',
    stock_actual: 0,
    stock_minimo: 5,
  });

  // Edición rápida de precio y visualización de variantes
  const [editingVariantId, setEditingVariantId] = useState<string | null>(null);
  const [editingPriceInput, setEditingPriceInput] = useState<string>('');
  const [expandedProductId, setExpandedProductId] = useState<string | null>(null);
  const [productVariantsMap, setProductVariantsMap] = useState<Record<string, any[]>>({});
  const [loadingVariants, setLoadingVariants] = useState(false);

  const handleToggleExpandProduct = async (productId: string) => {
    if (expandedProductId === productId) {
      setExpandedProductId(null);
      return;
    }
    setExpandedProductId(productId);
    if (!productVariantsMap[productId]) {
      setLoadingVariants(true);
      try {
        const prodData = await ApiClient.get(`/catalog/products/${productId}`);
        setProductVariantsMap((prev) => ({ ...prev, [productId]: prodData.variantes || [] }));
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingVariants(false);
      }
    }
  };

  // Estados Ajustes de Stock e Historial
  const [stockList, setStockList] = useState<any[]>([]);
  const [movements, setMovements] = useState<any[]>([]);
  const [loadingMovements, setLoadingMovements] = useState(false);
  const [adjustmentForm, setAdjustmentForm] = useState<{
    variant_id: string;
    tipo: 'ingreso' | 'egreso' | 'rotura' | 'ajuste';
    cantidad: number;
    motivo: string;
    referencia: string;
  }>({
    variant_id: '',
    tipo: 'ingreso',
    cantidad: 1,
    motivo: '',
    referencia: '',
  });
  const [submittingAdjustment, setSubmittingAdjustment] = useState(false);
  const [adjustmentSuccessMsg, setAdjustmentSuccessMsg] = useState<string | null>(null);

  // Cargar datos según tab activo
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

  const fetchProductsAndCategories = async () => {
    setLoadingProducts(true);
    try {
      const [prodsData, catsData] = await Promise.all([
        ApiClient.get('/catalog/products?limit=100'),
        ApiClient.get('/catalog/categories'),
      ]);
      setProducts(prodsData);
      setCategories(catsData);
      if (catsData.length > 0) {
        setNewProduct((prev) => ({ ...prev, category_id: catsData[0].id }));
        setIsCreatingNewCategory(false);
      } else {
        setIsCreatingNewCategory(true);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingProducts(false);
    }
  };

  const fetchStockAndMovements = async () => {
    setLoadingMovements(true);
    try {
      const [stockData, movsData] = await Promise.all([
        ApiClient.get('/inventory/stock?limit=100'),
        ApiClient.get('/inventory/movements?limit=30'),
      ]);
      setStockList(stockData);
      setMovements(movsData);
      if (stockData.length > 0 && !adjustmentForm.variant_id) {
        setAdjustmentForm((prev) => ({ ...prev, variant_id: stockData[0].id }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMovements(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'alerts') fetchAlerts();
    if (activeTab === 'labels') fetchOutdatedLabels();
    if (activeTab === 'products') fetchProductsAndCategories();
    if (activeTab === 'adjust') fetchStockAndMovements();
  }, [activeTab]);

  // Handlers Productos y Variantes
  const handleUploadProductImage = async (file: File): Promise<string | null> => {
    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await ApiClient.post<{ url: string }>('/catalog/upload-image', formData);
      return res.url;
    } catch (err: any) {
      alert(err.message || 'Error al subir la imagen');
      return null;
    } finally {
      setUploadingImage(false);
    }
  };

  const handleUpdateExistingProductImage = async (productId: string, file: File) => {
    const uploadedUrl = await handleUploadProductImage(file);
    if (!uploadedUrl) return;
    try {
      await ApiClient.put(`/catalog/products/${productId}`, {
        imagenes: [uploadedUrl],
      });
      fetchProductsAndCategories();
    } catch (err: any) {
      alert(err.message || 'Error al actualizar imagen del producto');
    }
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let imageUrls: string[] = [];
      if (productImageFile) {
        const uploadedUrl = await handleUploadProductImage(productImageFile);
        if (uploadedUrl) {
          imageUrls.push(uploadedUrl);
        }
      }

      const payload: any = {
        nombre: newProduct.nombre.trim(),
        descripcion: newProduct.descripcion?.trim() || undefined,
        imagenes: imageUrls,
      };

      if (isCreatingNewCategory || categories.length === 0) {
        if (!newProduct.categoria_nombre.trim()) {
          alert('Debe ingresar el nombre de la categoría');
          return;
        }
        payload.categoria_nombre = newProduct.categoria_nombre.trim();
      } else {
        payload.category_id = newProduct.category_id;
      }

      await ApiClient.post('/catalog/products', payload);
      setShowNewProductModal(false);
      setNewProduct({
        category_id: categories[0]?.id || 0,
        categoria_nombre: '',
        nombre: '',
        descripcion: '',
      });
      setProductImageFile(null);
      setProductImagePreview(null);
      fetchProductsAndCategories();
    } catch (err: any) {
      alert(err.message || 'Error al crear producto');
    }
  };

  const handleCreateVariant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductForVariant) return;

    const parsedPrice = parseCurrencyAr(newVariant.precioInput);
    if (parsedPrice <= 0) {
      alert('Debe ingresar un precio válido mayor a 0 (ej: 67.999 o 68000)');
      return;
    }

    try {
      const created = await ApiClient.post<any>(`/catalog/products/${selectedProductForVariant}/variants`, {
        sku: newVariant.sku.trim(),
        modelo: newVariant.modelo.trim() || undefined,
        talle: newVariant.talle.trim() || undefined,
        color: newVariant.color.trim() || undefined,
        precio: parsedPrice,
        stock_actual: newVariant.stock_actual,
        stock_minimo: newVariant.stock_minimo,
      });

      const currentProd = products.find((p) => p.id === selectedProductForVariant);

      setShowNewVariantModal(false);
      setNewVariant({
        sku: '',
        modelo: '',
        talle: '',
        color: '',
        precioInput: '',
        stock_actual: 0,
        stock_minimo: 5,
      });
      fetchProductsAndCategories();

      // Desplegar modal con el código QR recién generado
      setCreatedVariantQr({
        ...created,
        producto_nombre: currentProd?.nombre || 'Producto',
      });
    } catch (err: any) {
      alert(err.message || 'Error al crear variante');
    }
  };

  const handleUpdatePrice = async (variantId: string, productId: string) => {
    const parsedPrice = parseCurrencyAr(editingPriceInput);
    if (parsedPrice <= 0) {
      alert('Debe ingresar un precio válido mayor a 0 (ej: 67.999 o 68000)');
      return;
    }

    try {
      await ApiClient.put(`/catalog/variants/${variantId}`, { precio: parsedPrice });
      setEditingVariantId(null);
      // Recargar variantes del producto expandido
      const prodData = await ApiClient.get(`/catalog/products/${productId}`);
      setProductVariantsMap((prev) => ({ ...prev, [productId]: prodData.variantes || [] }));
      fetchProductsAndCategories();
      alert('Precio actualizado. La etiqueta quedó marcada como desactualizada (RN-15).');
    } catch (err: any) {
      alert(err.message || 'Error al actualizar precio');
    }
  };

  // Handlers Ajustes de Stock
  const handleCreateAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustmentForm.variant_id) return;
    setSubmittingAdjustment(true);
    setAdjustmentSuccessMsg(null);
    try {
      const res = await ApiClient.post('/inventory/adjustments', adjustmentForm);
      setAdjustmentSuccessMsg(
        `Ajuste registrado exitosamente. Stock anterior: ${res.stock_anterior}, Stock nuevo: ${res.stock_nuevo}`
      );
      setAdjustmentForm({
        variant_id: stockList[0]?.id || '',
        tipo: 'ingreso',
        cantidad: 1,
        motivo: '',
        referencia: '',
      });
      fetchStockAndMovements();
    } catch (err: any) {
      alert(err.message || 'Error al registrar ajuste');
    } finally {
      setSubmittingAdjustment(false);
    }
  };

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
    <div className="mx-auto max-w-3xl p-4 pb-24">
      <div className="mb-4">
        <h2 className="text-xl font-bold text-gray-900">Panel de Administración</h2>
        <p className="text-xs text-gray-500">Gestión de catálogo, inventario, alertas y etiquetas.</p>
      </div>

      {/* Navegación por pestañas */}
      <div className="no-scrollbar flex gap-1.5 overflow-x-auto border-b border-gray-200 pb-2 mb-4">
        <button
          onClick={() => setActiveTab('alerts')}
          className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold whitespace-nowrap transition ${
            activeTab === 'alerts'
              ? 'bg-brand-600 text-white shadow-sm'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <AlertTriangle className="h-4 w-4" />
          <span>Alertas ({alerts.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('products')}
          className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold whitespace-nowrap transition ${
            activeTab === 'products'
              ? 'bg-brand-600 text-white shadow-sm'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <PackagePlus className="h-4 w-4" />
          <span>Productos & Variantes</span>
        </button>

        <button
          onClick={() => setActiveTab('adjust')}
          className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold whitespace-nowrap transition ${
            activeTab === 'adjust'
              ? 'bg-brand-600 text-white shadow-sm'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <SlidersHorizontal className="h-4 w-4" />
          <span>Ajustes & Historial</span>
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

      {/* TAB 1: ALERTAS DE STOCK BAJO (RF-14, RF-15) */}
      {activeTab === 'alerts' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">
              Variantes con existencias iguales o inferiores a su stock mínimo (por defecto 5).
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
                    Stock actual: {al.stock_actual} u. (Umbral mínimo: {al.umbral} u.)
                  </span>
                </div>
                <button
                  onClick={() => {
                    setAdjustmentForm((prev) => ({
                      ...prev,
                      variant_id: al.variante.id,
                      tipo: 'ingreso',
                      cantidad: 5,
                    }));
                    setActiveTab('adjust');
                  }}
                  className="rounded-xl bg-gray-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-gray-800"
                >
                  Reponer
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB 2: PRODUCTOS Y VARIANTES (RF-16, RF-17) */}
      {activeTab === 'products' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">Gestión de productos del catálogo y sus variantes/SKU.</span>
            <button
              onClick={() => setShowNewProductModal(true)}
              className="flex items-center gap-1.5 rounded-xl bg-brand-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-brand-700"
            >
              <Plus className="h-4 w-4" />
              <span>Nuevo Producto</span>
            </button>
          </div>

          {loadingProducts ? (
            <p className="text-xs text-gray-400 py-6 text-center">Cargando productos...</p>
          ) : products.length === 0 ? (
            <div className="rounded-2xl border border-gray-100 bg-white p-8 text-center text-gray-400">
              <PackagePlus className="mx-auto h-10 w-10 text-gray-300 mb-2" />
              <p className="text-sm font-semibold text-gray-700">No hay productos registrados</p>
              <p className="text-xs mt-0.5">Crea uno nuevo o importa el catálogo desde CSV/Excel.</p>
            </div>
          ) : (
            products.map((prod) => (
              <div key={prod.id} className="rounded-2xl bg-white p-4 shadow-sm border border-gray-100">
                <div className="flex justify-between items-start border-b pb-2.5">
                  <div className="flex items-start gap-3">
                    {prod.imagenes && prod.imagenes[0] ? (
                      <div className="relative group">
                        <img
                          src={prod.imagenes[0]}
                          alt={prod.nombre}
                          className="h-14 w-14 rounded-xl object-cover border border-gray-200 shadow-2xs"
                        />
                        <label className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-xl opacity-0 group-hover:opacity-100 cursor-pointer transition text-white">
                          <ImageIcon className="h-4 w-4" />
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleUpdateExistingProductImage(prod.id, file);
                            }}
                          />
                        </label>
                      </div>
                    ) : (
                      <label
                        className="flex h-14 w-14 cursor-pointer items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50 text-gray-400 hover:border-brand-500 hover:text-brand-600 transition"
                        title="Subir foto del producto"
                      >
                        <ImageIcon className="h-5 w-5" />
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleUpdateExistingProductImage(prod.id, file);
                          }}
                        />
                      </label>
                    )}
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-brand-700 bg-brand-50 px-2 py-0.5 rounded">
                        {prod.categoria_nombre}
                      </span>
                      <h3 className="text-base font-bold text-gray-900 mt-1">{prod.nombre}</h3>
                      {prod.descripcion && <p className="text-xs text-gray-500 mt-0.5">{prod.descripcion}</p>}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedProductForVariant(prod.id);
                      setShowNewVariantModal(true);
                    }}
                    className="flex items-center gap-1 rounded-xl bg-gray-100 px-2.5 py-1 text-xs font-bold text-gray-800 hover:bg-gray-200"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Agregar Variante</span>
                  </button>
                </div>

                <div className="mt-3 flex justify-between items-center text-xs text-gray-600 border-t pt-2">
                  <span>Total variantes: <strong>{prod.total_variantes}</strong></span>
                  <span>Stock total: <strong>{prod.disponibilidad?.stock_exacto ?? 0} u.</strong></span>
                  <button
                    onClick={() => handleToggleExpandProduct(prod.id)}
                    className="text-xs font-semibold text-brand-700 hover:underline"
                  >
                    {expandedProductId === prod.id ? 'Ocultar Variantes' : 'Ver / Editar Variantes'}
                  </button>
                </div>

                {/* Lista de Variantes Expandida con edición de precios */}
                {expandedProductId === prod.id && (
                  <div className="mt-3 pt-3 border-t border-gray-100 bg-gray-50/70 -mx-4 -mb-4 p-4 rounded-b-2xl">
                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-2">
                      Variantes del Producto
                    </h4>
                    {loadingVariants && !productVariantsMap[prod.id] ? (
                      <p className="text-xs text-gray-400 py-2">Cargando variantes...</p>
                    ) : productVariantsMap[prod.id]?.length === 0 ? (
                      <p className="text-xs text-gray-400 py-2">Sin variantes creadas aún.</p>
                    ) : (
                      <div className="space-y-2">
                        {productVariantsMap[prod.id]?.map((v: any) => (
                          <div
                            key={v.id}
                            className="flex items-center justify-between rounded-xl bg-white p-2.5 text-xs shadow-2xs border border-gray-200"
                          >
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-gray-800">{v.sku}</span>
                                {v.etiqueta_desactualizada && (
                                  <span className="rounded bg-amber-100 px-1 text-[9px] font-bold text-amber-800">
                                    Etiqueta Desactualizada
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-gray-500">
                                Talle: {v.talle || '-'} | Color: {v.color || '-'} | Stock: {v.stock_actual} u.
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5">
                              {editingVariantId === v.id ? (
                                <div className="flex items-center gap-1">
                                  <input
                                    type="text"
                                    inputMode="decimal"
                                    value={editingPriceInput}
                                    onChange={(e) => setEditingPriceInput(e.target.value)}
                                    placeholder="Ej: 67.999"
                                    className="w-24 rounded-lg border border-brand-500 p-1 text-right text-xs font-bold"
                                  />
                                  <button
                                    onClick={() => handleUpdatePrice(v.id, prod.id)}
                                    className="rounded-lg bg-green-600 p-1 text-white hover:bg-green-700"
                                    title="Guardar precio"
                                  >
                                    <Save className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    onClick={() => setEditingVariantId(null)}
                                    className="rounded-lg bg-gray-200 p-1 text-gray-600 hover:bg-gray-300"
                                    title="Cancelar"
                                  >
                                    <X className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() =>
                                      setCreatedVariantQr({
                                        ...v,
                                        producto_nombre: prod.nombre,
                                      })
                                    }
                                    className="flex items-center gap-1 rounded-lg bg-gray-100 px-2 py-1 text-[11px] font-semibold text-gray-700 hover:bg-gray-200"
                                    title="Ver Código QR"
                                  >
                                    <QrCode className="h-3.5 w-3.5 text-brand-600" />
                                    <span>Ver QR</span>
                                  </button>
                                  <span className="font-black text-gray-900">
                                    ${v.precio?.toLocaleString('es-AR')}
                                  </span>
                                  <button
                                    onClick={() => {
                                      setEditingVariantId(v.id);
                                      setEditingPriceInput(v.precio.toString());
                                    }}
                                    className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                                    title="Editar precio"
                                  >
                                    <Edit2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}

          {/* Modal Nuevo Producto */}
          {showNewProductModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
              <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
                <div className="flex items-center justify-between border-b pb-2 mb-3">
                  <h3 className="text-sm font-bold text-gray-900">Dar de Alta Producto</h3>
                  <button onClick={() => setShowNewProductModal(false)} className="text-gray-400 hover:text-gray-600">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <form onSubmit={handleCreateProduct} className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-gray-700">Categoría</label>
                      {categories.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setIsCreatingNewCategory(!isCreatingNewCategory)}
                          className="text-[11px] font-bold text-brand-600 hover:underline"
                        >
                          {isCreatingNewCategory ? 'Seleccionar existente' : '+ Nueva Categoría'}
                        </button>
                      )}
                    </div>

                    {isCreatingNewCategory || categories.length === 0 ? (
                      <div>
                        <input
                          type="text"
                          value={newProduct.categoria_nombre}
                          onChange={(e) =>
                            setNewProduct({ ...newProduct, categoria_nombre: e.target.value })
                          }
                          placeholder="Nombre de la nueva categoría (ej: Ropa deportiva)"
                          className="w-full rounded-xl border border-brand-500 p-2 text-xs focus:outline-none"
                          required
                        />
                        {categories.length === 0 && (
                          <p className="text-[10px] text-gray-400 mt-1">
                            Aún no hay categorías creadas. Escribe una para crearla automáticamente.
                          </p>
                        )}
                      </div>
                    ) : (
                      <select
                        value={newProduct.category_id}
                        onChange={(e) =>
                          setNewProduct({ ...newProduct, category_id: parseInt(e.target.value, 10) })
                        }
                        className="w-full rounded-xl border border-gray-300 p-2 text-xs"
                      >
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.nombre}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-700 block mb-1">Nombre del Producto</label>
                    <input
                      type="text"
                      value={newProduct.nombre}
                      onChange={(e) => setNewProduct({ ...newProduct, nombre: e.target.value })}
                      placeholder="Ej: Remera Lisa Algodón"
                      className="w-full rounded-xl border border-gray-300 p-2 text-xs"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-700 block mb-1">Descripción (opcional)</label>
                    <textarea
                      value={newProduct.descripcion}
                      onChange={(e) => setNewProduct({ ...newProduct, descripcion: e.target.value })}
                      className="w-full rounded-xl border border-gray-300 p-2 text-xs"
                      rows={2}
                    />
                  </div>

                  {/* Selector de Foto del Producto */}
                  <div>
                    <label className="text-xs font-semibold text-gray-700 block mb-1">
                      Foto del Producto (Opcional - Se guarda por ruta liviana)
                    </label>
                    {productImagePreview ? (
                      <div className="relative mb-2 rounded-xl border border-gray-200 p-2 flex items-center gap-3 bg-gray-50">
                        <img
                          src={productImagePreview}
                          alt="Vista previa"
                          className="h-14 w-14 rounded-lg object-cover border border-gray-200"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-gray-800 truncate">
                            {productImageFile?.name}
                          </p>
                          <p className="text-[10px] text-gray-500">
                            {(productImageFile ? productImageFile.size / 1024 : 0).toFixed(1)} KB
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setProductImageFile(null);
                            setProductImagePreview(null);
                          }}
                          className="rounded-lg p-1 text-gray-400 hover:bg-gray-200 hover:text-red-600"
                          title="Quitar foto"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 p-3 hover:border-brand-500 hover:bg-brand-50/30 transition">
                        <ImageIcon className="h-6 w-6 text-gray-400 mb-1" />
                        <span className="text-xs font-semibold text-gray-600">
                          Seleccionar o tomar foto
                        </span>
                        <span className="text-[10px] text-gray-400">JPG, PNG o WebP</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              setProductImageFile(file);
                              setProductImagePreview(URL.createObjectURL(file));
                            }
                          }}
                        />
                      </label>
                    )}
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowNewProductModal(false);
                        setProductImageFile(null);
                        setProductImagePreview(null);
                      }}
                      className="flex-1 rounded-xl bg-gray-100 py-2.5 text-xs font-semibold text-gray-700"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={uploadingImage}
                      className="flex-1 rounded-xl bg-brand-600 py-2.5 text-xs font-bold text-white hover:bg-brand-700 disabled:opacity-50"
                    >
                      {uploadingImage ? 'Subiendo imagen...' : 'Guardar Producto'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Modal Nueva Variante */}
          {showNewVariantModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
              <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
                <div className="flex items-center justify-between border-b pb-2 mb-3">
                  <h3 className="text-sm font-bold text-gray-900">Agregar Variante con Código QR</h3>
                  <button onClick={() => setShowNewVariantModal(false)} className="text-gray-400 hover:text-gray-600">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <form onSubmit={handleCreateVariant} className="space-y-2.5">
                  <div>
                    <label className="text-xs font-semibold text-gray-700 block mb-1">SKU Único (RN-01, RN-16)</label>
                    <input
                      type="text"
                      value={newVariant.sku}
                      onChange={(e) => setNewVariant({ ...newVariant, sku: e.target.value })}
                      placeholder="Ej: REM-LISA-M-AZU"
                      className="w-full rounded-xl border border-gray-300 p-2 text-xs font-mono uppercase"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs font-semibold text-gray-700 block mb-1">Talle</label>
                      <input
                        type="text"
                        value={newVariant.talle}
                        onChange={(e) => setNewVariant({ ...newVariant, talle: e.target.value })}
                        placeholder="Ej: M, 42, Único"
                        className="w-full rounded-xl border border-gray-300 p-2 text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-700 block mb-1">Color</label>
                      <input
                        type="text"
                        value={newVariant.color}
                        onChange={(e) => setNewVariant({ ...newVariant, color: e.target.value })}
                        placeholder="Ej: Azul Marino"
                        className="w-full rounded-xl border border-gray-300 p-2 text-xs"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-700 block mb-1">Precio Final ARS (IVA inc.)</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={newVariant.precioInput}
                      onChange={(e) => setNewVariant({ ...newVariant, precioInput: e.target.value })}
                      placeholder="Ej: 67.999 o 68000"
                      className="w-full rounded-xl border border-gray-300 p-2 text-xs font-bold text-gray-900 focus:border-brand-500 focus:outline-none"
                      required
                    />
                    {newVariant.precioInput && (
                      <p className="text-[11px] text-brand-700 font-semibold mt-1">
                        Interpretado: {formatCurrencyAr(parseCurrencyAr(newVariant.precioInput))}
                      </p>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs font-semibold text-gray-700 block mb-1">Stock Inicial</label>
                      <input
                        type="number"
                        min="0"
                        value={newVariant.stock_actual}
                        onChange={(e) => setNewVariant({ ...newVariant, stock_actual: parseInt(e.target.value, 10) || 0 })}
                        className="w-full rounded-xl border border-gray-300 p-2 text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-700 block mb-1">Stock Mínimo (Alerta)</label>
                      <input
                        type="number"
                        min="0"
                        value={newVariant.stock_minimo}
                        onChange={(e) => setNewVariant({ ...newVariant, stock_minimo: parseInt(e.target.value, 10) || 5 })}
                        className="w-full rounded-xl border border-gray-300 p-2 text-xs"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowNewVariantModal(false)}
                      className="flex-1 rounded-xl bg-gray-100 py-2.5 text-xs font-semibold text-gray-700"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="flex-1 rounded-xl bg-brand-600 py-2.5 text-xs font-bold text-white hover:bg-brand-700"
                    >
                      Generar QR & Crear
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Modal Visualizador / Confirmación de Código QR Generado */}
          {createdVariantQr && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
              <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl text-center border border-gray-100 animate-in fade-in zoom-in-95 duration-150">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 mb-3">
                  <QrCode className="h-7 w-7" />
                </div>
                <h3 className="text-base font-bold text-gray-900">
                  ¡Código QR Generado con Éxito!
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  Variante asociada a <strong>{createdVariantQr.producto_nombre}</strong>
                </p>

                {/* QR Image Box */}
                <div className="my-4 flex flex-col items-center justify-center rounded-2xl bg-gray-50 p-4 border border-gray-100">
                  {createdVariantQr.qr_code ? (
                    <img
                      src={createdVariantQr.qr_code}
                      alt={`QR ${createdVariantQr.sku}`}
                      className="h-44 w-44 rounded-xl bg-white p-2 shadow-sm border border-gray-200"
                    />
                  ) : (
                    <div className="h-44 w-44 flex items-center justify-center text-xs text-gray-400">
                      Cargando QR...
                    </div>
                  )}
                  <span className="mt-2.5 font-mono text-xs font-black text-gray-800 bg-white px-2 py-0.5 rounded border border-gray-200 shadow-2xs">
                    {createdVariantQr.sku}
                  </span>
                  <div className="mt-1 flex items-center gap-2 text-[11px] text-gray-500 font-medium">
                    {createdVariantQr.talle && <span>Talle: <strong>{createdVariantQr.talle}</strong></span>}
                    {createdVariantQr.color && <span>• Color: <strong>{createdVariantQr.color}</strong></span>}
                    <span>• Código: <span className="font-mono">{createdVariantQr.codigo}</span></span>
                  </div>
                  <span className="mt-1.5 text-sm font-black text-brand-700">
                    ${createdVariantQr.precio?.toLocaleString('es-AR')} ARS
                  </span>
                </div>

                <div className="space-y-2">
                  {createdVariantQr.qr_code && (
                    <a
                      href={createdVariantQr.qr_code}
                      download={`QR_${createdVariantQr.sku}.png`}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-gray-900 py-2.5 text-xs font-bold text-white hover:bg-gray-800 transition"
                    >
                      <Download className="h-4 w-4" />
                      <span>Descargar Imagen QR (PNG)</span>
                    </a>
                  )}

                  <button
                    onClick={() => {
                      setCreatedVariantQr(null);
                      setActiveTab('labels');
                    }}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-gray-100 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-200 transition"
                  >
                    <Printer className="h-3.5 w-3.5" />
                    <span>Ir a Imprimir en Plancha A4</span>
                  </button>

                  <button
                    onClick={() => setCreatedVariantQr(null)}
                    className="w-full rounded-xl py-2 text-xs font-bold text-brand-700 hover:bg-brand-50 transition"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: AJUSTES DE STOCK E HISTORIAL (RF-18, RF-19, RN-10) */}
      {activeTab === 'adjust' && (
        <div className="space-y-5">
          {/* Formulario de Ajuste Manual */}
          <form onSubmit={handleCreateAdjustment} className="rounded-2xl bg-white p-4 shadow-sm border border-gray-100">
            <h3 className="text-sm font-bold text-gray-900 mb-1">Registrar Ajuste de Inventario</h3>
            <p className="text-xs text-gray-500 mb-3">
              Todo movimiento manual debe indicar motivo obligatorio y queda registrado en auditoría (RN-10).
            </p>

            {adjustmentSuccessMsg && (
              <div className="mb-3 flex items-center gap-2 rounded-xl bg-green-50 p-3 text-xs text-green-700 border border-green-200">
                <CheckCircle className="h-4 w-4 flex-shrink-0" />
                <span>{adjustmentSuccessMsg}</span>
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">Seleccionar Variante</label>
                <select
                  value={adjustmentForm.variant_id}
                  onChange={(e) => setAdjustmentForm({ ...adjustmentForm, variant_id: e.target.value })}
                  className="w-full rounded-xl border border-gray-300 p-2 text-xs"
                  required
                >
                  {stockList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.producto_nombre} ({s.talle || '-'} / {s.color || '-'}) - SKU: {s.sku} (Stock: {s.stock_actual})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1">Tipo de Ajuste</label>
                  <select
                    value={adjustmentForm.tipo}
                    onChange={(e: any) => setAdjustmentForm({ ...adjustmentForm, tipo: e.target.value })}
                    className="w-full rounded-xl border border-gray-300 p-2 text-xs"
                  >
                    <option value="ingreso">Ingreso (Recepción mercadería)</option>
                    <option value="egreso">Egreso (Baja de unidades)</option>
                    <option value="rotura">Rotura / Daño</option>
                    <option value="ajuste">Ajuste (Fijar stock exacto)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1">
                    {adjustmentForm.tipo === 'ajuste' ? 'Nuevo Stock Contado' : 'Cantidad'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={adjustmentForm.cantidad}
                    onChange={(e) =>
                      setAdjustmentForm({ ...adjustmentForm, cantidad: parseInt(e.target.value, 10) || 0 })
                    }
                    className="w-full rounded-xl border border-gray-300 p-2 text-xs font-bold"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">
                  Motivo del Ajuste (Obligatorio, mín. 4 caracteres)
                </label>
                <input
                  type="text"
                  value={adjustmentForm.motivo}
                  onChange={(e) => setAdjustmentForm({ ...adjustmentForm, motivo: e.target.value })}
                  placeholder="Ej: Ingreso remito 104, rotura en exhibición, recuento anual..."
                  className="w-full rounded-xl border border-gray-300 p-2 text-xs"
                  required
                  minLength={4}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">Referencia (opcional)</label>
                <input
                  type="text"
                  value={adjustmentForm.referencia}
                  onChange={(e) => setAdjustmentForm({ ...adjustmentForm, referencia: e.target.value })}
                  placeholder="Ej: Remito Nº 0001-000492"
                  className="w-full rounded-xl border border-gray-300 p-2 text-xs"
                />
              </div>

              <button
                type="submit"
                disabled={submittingAdjustment || !adjustmentForm.motivo.trim()}
                className="w-full rounded-xl bg-brand-600 py-3 text-xs font-bold text-white shadow-md transition hover:bg-brand-700 disabled:opacity-50"
              >
                {submittingAdjustment ? 'Guardando...' : 'Confirmar Ajuste y Actualizar Stock'}
              </button>
            </div>
          </form>

          {/* Historial de Movimientos de Stock (RF-19) */}
          <div className="rounded-2xl bg-white p-4 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5">
                <History className="h-4 w-4 text-gray-600" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700">
                  Historial de Movimientos Recientes
                </h4>
              </div>
              <button onClick={fetchStockAndMovements} className="p-1 text-gray-400 hover:text-gray-700">
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
            </div>

            {loadingMovements ? (
              <p className="text-xs text-gray-400 text-center py-4">Cargando movimientos...</p>
            ) : movements.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">No se registran movimientos aún.</p>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {movements.map((m) => (
                  <div key={m.id} className="rounded-xl bg-gray-50 p-2.5 text-xs border border-gray-100">
                    <div className="flex justify-between items-start font-semibold text-gray-900">
                      <span>{m.producto_nombre} ({m.talle || '-'} / {m.color || '-'})</span>
                      <span
                        className={`font-mono font-bold ${
                          m.cantidad > 0 ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        {m.cantidad > 0 ? `+${m.cantidad}` : m.cantidad} u.
                      </span>
                    </div>
                    <div className="flex justify-between text-[11px] text-gray-500 mt-1">
                      <span className="capitalize font-medium">Tipo: {m.tipo}</span>
                      <span>Stock: {m.stock_anterior} → <strong>{m.stock_nuevo}</strong></span>
                    </div>
                    <div className="text-[10px] text-gray-400 mt-0.5 flex justify-between">
                      <span>Motivo: {m.motivo}</span>
                      <span>{new Date(m.fecha).toLocaleString('es-AR')}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: GENERADOR DE ETIQUETAS A4 (RF-30, CP-19) */}
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

      {/* TAB 5: IMPORTADOR MASIVO CSV / EXCEL (RF-31, CA-18) */}
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
