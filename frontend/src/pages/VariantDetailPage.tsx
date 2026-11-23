import React, { useEffect, useState } from 'react';
import { ArrowLeft, ShoppingCart, AlertCircle } from 'lucide-react';
import { ApiClient } from '../services/api';
import { useAuth } from '../context/AuthContext';

interface VariantDetailPageProps {
  code: string;
  onBack: () => void;
  onAddToCart?: (code: string) => void;
}

export const VariantDetailPage: React.FC<VariantDetailPageProps> = ({
  code,
  onBack,
  onAddToCart,
}) => {
  const { isStaff } = useAuth();
  const [variant, setVariant] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchVariant = async () => {
      try {
        const data = await ApiClient.get(`/catalog/variants/by-code/${encodeURIComponent(code)}`);
        setVariant(data);
      } catch (err: any) {
        setError(err.message || 'No se encontró el producto o variante');
      } finally {
        setLoading(false);
      }
    };

    fetchVariant();
  }, [code]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-sm text-gray-500">Cargando ficha del producto...</p>
      </div>
    );
  }

  if (error || !variant) {
    return (
      <div className="p-6 text-center">
        <AlertCircle className="mx-auto h-10 w-10 text-red-500 mb-2" />
        <p className="text-sm text-gray-800 font-semibold">{error || 'Producto no encontrado'}</p>
        <button
          onClick={onBack}
          className="mt-4 rounded-xl bg-gray-900 px-4 py-2 text-xs font-semibold text-white"
        >
          Volver al catálogo
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md p-4 pb-24">
      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={onBack}
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-white border border-gray-200 text-gray-700 shadow-sm"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h2 className="text-lg font-bold text-gray-900">Ficha del Producto</h2>
      </div>

      <div className="overflow-hidden rounded-3xl bg-white p-6 shadow-sm border border-gray-100">
        <span className="text-[10px] font-bold uppercase tracking-wider text-brand-700 bg-brand-50 px-2 py-0.5 rounded-md">
          {variant.producto.categoria}
        </span>
        <h3 className="mt-2 text-xl font-black text-gray-900 leading-tight">
          {variant.producto.nombre}
        </h3>
        {variant.producto.descripcion && (
          <p className="mt-1 text-xs text-gray-500">{variant.producto.descripcion}</p>
        )}

        <div className="my-4 flex items-center justify-center">
          <img
            src={variant.qr_code}
            alt="Código QR"
            className="h-32 w-32 rounded-2xl border border-gray-200 p-1"
          />
        </div>

        {/* Atributos: Talle, Color, Modelo */}
        <div className="grid grid-cols-2 gap-2 my-3 text-xs">
          <div className="rounded-xl bg-gray-50 p-2.5 border border-gray-100">
            <span className="text-[10px] text-gray-400 block">Talle</span>
            <span className="font-bold text-gray-800">{variant.talle || 'Único'}</span>
          </div>
          <div className="rounded-xl bg-gray-50 p-2.5 border border-gray-100">
            <span className="text-[10px] text-gray-400 block">Color</span>
            <span className="font-bold text-gray-800">{variant.color || 'Estándar'}</span>
          </div>
          <div className="rounded-xl bg-gray-50 p-2.5 border border-gray-100">
            <span className="text-[10px] text-gray-400 block">SKU</span>
            <span className="font-mono font-bold text-gray-800">{variant.sku}</span>
          </div>
          <div className="rounded-xl bg-gray-50 p-2.5 border border-gray-100">
            <span className="text-[10px] text-gray-400 block">Código Interno</span>
            <span className="font-mono font-bold text-gray-800">{variant.codigo}</span>
          </div>
        </div>

        {/* Disponibilidad y Precio */}
        <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-gray-400 block">Precio Final (IVA inc.)</span>
            <span className="text-2xl font-black text-gray-900">
              ${variant.precio.toLocaleString('es-AR')}
            </span>
          </div>

          <div>
            {isStaff ? (
              <span className="text-xs font-mono font-bold rounded-lg bg-gray-100 px-3 py-1.5 text-gray-700">
                Stock: {variant.stock_actual} u.
              </span>
            ) : (
              <span
                className={`text-xs font-bold px-3 py-1 rounded-full ${
                  variant.disponibilidad === 'Disponible'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}
              >
                {variant.disponibilidad}
              </span>
            )}
          </div>
        </div>

        {/* Botón para sumar a la venta si se dispone del handler */}
        {onAddToCart && (
          <button
            onClick={() => {
              onAddToCart(variant.codigo);
              onBack();
            }}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-600 py-3.5 text-sm font-bold text-white shadow-md shadow-brand-500/20 transition hover:bg-brand-700 active:scale-95"
          >
            <ShoppingCart className="h-5 w-5" />
            <span>Agregar a la Venta</span>
          </button>
        )}
      </div>
    </div>
  );
};
