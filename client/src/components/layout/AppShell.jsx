import { useAuth } from '../../context/AuthContext';
import { useNavigate, useLocation, Link } from 'react-router-dom';

export default function AppShell({ children, title, backTo }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top bar */}
      <header className="bg-brand-600 text-white px-4 py-3 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          {backTo && (
            <button
              onClick={() => navigate(backTo)}
              className="text-white p-1 -ml-1 rounded-xl active:bg-brand-700"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          <h1 className="text-xl font-bold">{title || 'Client Tracker'}</h1>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-brand-100 hidden sm:block">{user?.name}</span>
          {user?.isAdmin && location.pathname !== '/admin' && (
            <Link to="/admin" className="text-sm bg-brand-700 px-3 py-1 rounded-xl active:bg-brand-800">
              Admin
            </Link>
          )}
          {user?.isAdmin && location.pathname === '/admin' && (
            <Link to="/dashboard" className="text-sm bg-brand-700 px-3 py-1 rounded-xl active:bg-brand-800">
              My Clients
            </Link>
          )}
          <button
            onClick={handleLogout}
            className="text-sm bg-brand-700 px-3 py-1 rounded-xl active:bg-brand-800"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 p-4 max-w-2xl mx-auto w-full">
        {children}
      </main>
    </div>
  );
}
