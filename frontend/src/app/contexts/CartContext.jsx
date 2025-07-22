import React, { createContext, useState, useContext, useEffect } from 'react';
import { toast } from 'react-toastify';
import CartService from '../services/cart.service';
import AuthService from '../services/auth.service';

// Create context
const CartContext = createContext();

// Custom hook to use the cart context
export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

// Cart provider component
export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState({ items: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load cart on initial render
  useEffect(() => {
    const loadCart = async () => {
      try {
        setLoading(true);
        const cartData = await CartService.getCart();
        setCart(cartData);
        setError(null);
      } catch (err) {
        setError('Failed to load cart');
        console.error('Error loading cart:', err);
      } finally {
        setLoading(false);
      }
    };

    loadCart();
  }, []);

  // Sync cart when user logs in or clear cart on logout
  useEffect(() => {
    const handleStorageChange = async (event) => {
      // Check if user just logged in
      if (AuthService.isLoggedIn('customer')) {
        try {
          await CartService.syncCartAfterLogin();
          // Reload cart after sync
          const cartData = await CartService.getCart();
          setCart(cartData);
        } catch (err) {
          console.error('Error syncing cart after login:', err);
        }
      } else if (event && event.key === 'jwt_token_customer' && event.newValue === null) {
        // User logged out (customer token was removed)
        setCart({ items: [], total: 0 });
      }
    };

    // Listen for storage events (login/logout)
    window.addEventListener('storage', handleStorageChange);
    
    // Check auth status on mount
    const checkAuthStatus = () => {
      if (!AuthService.isLoggedIn('customer')) {
        // If not logged in, ensure cart is empty
        setCart({ items: [], total: 0 });
      }
    };
    checkAuthStatus();
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Listen for logout events
  useEffect(() => {
    const handleLogout = () => {
      // Clear cart when user logs out
      setCart({ items: [], total: 0 });
    };
    
    // Create a custom event listener for logout
    window.addEventListener('customer_logout', handleLogout);
    
    return () => {
      window.removeEventListener('customer_logout', handleLogout);
    };
  }, []);
  
  // Listen for login events
  useEffect(() => {
    const handleLogin = async () => {
      try {
        setLoading(true);
        // Sync cart immediately after login
        await CartService.syncCartAfterLogin();
        // Reload cart after sync
        const cartData = await CartService.getCart();
        setCart(cartData);
      } catch (err) {
        console.error('Error syncing cart after login event:', err);
      } finally {
        setLoading(false);
      }
    };
    
    // Create a custom event listener for login
    window.addEventListener('customer_login', handleLogin);
    
    return () => {
      window.removeEventListener('customer_login', handleLogin);
    };
  }, []);

  // Add item to cart
  const addItem = async (item) => {
    try {
      setLoading(true);
      const updatedCart = await CartService.addToCart(item);
      setCart(updatedCart);
      toast.success(`${item.name} added to cart`);
      return updatedCart;
    } catch (err) {
      setError('Failed to add item to cart');
      toast.error('Failed to add item to cart');
      console.error('Error adding item to cart:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Update item quantity
  const updateItemQuantity = async (itemId, quantity) => {
    try {
      setLoading(true);
      
      // Validate quantity
      if (quantity < 1) {
        return removeItem(itemId);
      }
      
      const updatedCart = await CartService.updateCartItemQuantity(itemId, quantity);
      setCart(updatedCart);
      return updatedCart;
    } catch (err) {
      setError('Failed to update item quantity');
      toast.error('Failed to update item quantity');
      console.error('Error updating item quantity:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Remove item from cart
  const removeItem = async (itemId) => {
    try {
      setLoading(true);
      const updatedCart = await CartService.removeFromCart(itemId);
      setCart(updatedCart);
      toast.info('Item removed from cart');
      return updatedCart;
    } catch (err) {
      setError('Failed to remove item from cart');
      toast.error('Failed to remove item from cart');
      console.error('Error removing item from cart:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Clear cart
  const clearCart = async () => {
    try {
      setLoading(true);
      const emptyCart = await CartService.clearCart();
      setCart(emptyCart);
      toast.info('Cart cleared');
      return emptyCart;
    } catch (err) {
      setError('Failed to clear cart');
      toast.error('Failed to clear cart');
      console.error('Error clearing cart:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Checkout
  const checkout = async (checkoutData) => {
    try {
      setLoading(true);
      const result = await CartService.checkout(checkoutData);
      // Clear cart after successful checkout
      setCart({ items: [], total: 0 });
      toast.success('Checkout successful!');
      return result;
    } catch (err) {
      setError('Checkout failed');
      toast.error('Checkout failed. Please try again.');
      console.error('Error during checkout:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Get cart item count
  const getItemCount = () => {
    return cart.items.reduce((count, item) => count + item.quantity, 0);
  };

  // Context value
  const value = {
    cart,
    loading,
    error,
    addItem,
    updateItemQuantity,
    removeItem,
    clearCart,
    checkout,
    getItemCount
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export default CartContext; 