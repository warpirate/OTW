# Razorpay Setup for Frontend

## Environment Variables Required

Create a `.env` file in the frontend directory with the following variables:

```env
# Razorpay Configuration
VITE_RAZORPAY_KEY_ID=your_razorpay_key_id

# API Configuration  
VITE_API_BASE_URL=http://localhost:3000
```

**Note:** This project uses Vite, so environment variables must be prefixed with `VITE_` to be accessible in the browser.

## Getting Razorpay Keys

1. Go to [Razorpay Dashboard](https://dashboard.razorpay.com/)
2. Navigate to Settings > API Keys
3. Generate Test/Live keys as needed
4. Copy the Key ID and Key Secret
5. Add them to your `.env` file

## Testing

The payment gateway will now open when clicking "Confirm Booking" with a UPI payment method selected.

## Features Implemented

- ✅ Student discount calculation and display
- ✅ Razorpay checkout modal integration
- ✅ Payment verification with backend
- ✅ Error handling and user feedback
- ✅ Payment status tracking
