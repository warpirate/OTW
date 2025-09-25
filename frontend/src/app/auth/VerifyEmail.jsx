import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import AuthService from '../services/auth.service';
import Header from '../../components/Header';

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

const VerifyEmail = () => {
  const query = useQuery();
  const navigate = useNavigate();
  const [status, setStatus] = useState('verifying'); // verifying | success | error
  const [message, setMessage] = useState('');

  useEffect(() => {
    const token = query.get('token');
    if (!token) {
      setStatus('error');
      setMessage('Missing verification token.');
      return;
    }

    const verify = async () => {
      try {
        await AuthService.verifyEmail(token);
        setStatus('success');
        setMessage('Your email has been verified. You can now sign in.');
        toast.success('Email verified successfully!');
        setTimeout(() => navigate('/login'), 1500);
      } catch (err) {
        const msg = err?.response?.data?.message || 'Invalid or expired verification link.';
        setStatus('error');
        setMessage(msg);
        toast.error(msg);
      }
    };

    verify();
  }, [query, navigate]);

  return (
    <div className="min-h-screen bg-[var(--bg-secondary)]">
      <Header />
      <div className="max-w-xl mx-auto p-6 mt-10 bg-[var(--bg-primary)] rounded-xl border border-[var(--border-color)] text-[var(--text-primary)]">
        <h1 className="text-2xl font-bold mb-3">Email Verification</h1>
        {status === 'verifying' && (
          <p>Verifying your email, please wait...</p>
        )}
        {status === 'success' && (
          <div className="text-green-600">{message}</div>
        )}
        {status === 'error' && (
          <div className="text-red-600">{message}</div>
        )}
      </div>
    </div>
  );
};

export default VerifyEmail;
