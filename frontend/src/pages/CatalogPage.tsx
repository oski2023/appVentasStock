import React, { useEffect, useState } from 'react';
import { Search, Camera, Package } from 'lucide-react';
import { ApiClient } from '../services/api';
import { QrScannerModal } from '../components/scanner/QrScannerModal';
import { useAuth } from '../context/AuthContext';

interface CatalogPageProps {
  onSelectVariantCode: (code: string) => void;
}

export const CatalogPage: React.FC<CatalogPageProps> = ({ onSelectVariantCode }) => {
  const { isStaff } = useAuth();
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCat, setSelectedCat] = useState<number | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [scannerOpen, setScannerOpen] = useState(false);

  const fetchCatalog = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (searchQuery) queryParams.set('query', searchQuery);
      if (selectedCat) queryParams.set('category_id', selectedCat.toString());

      const [prodsData, catsData] = await Promise.all([
        ApiClient.get(`/catalog/products?${queryParams.toString()}`),
        ApiClient.get('/catalog/categories'),
      ]);

      setProducts(prodsData);
      setCategories(catsData);
    } catch (err) {
      console.error('Error al cargar catálogo:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCatalog();
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery, selectedCat]);

  return (
    <div className="p-4 pb-24">
      {/* Barra de Búsqueda y Botón QR */}
      <div className="flex gap-2 mb-3">
        <div className="relative flex-1">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por nombre, SKU o código..."
            className="w-full rounded-2xl border border-gray-200 bg-white px-3.5 py-3 pl-10 text-sm shadow-sm focus:border-brand-500 focus:outline-none"
          />
          <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-gray-400" />
        </div>
        <button
          onClick={() => setScannerOpen(true)}
          className="flex items-center justify-center rounded-2xl bg-brand-600 px-4 text-white shadow-sm transition active:scale-95"
          title="Escanear código QR"
        >
          <Camera className="h-5 w-5" />
        </button>
      </div>

      {/* Filtro por Categorías */}
      <div className="no-scrollbar flex gap-1.5 overflow-x-auto pb-2">
        <button
          onClick={() => setSelectedCat(undefined)}
          className={`rounded-xl px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition ${
            selectedCat === undefined
              ? 'bg-gray-900 text-white'
              : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-100'
          }`}
        >
          Todas
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCat(cat.id)}
            className={`rounded-xl px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition ${
              selectedCat === cat.id
                ? 'bg-gray-900 text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-100'
            }`}
          >
            {cat.nombre}
          </button>
        ))}
      </div>

      {/* Listado de Productos */}
      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <p className="text-xs text-gray-400">Cargando catálogo...</p>
        </div>
      ) : products.length === 0 ? (
        <div className="mt-8 text-center text-gray-400">
          <Package className="mx-auto h-12 w-12 text-gray-300 mb-2" />
          <p className="text-sm font-medium">No se encontraron productos</p>
        </div>
      ) : (
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {products.map((product) => {
            const hasStock = isStaff
              ? product.disponibilidad?.stock_exacto > 0
              : product.disponibilidad?.estado === 'Disponible';

            return (
              <div
                key={product.id}
                className="overflow-hidden rounded-2xl bg-white p-4 shadow-sm border border-gray-100 flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-brand-700 bg-brand-50 px-2 py-0.5 rounded-md">
                      {product.categoria_nombre}
                    </span>
                    {/* Disponibilidad */}
                    {isStaff ? (
                      <span className="text-[11px] font-mono font-bold text-gray-600">
                        Stock: {product.disponibilidad?.stock_exacto ?? 0} u.
                      </span>
                    ) : (
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          hasStock
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {product.disponibilidad?.estado}
                      </span>
                    )}
                  </div>

                  <h3 className="mt-2 text-sm font-bold text-gray-900 leading-snug">
                    {product.nombre}
                  </h3>
                  {product.descripcion && (
                    <p className="mt-1 text-xs text-gray-500 line-clamp-2">
                      {product.descripcion}
                    </p>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-gray-50 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-gray-400 block">Precio</span>
                    <span className="text-base font-black text-gray-900">
                      ${product.precio_desde?.toLocaleString('es-AR') || 'Consultar'}
                    </span>
                  </div>
                  <span className="text-xs text-gray-400">
                    {product.total_variantes} variante(s)
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Escáner QR */}
      <QrScannerModal
        isOpen={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScan={onSelectVariantCode}
        title="Escanear Producto del Local"
      />
    </div>
  );
};
