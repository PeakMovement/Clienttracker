import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import AppShell from '../components/layout/AppShell';
import api from '../api';

const DEPARTMENTS = [
  'Physio', 'Bio', 'Medicine', 'Massage',
  'Strength Trainer', 'Group Strength Class', 'Injury Rehab Class',
];

function FollowUpFields({ value, onChange }) {
  return (
    <div className="mt-3 p-4 bg-blue-50 rounded-xl space-y-2">
      <label className="label text-blue-800">Follow-up date *</label>
      <input
        type="date"
        className="input"
        value={value}
        onChange={e => onChange(e.target.value)}
        min={new Date().toISOString().slice(0, 10)}
      />
    </div>
  );
}

function NoFollowUpFields({ value, onChange }) {
  return (
    <div className="mt-3 p-4 bg-purple-50 rounded-xl">
      <p className="label text-purple-800 mb-3">Did you ask for a Google review? *</p>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => onChange(true)}
          className={`flex-1 py-3 rounded-xl text-lg font-semibold border-2 transition-colors ${
            value === true
              ? 'bg-purple-600 text-white border-purple-600'
              : 'bg-white text-gray-700 border-gray-200'
          }`}
        >
          Yes
        </button>
        <button
          type="button"
          onClick={() => onChange(false)}
          className={`flex-1 py-3 rounded-xl text-lg font-semibold border-2 transition-colors ${
            value === false
              ? 'bg-purple-600 text-white border-purple-600'
              : 'bg-white text-gray-700 border-gray-200'
          }`}
        >
          No
        </button>
      </div>
    </div>
  );
}

function ReferFields({ value, onChange }) {
  return (
    <div className="mt-3 p-4 bg-orange-50 rounded-xl">
      <p className="label text-orange-800 mb-3">Refer to department *</p>
      <div className="grid grid-cols-2 gap-2">
        {DEPARTMENTS.map(dept => (
          <button
            key={dept}
            type="button"
            onClick={() => onChange(dept)}
            className={`py-3 px-2 rounded-xl text-base font-medium border-2 transition-colors ${
              value === dept
                ? 'bg-orange-500 text-white border-orange-500'
                : 'bg-white text-gray-700 border-gray-200'
            }`}
          >
            {dept}
          </button>
        ))}
      </div>
    </div>
  );
}

const PLAN_TYPES = [
  { id: 'follow_up', label: 'Follow Up', color: 'blue' },
  { id: 'no_follow_up', label: 'No Follow Up', color: 'purple' },
  { id: 'refer', label: 'Refer', color: 'orange' },
];

export default function NewSessionPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const clientId = searchParams.get('clientId');
  const clientName = searchParams.get('clientName') || '';
  const defaultSession = parseInt(searchParams.get('sessionNumber') || '1', 10);

  const [sessionNumber, setSessionNumber] = useState(defaultSession);
  const [selectedTypes, setSelectedTypes] = useState([]);
  const [followUpDate, setFollowUpDate] = useState('');
  const [googleReviewAsked, setGoogleReviewAsked] = useState(null);
  const [referDepartment, setReferDepartment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const toggleType = (type) => {
    setSelectedTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const isValid = () => {
    if (!clientId) return false;
    if (selectedTypes.length === 0) return false;
    if (selectedTypes.includes('follow_up') && !followUpDate) return false;
    if (selectedTypes.includes('no_follow_up') && googleReviewAsked === null) return false;
    if (selectedTypes.includes('refer') && !referDepartment) return false;
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isValid()) return;
    setSubmitting(true);
    setError('');

    const plans = selectedTypes.map(type => {
      if (type === 'follow_up') return { type, followUpDate };
      if (type === 'no_follow_up') return { type, googleReviewAsked };
      if (type === 'refer') return { type, referDepartment };
      return { type };
    });

    try {
      await api.post('/sessions', { clientId: parseInt(clientId), sessionNumber, plans });
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save session');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppShell title="New Session" backTo="/dashboard">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Client info */}
        <div className="card">
          <p className="label">Client</p>
          <p className="text-xl font-semibold text-gray-900">{clientName || 'Unknown'}</p>
        </div>

        {/* Session number */}
        <div className="card">
          <label className="label">Session Number</label>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSessionNumber(n => Math.max(1, n - 1))}
              className="w-12 h-12 rounded-xl border border-gray-300 text-2xl font-bold text-gray-600 active:bg-gray-100 flex items-center justify-center"
            >
              −
            </button>
            <span className="text-3xl font-bold text-brand-700 w-12 text-center">{sessionNumber}</span>
            <button
              type="button"
              onClick={() => setSessionNumber(n => n + 1)}
              className="w-12 h-12 rounded-xl border border-gray-300 text-2xl font-bold text-gray-600 active:bg-gray-100 flex items-center justify-center"
            >
              +
            </button>
          </div>
        </div>

        {/* Plan type selection */}
        <div className="card">
          <p className="label mb-3">Next Session Plan <span className="text-gray-400 font-normal">(select all that apply)</span></p>
          <div className="space-y-3">
            {PLAN_TYPES.map(({ id, label, color }) => {
              const isSelected = selectedTypes.includes(id);
              const colorMap = {
                blue: isSelected ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-200',
                purple: isSelected ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-gray-700 border-gray-200',
                orange: isSelected ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-gray-700 border-gray-200',
              };
              return (
                <div key={id}>
                  <button
                    type="button"
                    onClick={() => toggleType(id)}
                    className={`w-full py-4 px-4 rounded-2xl text-lg font-semibold border-2 text-left transition-colors ${colorMap[color]}`}
                  >
                    <span className="mr-3">{isSelected ? '✓' : '○'}</span>
                    {label}
                  </button>
                  {isSelected && id === 'follow_up' && (
                    <FollowUpFields value={followUpDate} onChange={setFollowUpDate} />
                  )}
                  {isSelected && id === 'no_follow_up' && (
                    <NoFollowUpFields value={googleReviewAsked} onChange={setGoogleReviewAsked} />
                  )}
                  {isSelected && id === 'refer' && (
                    <ReferFields value={referDepartment} onChange={setReferDepartment} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-base">
            {error}
          </div>
        )}

        <button
          type="submit"
          className="btn-primary w-full"
          disabled={!isValid() || submitting}
        >
          {submitting ? 'Saving...' : 'Save Session'}
        </button>
      </form>
    </AppShell>
  );
}
