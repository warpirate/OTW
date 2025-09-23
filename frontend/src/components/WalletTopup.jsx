import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  CreditCard, 
  Smartphone, 
  CheckCircle, 
  AlertCircle,
  Loader,
  Gift,
  Shield
} from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import AuthService from '../services/auth.service';
import { API_BASE_URL } from '../config';
import { toast } from 'react-toastify';

const WalletTopup = ({ onSuccess, onClose }) => {
  const { darkMode } = useTheme();
  const [amount, setAmount] = useState('');
  const [customAmount, setCustomAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('upi');
  const [processing, setProcessing] = useState(false);
  const [walletSettings, setWalletSettings] = useState(null);
  const [availablePromotions, setAvailablePromotions] = useState([]);

  // Quick amounts based on industry standards
  const quickAmounts = [100, 200, 500, 1000, 2000, 5000];

  useEffect(() => {
    loadWalletSettings();
    loadPromotions();
  }, []);

  const loadWalletSettings = async () => {
    try {
      const token = AuthService.getToken('customer');
      const response = await fetch(`${API_BASE_URL}/api/customer/wallet/settings`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setWalletSettings(data.data);
      }
    } catch (error) {
      console.error('Error loading wallet settings:', error);
    }
  };

  const loadPromotions = async () => {
    try {
      // This would be a real API call to get available promotions
      // For now, we'll simulate some promotions
      setAvailablePromotions([
        {
          id: 1,
          name: 'First Top-up Bonus',
          description: 'Get 10% bonus on your first top-up',
          bonus_percentage: 10,
          min_amount: 100,
          max_bonus: 100
        },
        {
          id: 2,
          name: 'Weekend Special',
          description: 'Get ₹50 bonus on top-ups above ₹500',
          bonus_amount: 50,
          min_amount: 500
        }
      ]);
    } catch (error) {
      console.error('Error loading promotions:', error);
    }
  };

  const calculateBonus = (topupAmount) => {
    if (!availablePromotions.length) return 0;

    let totalBonus = 0;
    const amount = parseFloat(topupAmount);

    availablePromotions.forEach(promo => {
      if (amount >= promo.min_amount) {
        if (promo.bonus_percentage) {
          const bonus = (amount * promo.bonus_percentage) / 100;
          totalBonus += Math.min(bonus, promo.max_bonus || bonus);
        } else if (promo.bonus_amount) {
          totalBonus += promo.bonus_amount;
        }
      }
    });

    return totalBonus;
  };

  const handleTopup = async () => {
    const topupAmount = customAmount || amount;
    
    if (!topupAmount || parseFloat(topupAmount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    const minAmount = walletSettings?.min_topup_amount?.value || 100;
    const maxAmount = walletSettings?.max_topup_amount?.value || 50000;

    if (parseFloat(topupAmount) < parseFloat(minAmount)) {
      toast.error(`Minimum top-up amount is ₹${minAmount}`);
      return;
    }

    if (parseFloat(topupAmount) > parseFloat(maxAmount)) {
      toast.error(`Maximum top-up amount is ₹${maxAmount}`);
      return;
    }

    setProcessing(true);
    try {
      const token = AuthService.getToken('customer');
      const response = await fetch(`${API_BASE_URL}/api/customer/wallet/topup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          amount: parseFloat(topupAmount),
          payment_method: paymentMethod
        })
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success('Top-up request created successfully!');
        
        // In a real implementation, you would redirect to Razorpay payment page
        // For now, we'll simulate the payment process
        if (paymentMethod === 'upi') {
          toast.info('Redirecting to payment gateway...');
          
          // Simulate payment processing
          setTimeout(() => {
            toast.success('Payment completed! Wallet updated.');
            if (onSuccess) onSuccess(data);
            if (onClose) onClose();
          }, 3000);
        } else {
          if (onSuccess) onSuccess(data);
          if (onClose) onClose();
        }
      } else {
        toast.error(data.message || 'Failed to create top-up request');
      }
    } catch (error) {
      console.error('Top-up error:', error);
      toast.error('Failed to process top-up request');
    } finally {
      setProcessing(false);
    }
  };

  const bonus = calculateBonus(customAmount || amount);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className={`rounded-xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="bg-green-100 p-2 rounded-lg">
              <Plus className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <h3 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Add Money to Wallet
              </h3>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Quick and secure top-up
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'} transition-colors`}
          >
            ×
          </button>
        </div>

        {/* Quick Amounts */}
        <div className="mb-6">
          <label className={`block text-sm font-medium mb-3 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            Quick Amounts
          </label>
          <div className="grid grid-cols-3 gap-3">
            {quickAmounts.map((quickAmount) => (
              <button
                key={quickAmount}
                onClick={() => {
                  setAmount(quickAmount.toString());
                  setCustomAmount('');
                }}
                className={`p-3 rounded-lg border transition-colors ${
                  amount === quickAmount.toString()
                    ? 'border-blue-500 bg-blue-50 text-blue-600 dark:bg-blue-900 dark:text-blue-300'
                    : darkMode
                    ? 'border-gray-600 bg-gray-700 text-white hover:bg-gray-600'
                    : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                ₹{quickAmount}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Amount */}
        <div className="mb-6">
          <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            Custom Amount
          </label>
          <input
            type="number"
            value={customAmount}
            onChange={(e) => {
              setCustomAmount(e.target.value);
              setAmount('');
            }}
            placeholder="Enter amount"
            min={walletSettings?.min_topup_amount?.value || 100}
            max={walletSettings?.max_topup_amount?.value || 50000}
            className={`w-full p-3 rounded-lg border transition-colors ${
              darkMode
                ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
            }`}
          />
          {walletSettings && (
            <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Min: ₹{walletSettings.min_topup_amount?.value} | Max: ₹{walletSettings.max_topup_amount?.value}
            </p>
          )}
        </div>

        {/* Bonus Information */}
        {bonus > 0 && (customAmount || amount) && (
          <div className="mb-6 p-4 rounded-lg bg-green-50 dark:bg-green-900 border border-green-200 dark:border-green-800">
            <div className="flex items-center space-x-2">
              <Gift className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm font-medium text-green-800 dark:text-green-200">
                  You'll get ₹{bonus} bonus!
                </p>
                <p className="text-xs text-green-600 dark:text-green-300">
                  Total amount: ₹{parseFloat(customAmount || amount) + bonus}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Payment Method */}
        <div className="mb-6">
          <label className={`block text-sm font-medium mb-3 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            Payment Method
          </label>
          <div className="space-y-2">
            <label className="flex items-center space-x-3 p-3 border border-gray-200 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700">
              <input
                type="radio"
                name="paymentMethod"
                value="upi"
                checked={paymentMethod === 'upi'}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="text-blue-600"
              />
              <Smartphone className="h-5 w-5 text-blue-600" />
              <div>
                <div className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>UPI Payment</div>
                <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Pay via UPI apps</div>
              </div>
            </label>
            <label className="flex items-center space-x-3 p-3 border border-gray-200 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700">
              <input
                type="radio"
                name="paymentMethod"
                value="card"
                checked={paymentMethod === 'card'}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="text-blue-600"
              />
              <CreditCard className="h-5 w-5 text-purple-600" />
              <div>
                <div className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>Card Payment</div>
                <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Credit/Debit card</div>
              </div>
            </label>
          </div>
        </div>

        {/* Security Notice */}
        <div className="mb-6 p-3 rounded-lg bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-800">
          <div className="flex items-center space-x-2">
            <Shield className="h-4 w-4 text-blue-600" />
            <p className="text-xs text-blue-800 dark:text-blue-200">
              Your payment is secured with bank-level encryption
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleTopup}
            disabled={processing || (!amount && !customAmount)}
            className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
          >
            {processing ? (
              <>
                <Loader className="h-4 w-4 animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" />
                <span>Add ₹{customAmount || amount || '0'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default WalletTopup;
