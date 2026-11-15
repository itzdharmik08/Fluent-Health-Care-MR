import React from 'react';
import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom';
import { AppLayout } from './App';
import { Login } from '../pages/Login';
import { AuthCallback } from '../pages/AuthCallback';
import { VerifySuccess } from '../pages/VerifySuccess';
import { VerifyError } from '../pages/VerifyError';
import { ResetPassword } from '../pages/ResetPassword';
import { Dashboard } from '../pages/Dashboard';
import { Doctors } from '../pages/Doctors';
import { Medicines } from '../pages/Medicines';
import { Orders } from '../pages/Orders';
import { NewOrder } from '../pages/NewOrder';
import { ImportMedicines } from '../pages/ImportMedicines';
import { SettingsPage } from '../pages/Settings';
import { useAuth } from '../hooks/useAuth';
import { CapacitorAuthListener } from './CapacitorAuthListener';

// Root wrapper to ensure CapacitorAuthListener is active globally
const RootLayout: React.FC = () => {
  return (
    <>
      <CapacitorAuthListener />
      <Outlet />
    </>
  );
};

// Protected Route Guard Component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-xs font-semibold text-slate-400">
        Loading Apex MR session...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      {
        path: 'login',
        element: <Login />,
      },
      {
        path: 'auth/callback',
        element: <AuthCallback />,
      },
      {
        path: 'auth/verify-success',
        element: <VerifySuccess />,
      },
      {
        path: 'auth/verify-error',
        element: <VerifyError />,
      },
      {
        path: 'reset-password',
        element: <ResetPassword />,
      },
      {
        path: '',
        element: (
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        ),
        children: [
          { index: true, element: <Dashboard /> },
          { path: 'doctors', element: <Doctors /> },
          { path: 'medicines', element: <Medicines /> },
          { path: 'orders', element: <Orders /> },
          { path: 'orders/new', element: <NewOrder /> },
          { path: 'orders/edit/:orderId', element: <NewOrder /> },
          { path: 'monthly', element: <Navigate to="/orders?filter=monthly" replace /> },
          { path: 'import', element: <ImportMedicines /> },
          { path: 'backup', element: <Navigate to="/settings?tab=backup" replace /> },
          { path: 'settings', element: <SettingsPage /> },
        ],
      },
      {
        path: '*',
        element: <Navigate to="/" replace />,
      },
    ],
  },
]);
