import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

import LoginPage from './pages/LoginPage';
import StaffDashboard from './pages/StaffDashboard';
import NewSessionPage from './pages/NewSessionPage';
import ClientDetailPage from './pages/ClientDetailPage';
import AdminDashboard from './pages/admin/AdminDashboard';
import StaffManagementPage from './pages/admin/StaffManagementPage';
import BookingImportPage from './pages/admin/BookingImportPage';

function ProtectedRoute({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function AdminRoute({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (!user.isAdmin) return <Navigate to="/dashboard" replace />;
  return children;
}

function RootRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.isAdmin) return <Navigate to="/admin" replace />;
  return <Navigate to="/dashboard" replace />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/dashboard" element={<ProtectedRoute><StaffDashboard /></ProtectedRoute>} />
      <Route path="/session/new" element={<ProtectedRoute><NewSessionPage /></ProtectedRoute>} />
      <Route path="/clients/:id" element={<ProtectedRoute><ClientDetailPage /></ProtectedRoute>} />
      <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
      <Route path="/admin/staff" element={<AdminRoute><StaffManagementPage /></AdminRoute>} />
      <Route path="/admin/import" element={<AdminRoute><BookingImportPage /></AdminRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
