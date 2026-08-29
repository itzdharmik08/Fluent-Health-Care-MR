import React from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppLayout } from './App';
import { Login } from '../pages/Login';
import { Dashboard } from '../pages/Dashboard';
import { Doctors } from '../pages/Doctors';
import { Medicines } from '../pages/Medicines';
import { Orders } from '../pages/Orders';
import { NewOrder } from '../pages/NewOrder';
import { ImportMedicines } from '../pages/ImportMedicines';
import { SettingsPage } from '../pages/Settings';
import { useAuth } from '../hooks/useAuth';

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
    path: '/login',
    element: <Login />,
  },
  {
    path: '/',
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
      { path: 'import', element: <ImportMedicines /> },
      { path: 'settings', element: <SettingsPage /> },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
]);
