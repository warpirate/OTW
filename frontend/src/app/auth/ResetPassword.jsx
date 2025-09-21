import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'react-toastify';
import AuthService from '../services/auth.service';
import { isDarkMode, addThemeListener } from '../utils/themeUtils';
import Header from '../../components/Header';

const ResetPassword = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [darkMode, setDarkMode] = useState(isDarkMode());

  useEffect(() => {
    setDarkMode(isDarkMode());
    const cleanup = addThemeListener((mode) => setDarkMode(mode));
    return cleanup;
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirm) {
      toast.error('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      const res = await AuthService.resetPassword(token, password);
      toast.success(res.message || 'Password reset successfully');
      navigate('/login');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reset password');
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
          <h2 className="text-2xl font-bold mb-4">Reset Password</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                New Password
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-purple-500 bg-[var(--bg-secondary)] border-[var(--border-color)] text-[var(--text-primary)]"
                placeholder="Enter new password"
              />
            </div>
            <div>
              <label htmlFor="confirm" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                Confirm Password
              </label>
              <input
                id="confirm"
                type="password"
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-purple-500 bg-[var(--bg-secondary)] border-[var(--border-color)] text-[var(--text-primary)]"
                placeholder="Confirm new password"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full btn-brand disabled:opacity-50"
            >
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
