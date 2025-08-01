import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'react-toastify';
import AuthService from '../services/auth.service';
import { isDarkMode, addThemeListener } from '../utils/themeUtils';
import Header from '../../components/Header';

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [darkMode, setDarkMode] = useState(isDarkMode());

  useEffect(() => {
    setDarkMode(isDarkMode());
    const cleanup = addThemeListener((mode) => setDarkMode(mode));
    return cleanup;
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await AuthService.forgotPassword(email);
      toast.success(res.message || 'If that email is in our database, a reset link was sent.');
      setSubmitted(true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to request password reset');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen transition-colors bg-[var(--bg-secondary)]">
      <Header />
      <div className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md bg-[var(--bg-primary)] rounded-xl shadow-lg p-8 border border-[var(--border-color)] text-[var(--text-primary)]">
          <Link to="/" className="inline-flex items-center mb-4 text-blue-600 hover:text-blue-500">
            <ArrowLeft className="h-5 w-5 mr-2" /> Back to Home
          </Link>
          <h2 className="text-2xl font-bold mb-4">Forgot Password</h2>
          {!submitted ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-[var(--bg-secondary)] border-[var(--border-color)] text-[var(--text-primary)]"
                  placeholder="Enter your email"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>
            </form>
          ) : (
            <div className="text-center">
              <p className="mb-4">If that email is in our database, a reset link has been sent.</p>
              <button
                onClick={() => navigate('/login')}
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Back to Login
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
