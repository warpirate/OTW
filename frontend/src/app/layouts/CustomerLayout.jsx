import React from 'react';
import { Outlet } from 'react-router-dom';

const CustomerLayout = () => {
  return (
    <div className="min-h-screen bg-[var(--bg-secondary)] customer-theme">
      <Outlet />
    </div>
  );
};

export default CustomerLayout;
