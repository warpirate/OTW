import { Navigate } from 'react-router-dom';

// Worker Components
import WorkerLogin from '../auth/WorkerLogin';
import WorkerSignup from '../auth/WorkerSignup';
import WorkerDashboard from '../features/worker/WorkerDashboard';
import WorkerJobs from '../features/worker/WorkerJobs';
import WorkerSchedule from '../features/worker/WorkerSchedule';
import WorkerProfile from '../features/worker/WorkerProfile';
import WorkerSettings from '../features/worker/WorkerSettings';

// Layouts
import WorkerLayout from '../layouts/WorkerLayout';

// Protected Route Component
const WorkerProtectedRoute = ({ children }) => {
  const workerToken = localStorage.getItem('jwt_token');
  const userInfo = localStorage.getItem('user_info');
  
  if (!workerToken || !userInfo) {
    return <Navigate to="/worker/login" replace />;
  }
  
  try {
    const user = JSON.parse(userInfo);
    if (user.role !== 'worker') {
      return <Navigate to="/worker/login" replace />;
    }
  } catch (error) {
    return <Navigate to="/worker/login" replace />;
  }
  
  return children;
};

// Worker Routes Configuration
export const workerRoutes = [
  {
    path: "/worker/login",
    element: <WorkerLogin />
  },
  {
    path: "/worker/signup", 
    element: <WorkerSignup />
  },
  {
    path: "/worker",
    element: (
      <WorkerProtectedRoute>
        <WorkerLayout />
      </WorkerProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <Navigate to="/worker/dashboard" replace />
      },
      {
        path: "dashboard",
        element: <WorkerDashboard />
      },
      // Additional worker routes can be added here
      {
        path: "profile",
        element: <WorkerProfile />
      },
      {
        path: "jobs",
        element: <WorkerJobs />
      },
      {
        path: "schedule",
        element: <WorkerSchedule />
      },
      {
        path: "earnings",
        element: <div>Worker Earnings Page (Coming Soon)</div>
      },
      {
        path: "settings",
        element: <WorkerSettings />
      }
    ]
  }
];

export default workerRoutes;
