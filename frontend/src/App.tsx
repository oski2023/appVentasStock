import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/layout/Navbar';
import { PosPage } from './pages/PosPage';
import { CatalogPage } from './pages/CatalogPage';
import { VariantDetailPage } from './pages/VariantDetailPage';
import { ReceiptPage } from './pages/ReceiptPage';
import { DeliveryPage } from './pages/DeliveryPage';
import { RefundsPage } from './pages/RefundsPage';
import { DeferredSalePage } from './pages/DeferredSalePage';
import { AdminPage } from './pages/AdminPage';
import { LoginPage } from './pages/LoginPage';

const AppContent: React.FC = () => {
  const { isAdmin } = useAuth();
  const [currentView, setCurrentView] = useState<string>('pos');
  const [selectedReceipt, setSelectedReceipt] = useState<string | null>(null);
  const [selectedVariantCode, setSelectedVariantCode] = useState<string | null>(null);

  const handleSaleCompleted = (receiptNumber: string) => {
    setSelectedReceipt(receiptNumber);
    setCurrentView('receipt');
  };

  const handleSelectVariantCode = (code: string) => {
    setSelectedVariantCode(code);
    setCurrentView('detail');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <Navbar
        currentView={currentView}
        onNavigate={(view) => {
          setSelectedVariantCode(null);
          setCurrentView(view);
        }}
        cartCount={0}
      />

      <main className="flex-1 max-w-4xl w-full mx-auto">
        {currentView === 'pos' && (
          <PosPage
            onSaleCompleted={handleSaleCompleted}
            onNavigateLogin={() => setCurrentView('login')}
          />
        )}

        {currentView === 'catalog' && (
          <CatalogPage onSelectVariantCode={handleSelectVariantCode} />
        )}

        {currentView === 'detail' && selectedVariantCode && (
          <VariantDetailPage
            code={selectedVariantCode}
            onBack={() => setCurrentView('catalog')}
          />
        )}

        {currentView === 'receipt' && selectedReceipt && (
          <ReceiptPage
            receiptNumber={selectedReceipt}
            onBackToPos={() => {
              setSelectedReceipt(null);
              setCurrentView('pos');
            }}
          />
        )}

        {currentView === 'delivery' && <DeliveryPage />}

        {currentView === 'refunds' && <RefundsPage />}

        {currentView === 'diferidas' && <DeferredSalePage />}

        {currentView === 'admin' && (isAdmin ? <AdminPage /> : <LoginPage onSuccess={() => setCurrentView('admin')} />)}

        {currentView === 'login' && (
          <LoginPage onSuccess={() => setCurrentView('pos')} />
        )}
      </main>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;
