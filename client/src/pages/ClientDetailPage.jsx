import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AppShell from '../components/layout/AppShell';
import api from '../api';

function PlanTypeLabel({ plan }) {
  if (plan.plan_type === 'follow_up') {
    return (
      <div className="text-sm">
        <span className="font-medium text-blue-700">Follow Up</span>
        <span className="text-gray-500"> · {new Date(plan.follow_up_date + 'T00:00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
        {plan.is_completed === 1 && <span className="ml-2 text-xs text-green-600 font-medium">✓ Done</span>}
      </div>
    );
  }
  if (plan.plan_type === 'no_follow_up') {
    return (
      <div className="text-sm">
        <span className="font-medium text-purple-700">No Follow Up</span>
        <span className="text-gray-500"> · Google review {plan.google_review_asked ? 'asked' : 'not asked'}</span>
        {plan.is_completed === 1 && <span className="ml-2 text-xs text-green-600 font-medium">✓ Done</span>}
      </div>
    );
  }
  if (plan.plan_type === 'refer') {
    return (
      <div className="text-sm">
        <span className="font-medium text-orange-700">Refer</span>
        <span className="text-gray-500"> → {plan.refer_department}</span>
        {plan.is_completed === 1 && <span className="ml-2 text-xs text-green-600 font-medium">✓ Done</span>}
      </div>
    );
  }
  return null;
}

export default function ClientDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/clients/${id}/sessions`)
      .then(res => setData(res.data))
      .catch(() => navigate('/dashboard'))
      .finally(() => setLoading(false));
  }, [id, navigate]);

  const handleAddSession = () => {
    if (!data) return;
    const sessions = data.sessions;
    const nextNumber = sessions.length > 0
      ? Math.max(...sessions.map(s => s.session_number)) + 1
      : 1;
    navigate(`/session/new?clientId=${id}&clientName=${encodeURIComponent(data.client.name)}&sessionNumber=${nextNumber}`);
  };

  const handleComplete = async () => {
    if (!data) return;
    if (!confirm(`Mark ${data.client.name}'s journey as complete?`)) return;
    try {
      await api.put(`/clients/${id}/complete`);
      navigate('/dashboard');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed');
    }
  };

  if (loading) return <AppShell backTo="/dashboard"><div className="text-center py-12 text-gray-400">Loading...</div></AppShell>;
  if (!data) return null;

  const { client, sessions } = data;

  return (
    <AppShell title={client.name} backTo="/dashboard">
      <div className="space-y-4">
        {/* Client header */}
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">{client.name}</h2>
              <p className="text-gray-500 text-sm mt-1">
                {sessions.length} session{sessions.length !== 1 ? 's' : ''} recorded
                {client.status === 'completed' && <span className="ml-2 text-green-600 font-medium">· Journey Complete</span>}
              </p>
            </div>
          </div>
          {client.status === 'active' && (
            <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
              <button onClick={handleAddSession} className="btn-primary flex-1 text-base py-2">
                Add Session
              </button>
              <button onClick={handleComplete} className="btn-secondary flex-1 text-base py-2">
                Complete Journey
              </button>
            </div>
          )}
        </div>

        {/* Session history */}
        {sessions.length === 0 ? (
          <p className="text-center text-gray-400 py-8">No sessions recorded yet.</p>
        ) : (
          sessions.map(session => (
            <div key={session.id} className="card">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-gray-900">Session {session.session_number}</span>
                <span className="text-sm text-gray-400">
                  {new Date(session.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              </div>
              <div className="space-y-1">
                {session.plans.map(plan => (
                  <PlanTypeLabel key={plan.id} plan={plan} />
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </AppShell>
  );
}
