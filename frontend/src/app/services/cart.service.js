import axios from 'axios';
import { API_BASE_URL } from '../config';
import AuthService from './auth.service';

const apiClient = axios.create({
  baseURL: `${API_BASE_URL}/api/customer`,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add a request interceptor to include JWT token in the headers
apiClient.interceptors.request.use(
  (config) => {
    // Get token from AuthService based on current role (customer by default)
    const token = AuthService.getToken('customer');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      // Use AuthService for proper token cleanup
      AuthService.logout(null, 'customer');
      
      // Redirect to login if not already there
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Local storage key for cart
const CART_STORAGE_KEY = 'otw_cart';

const CartService = {
  // Get cart items from local storage or API
  getCart: async () => {
    try {
      // If user is authenticated, fetch from API
      if (AuthService.isLoggedIn('customer')) {
        const response = await apiClient.get('/cart');
        return CartService.utils.mapCartData(response.data);
      } else {
        // Otherwise, get from local storage
        const cartData = localStorage.getItem(CART_STORAGE_KEY);
        return cartData ? JSON.parse(cartData) : { items: [], total: 0 };
      }
    } catch (error) {
      console.error('Error fetching cart:', error);
      // Fallback to local storage if API fails
      const cartData = localStorage.getItem(CART_STORAGE_KEY);
      return cartData ? JSON.parse(cartData) : { items: [], total: 0 };
    }
  },

  // Add item to cart
  addToCart: async (serviceItem) => {
    try {
      if (AuthService.isLoggedIn('customer')) {
        // Send to API if logged in
        const cartItem = {
          subcategory_id: serviceItem.id || serviceItem.subcategory_id,
          quantity: serviceItem.quantity || 1
        };
        const response = await apiClient.post('/cart/add', cartItem);
        return CartService.utils.mapCartData(response.data);
      } else {
        // Otherwise, store in local storage
        const cart = CartService.getLocalCart();
        
        // Check if item already exists in cart
        const existingItemIndex = cart.items.findIndex(item => item.id === serviceItem.id);
        
        if (existingItemIndex >= 0) {
          // Update quantity if item exists
          cart.items[existingItemIndex].quantity += serviceItem.quantity || 1;
        } else {
          // Add new item with quantity
          cart.items.push({
            ...serviceItem,
            quantity: serviceItem.quantity || 1
          });
        }
        
        // Recalculate total
        cart.total = cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        
        // Save to local storage
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
        return cart;
      }
    } catch (error) {
      console.error('Error adding to cart:', error);
      throw error;
    }
  },

  // Update cart item quantity
  updateCartItemQuantity: async (itemId, quantity) => {
    try {
      if (AuthService.isLoggedIn('customer')) {
        // Update via API if logged in
        const response = await apiClient.put(`/cart/update/${itemId}`, { quantity });
        return CartService.utils.mapCartData(response.data);
      } else {
        // Update in local storage
        const cart = CartService.getLocalCart();
        const itemIndex = cart.items.findIndex(item => item.id === itemId);
        
        if (itemIndex >= 0) {
          cart.items[itemIndex].quantity = quantity;
          
          // Recalculate total
          cart.total = cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
          
          // Save to local storage
          localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
        }
        
        return cart;
      }
    } catch (error) {
      console.error('Error updating cart item:', error);
      throw error;
    }
  },

  // Remove item from cart
  removeFromCart: async (itemId) => {
    try {
      if (AuthService.isLoggedIn('customer')) {
        // Remove via API if logged in
        const response = await apiClient.delete(`/cart/remove/${itemId}`);
        return CartService.utils.mapCartData(response.data);
      } else {
        // Remove from local storage
        const cart = CartService.getLocalCart();
        cart.items = cart.items.filter(item => item.id !== itemId);
        
        // Recalculate total
        cart.total = cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        
        // Save to local storage
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
        return cart;
      }
    } catch (error) {
      console.error('Error removing from cart:', error);
      throw error;
    }
  },

  // Clear cart
  clearCart: async () => {
    try {
      if (AuthService.isLoggedIn('customer')) {
        // Clear via API if logged in
        const response = await apiClient.delete('/cart/clear');
        return CartService.utils.mapCartData(response.data);
      } else {
        // Clear local storage
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify({ items: [], total: 0 }));
        return { items: [], total: 0 };
      }
    } catch (error) {
      console.error('Error clearing cart:', error);
      throw error;
    }
  },

  // Sync local cart with server after login
  syncCartAfterLogin: async () => {
    try {
      const localCart = CartService.getLocalCart();
      
      if (localCart.items.length > 0) {
        // Send local cart to server
        const response = await apiClient.post('/cart/sync', localCart);
        
        // Clear local storage after sync
        localStorage.removeItem(CART_STORAGE_KEY);
        
        return CartService.utils.mapCartData(response.data);
      }
      
      return { items: [], total: 0 };
    } catch (error) {
      console.error('Error syncing cart:', error);
      throw error;
    }
  },

  // Helper method to get cart from local storage
  getLocalCart: () => {
    const cartData = localStorage.getItem(CART_STORAGE_KEY);
    return cartData ? JSON.parse(cartData) : { items: [], total: 0 };
  },

  // Proceed to checkout
  checkout: async (checkoutData) => {
    try {
      const response = await apiClient.post('/checkout', checkoutData);
      return response.data;
    } catch (error) {
      console.error('Error during checkout:', error);
      throw error;
    }
  },

  // Utility methods
  utils: {
    // Map backend cart data to frontend format
    mapCartData: (backendCart) => {
      const items = backendCart.items || [];
      return {
        items: items.map(item => ({
          id: item.id,
          subcategory_id: item.subcategory_id,
          name: item.name,
          description: item.description,
          price: item.price,
          quantity: item.quantity,
          total_price: item.total_price
        })),
        total: backendCart.total || 0
      };
    }
  }
};

export default CartService; 