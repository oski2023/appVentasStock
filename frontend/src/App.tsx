import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { ThemeProvider } from './context/ThemeContext';
import { Navbar } from './components/layout/Navbar';
import { PosPage } from './pages/PosPage';
import { CatalogPage } from './pages/CatalogPage';
import { VariantDetailPage } from './pages/VariantDetailPage';
import { CustomerCartPage } from './pages/CustomerCartPage';
import { ReceiptPage } from './pages/ReceiptPage';
import { DeliveryPage } from './pages/DeliveryPage';
import { RefundsPage } from './pages/RefundsPage';
import { DeferredSalePage } from './pages/DeferredSalePage';
import { AdminPage } from './pages/AdminPage';
import { LoginPage } from './pages/LoginPage';
import { SalesHistoryPage } from './pages/SalesHistoryPage';

const AppContent: React.FC = () => {
  const { isStaff, isAdmin } = useAuth();
  const [currentView, setCurrentView] = useState<string>('catalog');
  const [selectedReceipt, setSelectedReceipt] = useState<string | null>(null);
  const [selectedVariantCode, setSelectedVariantCode] = useState<string | null>(null);

  // Detectar si el usuario o cliente ingresó escaneando una URL con /ficha/ o /comprobante/
  useEffect(() => {
    const path = window.location.pathname;
    if (path.startsWith('/ficha/')) {
      const code = path.replace('/ficha/', '').trim();
      if (code) {
        setSelectedVariantCode(decodeURIComponent(code));
        setCurrentView('detail');
      }
    } else if (path.startsWith('/comprobante/')) {
      const receipt = path.replace('/comprobante/', '').trim();
      if (receipt) {
        setSelectedReceipt(decodeURIComponent(receipt));
        setCurrentView('receipt');
      }
    } else {
      // Si entra a la raíz y es personal autorizado, ir al POS; si es cliente, ir al catálogo
      if (isStaff) {
        setCurrentView('pos');
      } else {
        setCurrentView('catalog');
      }
    }
  }, [isStaff]);

  const handleSaleCompleted = (receiptNumber: string) => {
    setSelectedReceipt(receiptNumber);
    setCurrentView('receipt');
  };

  const handleSelectVariantCode = (code: string) => {
    setSelectedVariantCode(code);
    setCurrentView('detail');
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 flex flex-col font-sans transition-colors duration-200">
      <Navbar
        currentView={currentView}
        onNavigate={(view) => {
          setSelectedVariantCode(null);
          setCurrentView(view);
        }}
        cartCount={0}
      />

      <main className="flex-1 max-w-4xl w-full mx-auto">
        {/* Vista POS (Punto de Venta) para Staff */}
        {currentView === 'pos' && (
          <PosPage
            onSaleCompleted={handleSaleCompleted}
            onNavigateLogin={() => setCurrentView('login')}
          />
        )}

        {/* Vista Catálogo Público */}
        {currentView === 'catalog' && (
          <CatalogPage onSelectVariantCode={handleSelectVariantCode} />
        )}

        {/* Vista Ficha de Variante Escaneada */}
        {currentView === 'detail' && selectedVariantCode && (
          <VariantDetailPage
            code={selectedVariantCode}
            onBack={() => setCurrentView('catalog')}
            onViewCart={() => setCurrentView('cart')}
          />
        )}

        {/* Vista Mi Carrito / Mi Pedido para Clientes */}
        {currentView === 'cart' && (
          <CustomerCartPage onBackToCatalog={() => setCurrentView('catalog')} />
        )}

        {/* Vista Comprobante con QR */}
        {currentView === 'receipt' && selectedReceipt && (
          <ReceiptPage
            receiptNumber={selectedReceipt}
            onBackToPos={() => {
              setSelectedReceipt(null);
              setCurrentView(isStaff ? 'pos' : 'catalog');
            }}
          />
        )}

        {/* Vista Cierre de Caja e Historial de Ventas (RF-20, RF-24) */}
        {currentView === 'sales' && (
          <SalesHistoryPage
            onViewReceipt={(receiptNumber) => {
              setSelectedReceipt(receiptNumber);
              setCurrentView('receipt');
            }}
            onNavigatePos={() => setCurrentView('pos')}
          />
        )}

        {currentView === 'delivery' && <DeliveryPage />}

        {currentView === 'refunds' && <RefundsPage />}

        {currentView === 'diferidas' && <DeferredSalePage />}

        {currentView === 'admin' && (isAdmin ? <AdminPage /> : <LoginPage onSuccess={() => setCurrentView('admin')} />)}

        {currentView === 'login' && (
          <LoginPage onSuccess={() => setCurrentView(isStaff ? 'pos' : 'catalog')} />
        )}
      </main>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <CartProvider>
        <ThemeProvider>
          <AppContent />
        </ThemeProvider>
      </CartProvider>
    </AuthProvider>
  );
};

export default App;
