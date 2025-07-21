import React from 'react';
import { Outlet } from 'react-router-dom';

const WorkerLayout = () => {
  return (
    <div className="min-h-screen bg-[var(--bg-secondary)]">
      <Outlet />
    </div>
  );
};

export default WorkerLayout;
