import React, { createContext, useContext, useState, useEffect } from 'react';
import { ApiClient } from '../services/api';

export interface CartItem {
  variant_id: string;
  codigo: string;
  sku: string;
  producto_nombre: string;
  talle?: string;
  color?: string;
  precio: number;
  cantidad: number;
  stock_disponible: number;
}

export interface CustomerOrder {
  orderNumber: string;
  items: CartItem[];
  total: number;
  createdAt: string;
}

interface CartContextType {
  items: CartItem[];
  addToCart: (item: Omit<CartItem, 'cantidad'>, cantidad?: number) => { success: boolean; message?: string };
  updateQuantity: (variant_id: string, cantidad: number) => void;
  removeFromCart: (variant_id: string) => void;
  clearCart: () => void;
  itemCount: number;
  total: number;
  activeOrder: CustomerOrder | null;
  createOrder: () => Promise<CustomerOrder | null>;
  clearOrder: () => void;
}

const CartContext = createContext<CartContextType>({} as CartContextType);

const STORAGE_KEY = 'app_customer_cart_v1';
const ORDER_STORAGE_KEY = 'app_customer_active_order_v1';

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [activeOrder, setActiveOrder] = useState<CustomerOrder | null>(() => {
    try {
      const saved = localStorage.getItem(ORDER_STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
      console.error('Error guardando carrito:', e);
    }
  }, [items]);

  useEffect(() => {
    try {
      if (activeOrder) {
        localStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify(activeOrder));
      } else {
        localStorage.removeItem(ORDER_STORAGE_KEY);
      }
    } catch (e) {
      console.error('Error guardando pedido:', e);
    }
  }, [activeOrder]);

  const addToCart = (
    item: Omit<CartItem, 'cantidad'>,
    cantidad: number = 1
  ): { success: boolean; message?: string } => {
    if (item.stock_disponible <= 0) {
      return { success: false, message: 'Producto sin stock disponible.' };
    }

    let success = true;
    let message = '';

    setItems((prev) => {
      const existing = prev.find((i) => i.variant_id === item.variant_id);
      if (existing) {
        const nuevaCantidad = existing.cantidad + cantidad;
        if (nuevaCantidad > item.stock_disponible) {
          success = false;
          message = `Stock máximo disponible: ${item.stock_disponible} unidades.`;
          return prev;
        }
        return prev.map((i) =>
          i.variant_id === item.variant_id ? { ...i, cantidad: nuevaCantidad } : i
        );
      } else {
        if (cantidad > item.stock_disponible) {
          success = false;
          message = `Stock máximo disponible: ${item.stock_disponible} unidades.`;
          return prev;
        }
        return [...prev, { ...item, cantidad }];
      }
    });

    return { success, message };
  };

  const updateQuantity = (variant_id: string, cantidad: number) => {
    if (cantidad <= 0) {
      removeFromCart(variant_id);
      return;
    }

    setItems((prev) =>
      prev.map((i) => {
        if (i.variant_id === variant_id) {
          const qty = Math.min(cantidad, i.stock_disponible);
          return { ...i, cantidad: qty };
        }
        return i;
      })
    );
  };

  const removeFromCart = (variant_id: string) => {
    setItems((prev) => prev.filter((i) => i.variant_id !== variant_id));
  };

  const clearCart = () => {
    setItems([]);
  };

  const itemCount = items.reduce((sum, item) => sum + item.cantidad, 0);

  const total = items.reduce((sum, item) => sum + item.precio * item.cantidad, 0);

  const createOrder = async (): Promise<CustomerOrder | null> => {
    if (items.length === 0) return null;

    try {
      const saved = await ApiClient.post<CustomerOrder>('/sales/customer-orders', {
        items: [...items],
        total,
      });
      setActiveOrder(saved);
      clearCart();
      return saved;
    } catch {
      // Fallback local en caso de contingencia
      const randNum = Math.floor(1000 + Math.random() * 9000);
      const orderNumber = `PED-${Date.now().toString(36).toUpperCase().slice(-4)}-${randNum}`;

      const newOrder: CustomerOrder = {
        orderNumber,
        items: [...items],
        total,
        createdAt: new Date().toISOString(),
      };

      setActiveOrder(newOrder);
      clearCart();
      return newOrder;
    }
  };

  const clearOrder = () => {
    setActiveOrder(null);
  };

  return (
    <CartContext.Provider
      value={{
        items,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
        itemCount,
        total,
        activeOrder,
        createOrder,
        clearOrder,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);
