import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Calendar, 
  MapPin, 
  Package,
  ArrowRight
} from 'lucide-react';
import BookingService from '../app/services/booking.service';
import AuthService from '../app/services/auth.service';
import BookingStatusBadge from './BookingStatusBadge';

const BookingTracker = ({ showAll = false }) => {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadBookings = async () => {
      if (!AuthService.isLoggedIn('customer')) {
        setLoading(false);
        return;
      }
      
      try {
        const response = await BookingService.bookings.getHistory();
        const allBookings = response.bookings || [];
        
        // Filter for active bookings or show all based on prop
        const activeBookings = showAll 
          ? allBookings.slice(0, 5) 
          : allBookings.filter(booking => 
              ['pending', 'confirmed', 'in_progress'].includes(booking.status?.toLowerCase())
            ).slice(0, 3);
        
        setBookings(activeBookings);
        setLoading(false);
      } catch (error) {
        console.error('Error loading bookings:', error);
        setLoading(false);
      }
    };

    loadBookings();
  }, [showAll]);



  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatPrice = (price) => {
    if (!price) return '$0.00';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'INR'
    }).format(price);
  };

  if (loading) {
    return (
      <div className="card p-6">
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-600"></div>
        </div>
      </div>
    );
  }

  if (bookings.length === 0) {
    return (
      <div className="card p-6">
        <div className="text-center py-8">
          <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {showAll ? 'No Bookings Yet' : 'No Active Bookings'}
          </h3>
          <p className="text-gray-600 mb-4">
            {showAll 
              ? 'You haven\'t made any bookings yet. Start by booking a service!'
              : 'You don\'t have any active bookings at the moment.'
            }
          </p>
          {!showAll && (
            <button
              onClick={() => navigate('/')}
              className="btn-brand"
            >
              Book a Service
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <Package className="h-6 w-6 text-purple-600" />
          <h2 className="text-xl font-semibold text-gray-900">
            {showAll ? 'Recent Bookings' : 'Active Bookings'}
          </h2>
        </div>
        <button
          onClick={() => navigate('/bookings')}
          className="flex items-center space-x-1 text-purple-600 hover:text-purple-700 text-sm font-medium"
        >
          <span>View All</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
      
      <div className="space-y-4">
        {bookings.map((booking) => (
          <div key={booking.booking_id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900">
                  Booking #{booking.booking_id}
                </h3>
                <p className="text-gray-600">
                  {booking.service_name} - {booking.subcategory_name}
                </p>
              </div>
              
              <BookingStatusBadge status={booking.status} />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-600">
                  {formatDate(booking.booking_date)}
                </span>
              </div>
              
              <div className="flex items-center space-x-2">
                <MapPin className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-600 truncate">
                  {booking.address || 'Address not provided'}
                </span>
              </div>
              
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-gray-900">
                  {formatPrice(booking.total_amount)}
                </span>
              </div>
            </div>
            
            <div className="flex items-center justify-between pt-3 border-t border-gray-100">
              <button
                onClick={() => navigate('/bookings')}
                className="text-purple-600 hover:text-purple-700 text-sm font-medium"
              >
                View Details
              </button>
              
              {['pending', 'confirmed'].includes(booking.status?.toLowerCase()) && (
                <button
                  onClick={() => navigate('/bookings')}
                  className="text-red-600 hover:text-red-700 text-sm font-medium"
                >
                  Cancel Booking
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BookingTracker; 