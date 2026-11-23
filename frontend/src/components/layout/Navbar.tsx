import React from 'react';
import {
  ShoppingCart,
  BookOpen,
  CheckCircle2,
  RotateCcw,
  Settings,
  LogIn,
  LogOut,
  Clock,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface NavbarProps {
  currentView: string;
  onNavigate: (view: string) => void;
  cartCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({ currentView, onNavigate, cartCount }) => {
  const { user, isStaff, isAdmin, logout } = useAuth();

  return (
    <>
      {/* Barra Superior */}
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-gray-200 bg-white/95 px-4 backdrop-blur-md">
        <div className="flex items-center gap-2" onClick={() => onNavigate('pos')} role="button">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white font-bold text-sm">
            VS
          </div>
          <div>
            <span className="text-sm font-bold tracking-tight text-gray-900 block leading-tight">
              Ventas & Stock
            </span>
            <span className="text-[10px] text-gray-500 block leading-tight">
              {user ? `${user.nombre} (${user.role})` : 'Modo Cliente'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isStaff && (
            <button
              onClick={() => onNavigate('diferidas')}
              className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${
                currentView === 'diferidas'
                  ? 'bg-amber-100 text-amber-800'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
              title="Carga de Ventas Diferidas por corte de internet"
            >
              <Clock className="h-4 w-4 text-amber-600" />
              <span className="hidden sm:inline">Diferidas</span>
            </button>
          )}

          {user ? (
            <button
              onClick={logout}
              className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-gray-500 hover:bg-gray-100"
              title="Cerrar sesión"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Salir</span>
            </button>
          ) : (
            <button
              onClick={() => onNavigate('login')}
              className="flex items-center gap-1 rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-gray-800"
            >
              <LogIn className="h-3.5 w-3.5" />
              <span>Acceso Personal</span>
            </button>
          )}
        </div>
      </header>

      {/* Barra de Navegación Inferior (Mobile First / Tablets) */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 flex h-16 items-center justify-around border-t border-gray-200 bg-white px-2 shadow-lg sm:px-6">
        {/* Venta Asistida / POS */}
        <button
          onClick={() => onNavigate('pos')}
          className={`relative flex flex-col items-center justify-center py-1 transition ${
            currentView === 'pos' ? 'text-brand-600 font-semibold' : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          <div className="relative">
            <ShoppingCart className="h-5 w-5" />
            {cartCount > 0 && (
              <span className="absolute -right-2 -top-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-brand-600 px-1 text-[10px] font-bold text-white">
                {cartCount}
              </span>
            )}
          </div>
          <span className="text-[11px] mt-0.5">Venta / POS</span>
        </button>

        {/* Catálogo de Productos */}
        <button
          onClick={() => onNavigate('catalog')}
          className={`flex flex-col items-center justify-center py-1 transition ${
            currentView === 'catalog' ? 'text-brand-600 font-semibold' : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          <BookOpen className="h-5 w-5" />
          <span className="text-[11px] mt-0.5">Catálogo</span>
        </button>

        {/* Verificación de Entrega */}
        <button
          onClick={() => onNavigate('delivery')}
          className={`flex flex-col items-center justify-center py-1 transition ${
            currentView === 'delivery' ? 'text-brand-600 font-semibold' : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          <CheckCircle2 className="h-5 w-5" />
          <span className="text-[11px] mt-0.5">Entrega</span>
        </button>

        {/* Devoluciones */}
        <button
          onClick={() => onNavigate('refunds')}
          className={`flex flex-col items-center justify-center py-1 transition ${
            currentView === 'refunds' ? 'text-brand-600 font-semibold' : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          <RotateCcw className="h-5 w-5" />
          <span className="text-[11px] mt-0.5">Devolución</span>
        </button>

        {/* Administración (si es Admin) */}
        {isAdmin && (
          <button
            onClick={() => onNavigate('admin')}
            className={`flex flex-col items-center justify-center py-1 transition ${
              currentView === 'admin' ? 'text-brand-600 font-semibold' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <Settings className="h-5 w-5" />
            <span className="text-[11px] mt-0.5">Admin</span>
          </button>
        )}
      </nav>
    </>
  );
};
