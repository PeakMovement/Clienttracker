import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import PinPad from '../components/auth/PinPad';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handlePin = async (pin) => {
    setLoading(true);
    setError('');
    try {
      const user = await login(pin);
      navigate(user.isAdmin ? '/admin' : '/dashboard', { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || 'Incorrect PIN. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-600 flex flex-col items-center justify-center px-6">
      <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-brand-700">Client Tracker</h1>
          <p className="text-gray-500 mt-2 text-lg">Enter your 4-digit PIN</p>
        </div>
        <PinPad onSubmit={handlePin} loading={loading} error={error} />
      </div>
    </div>
  );
}
