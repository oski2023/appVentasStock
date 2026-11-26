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
  ShoppingBag,
  Sun,
  Moon,
  Receipt,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useTheme } from '../../context/ThemeContext';

interface NavbarProps {
  currentView: string;
  onNavigate: (view: string) => void;
  cartCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({ currentView, onNavigate }) => {
  const { user, isStaff, isAdmin, logout } = useAuth();
  const { itemCount, activeOrder } = useCart();
  const { isDark, toggleTheme } = useTheme();

  return (
    <>
      {/* Barra Superior */}
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-gray-200 dark:border-gray-800 bg-white/95 dark:bg-gray-900/95 px-4 backdrop-blur-md transition-colors duration-200">
        <div
          className="flex items-center gap-2 cursor-pointer"
          onClick={() => onNavigate(isStaff ? 'pos' : 'catalog')}
          role="button"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white font-bold text-sm shadow-sm">
            VS
          </div>
          <div>
            <span className="text-sm font-bold tracking-tight text-gray-900 dark:text-white block leading-tight">
              Ventas & Stock
            </span>
            <span className="text-[10px] text-gray-500 dark:text-gray-400 block leading-tight">
              {user ? `${user.nombre} (${user.role})` : 'Modo Cliente'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Botón Selector Modo Oscuro / Claro */}
          <button
            onClick={toggleTheme}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition"
            title={isDark ? 'Cambiar a Modo Claro' : 'Cambiar a Modo Oscuro'}
            aria-label="Alternar tema"
          >
            {isDark ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-gray-600" />}
          </button>

          {/* Botón Carrito superior en Modo Cliente */}
          {!isStaff && (
            <button
              onClick={() => onNavigate('cart')}
              className="relative flex items-center gap-1.5 rounded-xl bg-gray-100 dark:bg-gray-800 px-3 py-1.5 text-xs font-bold text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 transition"
              title="Ver Mi Carrito"
            >
              <ShoppingCart className="h-4 w-4 text-brand-600 dark:text-brand-400" />
              <span>Carrito</span>
              {itemCount > 0 && (
                <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-brand-600 px-1 text-[10px] font-bold text-white">
                  {itemCount}
                </span>
              )}
            </button>
          )}

          {isStaff && (
            <>
              <button
                onClick={() => onNavigate('sales')}
                className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${
                  currentView === 'sales'
                    ? 'bg-brand-100 dark:bg-brand-950/60 text-brand-800 dark:text-brand-300 font-bold'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
                title="Cierre de Caja e Historial de Ventas"
              >
                <Receipt className="h-4 w-4 text-brand-600 dark:text-brand-400" />
                <span className="hidden sm:inline">Caja</span>
              </button>

              <button
                onClick={() => onNavigate('diferidas')}
                className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${
                  currentView === 'diferidas'
                    ? 'bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
                title="Carga de Ventas Diferidas por corte de internet"
              >
                <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <span className="hidden sm:inline">Diferidas</span>
              </button>
            </>
          )}

          {user ? (
            <button
              onClick={logout}
              className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
              title="Cerrar sesión"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Salir</span>
            </button>
          ) : (
            <button
              onClick={() => onNavigate('login')}
              className="flex items-center gap-1 rounded-lg bg-gray-900 dark:bg-gray-100 px-3 py-1.5 text-xs font-medium text-white dark:text-gray-900 transition hover:bg-gray-800 dark:hover:bg-gray-200"
            >
              <LogIn className="h-3.5 w-3.5" />
              <span>Acceso Personal</span>
            </button>
          )}
        </div>
      </header>

      {/* Barra de Navegación Inferior (Mobile First / Tablets) */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 flex h-16 items-center justify-around border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-2 shadow-lg sm:px-6 transition-colors duration-200">
        {/* NAVEGACIÓN CLIENTE INVITADO */}
        {!isStaff ? (
          <>
            <button
              onClick={() => onNavigate('catalog')}
              className={`flex flex-col items-center justify-center py-1 transition ${
                currentView === 'catalog'
                  ? 'text-brand-600 dark:text-brand-400 font-bold'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              <BookOpen className="h-5 w-5" />
              <span className="text-[11px] mt-0.5">Catálogo</span>
            </button>

            <button
              onClick={() => onNavigate('cart')}
              className={`relative flex flex-col items-center justify-center py-1 transition ${
                currentView === 'cart'
                  ? 'text-brand-600 dark:text-brand-400 font-bold'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              <div className="relative">
                <ShoppingBag className="h-5 w-5" />
                {itemCount > 0 && (
                  <span className="absolute -right-2 -top-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-brand-600 px-1 text-[10px] font-bold text-white">
                    {itemCount}
                  </span>
                )}
              </div>
              <span className="text-[11px] mt-0.5">
                {activeOrder ? 'Mi Pedido' : 'Mi Carrito'}
              </span>
            </button>
          </>
        ) : (
          /* NAVEGACIÓN PERSONAL DE VENTAS / STAFF */
          <>
            {/* Venta Asistida / POS */}
            <button
              onClick={() => onNavigate('pos')}
              className={`relative flex flex-col items-center justify-center py-1 transition ${
                currentView === 'pos'
                  ? 'text-brand-600 dark:text-brand-400 font-semibold'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              <ShoppingCart className="h-5 w-5" />
              <span className="text-[11px] mt-0.5">Venta / POS</span>
            </button>

            {/* Cierre de Caja / Historial de Ventas */}
            <button
              onClick={() => onNavigate('sales')}
              className={`relative flex flex-col items-center justify-center py-1 transition ${
                currentView === 'sales'
                  ? 'text-brand-600 dark:text-brand-400 font-semibold'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              <Receipt className="h-5 w-5" />
              <span className="text-[11px] mt-0.5">Caja</span>
            </button>

            {/* Catálogo */}
            <button
              onClick={() => onNavigate('catalog')}
              className={`flex flex-col items-center justify-center py-1 transition ${
                currentView === 'catalog'
                  ? 'text-brand-600 dark:text-brand-400 font-semibold'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              <BookOpen className="h-5 w-5" />
              <span className="text-[11px] mt-0.5">Catálogo</span>
            </button>

            {/* Verificación de Entrega */}
            <button
              onClick={() => onNavigate('delivery')}
              className={`flex flex-col items-center justify-center py-1 transition ${
                currentView === 'delivery'
                  ? 'text-brand-600 dark:text-brand-400 font-semibold'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              <CheckCircle2 className="h-5 w-5" />
              <span className="text-[11px] mt-0.5">Entrega</span>
            </button>

            {/* Devoluciones */}
            <button
              onClick={() => onNavigate('refunds')}
              className={`flex flex-col items-center justify-center py-1 transition ${
                currentView === 'refunds'
                  ? 'text-brand-600 dark:text-brand-400 font-semibold'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
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
                  currentView === 'admin'
                    ? 'text-brand-600 dark:text-brand-400 font-semibold'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                <Settings className="h-5 w-5" />
                <span className="text-[11px] mt-0.5">Admin</span>
              </button>
            )}
          </>
        )}
      </nav>
    </>
  );
};
