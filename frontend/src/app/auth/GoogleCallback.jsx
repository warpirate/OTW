import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import AuthService from '../services/auth.service';
import { Loader2 } from 'lucide-react';

const GoogleCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('processing'); // processing, success, error

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get token from URL params
        const token = searchParams.get('token');
        const error = searchParams.get('error');

        if (error) {
          setStatus('error');
          toast.error('Google authentication failed. Please try again.');
          setTimeout(() => navigate('/login'), 2000);
          return;
        }

        if (!token) {
          setStatus('error');
          toast.error('No authentication token received.');
          setTimeout(() => navigate('/login'), 2000);
          return;
        }

        // Handle OAuth callback with token
        const result = AuthService.handleOAuthCallback(token);

        if (result.success) {
          setStatus('success');
          toast.success('Successfully logged in with Google!');
          
          // Redirect to home page after short delay
          setTimeout(() => {
            navigate('/');
          }, 1000);
        } else {
          setStatus('error');
          toast.error('Failed to authenticate. Please try again.');
          setTimeout(() => navigate('/login'), 2000);
        }
      } catch (error) {
        console.error('OAuth callback error:', error);
        setStatus('error');
        toast.error('An error occurred during authentication.');
        setTimeout(() => navigate('/login'), 2000);
      }
    };

    handleCallback();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="max-w-md w-full space-y-8 p-8">
        <div className="text-center">
          {status === 'processing' && (
            <>
              <Loader2 className="w-16 h-16 mx-auto mb-4 text-blue-600 animate-spin" />
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Completing Sign In...
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Please wait while we authenticate your Google account.
              </p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-green-600 dark:text-green-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Success!
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Redirecting to your dashboard...
              </p>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-red-600 dark:text-red-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Authentication Failed
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Redirecting back to login...
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default GoogleCallback;
