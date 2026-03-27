import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppShell from '../components/layout/AppShell';
import PinPad from '../components/auth/PinPad';
import { useAuth } from '../context/AuthContext';
import api from '../api';

const STEPS = ['current', 'new', 'confirm'];

export default function ProfilePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [changing, setChanging] = useState(false);
  const [step, setStep] = useState('current'); // 'current' | 'new' | 'confirm'
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const backTo = user?.isAdmin ? '/admin' : '/dashboard';

  const handleCurrentPin = (pin) => {
    setCurrentPin(pin);
    setError('');
    setStep('new');
  };

  const handleNewPin = (pin) => {
    setNewPin(pin);
    setError('');
    setStep('confirm');
  };

  const handleConfirmPin = async (pin) => {
    if (pin !== newPin) {
      setError('PINs do not match — try again');
      setNewPin('');
      setStep('new');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await api.put('/auth/change-pin', { currentPin, newPin });
      setSuccess(true);
      setChanging(false);
      setStep('current');
      setCurrentPin('');
      setNewPin('');
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to change PIN';
      setError(msg);
      // If current PIN was wrong, restart from the beginning
      if (err.response?.status === 401) {
        setStep('current');
        setCurrentPin('');
        setNewPin('');
      } else {
        setStep('new');
        setNewPin('');
      }
    } finally {
      setLoading(false);
    }
  };

  const cancelChange = () => {
    setChanging(false);
    setStep('current');
    setCurrentPin('');
    setNewPin('');
    setError('');
  };

  const stepLabel = {
    current: 'Enter your current PIN',
    new: 'Enter your new PIN',
    confirm: 'Confirm your new PIN',
  };

  const stepNum = STEPS.indexOf(step) + 1;

  return (
    <AppShell title="My Profile" backTo={backTo}>
      <div className="space-y-6 pt-2">
        {/* Profile card */}
        <div className="card text-center py-8">
          {/* Avatar circle */}
          <div className="mx-auto mb-4 w-20 h-20 rounded-full bg-brand-600 flex items-center justify-center">
            <span className="text-white text-3xl font-bold">
              {user?.name?.charAt(0).toUpperCase()}
            </span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900">{user?.name}</h2>
          <p className="text-gray-500 mt-1">{user?.profession}</p>
          {user?.isAdmin && (
            <span className="inline-block mt-2 text-xs font-semibold bg-brand-100 text-brand-700 px-3 py-1 rounded-full">
              Admin
            </span>
          )}
        </div>

        {/* Success banner */}
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-800 rounded-2xl px-4 py-3 text-center font-medium">
            PIN changed successfully!
          </div>
        )}

        {/* PIN change section */}
        {!changing ? (
          <button
            onClick={() => { setSuccess(false); setChanging(true); }}
            className="btn-primary w-full"
          >
            Change PIN
          </button>
        ) : (
          <div className="card space-y-5">
            {/* Step indicator */}
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-lg font-semibold text-gray-800">{stepLabel[step]}</h3>
              <span className="text-sm text-gray-400">Step {stepNum} of 3</span>
            </div>

            {/* Progress dots */}
            <div className="flex gap-2 justify-center">
              {STEPS.map((s) => (
                <div
                  key={s}
                  className={`h-2 rounded-full transition-all ${
                    STEPS.indexOf(s) < stepNum ? 'bg-brand-600 w-8' : 'bg-gray-200 w-4'
                  }`}
                />
              ))}
            </div>

            <PinPad
              key={step}
              onSubmit={
                step === 'current' ? handleCurrentPin :
                step === 'new'     ? handleNewPin :
                                     handleConfirmPin
              }
              loading={loading}
              error={error}
            />

            <button
              onClick={cancelChange}
              className="btn-secondary w-full"
              disabled={loading}
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </AppShell>
  );
}
