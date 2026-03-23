import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import AppShell from '../components/layout/AppShell';
import ClientCard from '../components/clients/ClientCard';
import { useAuth } from '../context/AuthContext';
import api from '../api';

const MOTIVATIONAL_MESSAGES = [
  "You changed someone's life today.",
  "Every session you gave mattered more than you know.",
  "That's one more person moving better, living better.",
  "Your dedication just made a real difference.",
  "The work you do ripples further than you can see.",
  "Another success story — because of you.",
  "That client will remember the care you gave them.",
  "You showed up, and that changed everything.",
  "Healing hands, healing hearts. Well done.",
  "That's what commitment looks like.",
  "One journey complete. Countless lives still to change.",
  "You helped someone reclaim their strength.",
  "That's the power of what you do every day.",
  "Progress made, pain reduced — thanks to you.",
  "Behind every recovered client is a practitioner who cared.",
  "You brought your best — and it showed.",
  "That person's quality of life just improved because of you.",
  "Consistency, care, commitment — you've got all three.",
  "Small steps guided by you become giant leaps for them.",
  "The best practitioners don't just treat bodies — they restore confidence.",
  "Another milestone reached. You made that happen.",
  "Your expertise gave someone their life back.",
  "That's not just a completed journey — that's a transformation.",
  "Keep going. The world needs more practitioners like you.",
  "That client walked in with pain and walked out with hope.",
  "You are exactly where you need to be, doing exactly what matters.",
  "The care you give today becomes the strength they carry tomorrow.",
  "That's another win for your patient. And yours too.",
  "You didn't just treat a condition — you supported a person.",
  "Moments like this are why you chose this profession.",
];

function pickMessage() {
  return MOTIVATIONAL_MESSAGES[Math.floor(Math.random() * MOTIVATIONAL_MESSAGES.length)];
}

export default function StaffDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [clients, setClients] = useState([]);
  const [latestPlansMap, setLatestPlansMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [showCompleted, setShowCompleted] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [addingClient, setAddingClient] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [wellDoneName, setWellDoneName] = useState('');
  const [wellDoneMsg, setWellDoneMsg] = useState('');

  const fetchClients = useCallback(async () => {
    try {
      const { data } = await api.get('/clients');
      setClients(data);

      // Fetch latest session plans for each active client
      const plansMap = {};
      await Promise.all(
        data.filter(c => c.status === 'active' && c.last_session_number).map(async c => {
          const { data: detail } = await api.get(`/clients/${c.id}/sessions`);
          if (detail.sessions.length > 0) {
            plansMap[c.id] = detail.sessions[0].plans.filter(p => !p.is_completed);
          }
        })
      );
      setLatestPlansMap(plansMap);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const handleAddClient = async (e) => {
    e.preventDefault();
    if (!newClientName.trim()) return;
    setAddingClient(true);
    try {
      const { data } = await api.post('/clients', { name: newClientName.trim() });
      setNewClientName('');
      setShowAddForm(false);
      // Navigate directly to new session for this client
      navigate(`/session/new?clientId=${data.id}&clientName=${encodeURIComponent(data.name)}&sessionNumber=1`);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to add client');
    } finally {
      setAddingClient(false);
    }
  };

  const handleAddSession = (client) => {
    const nextSession = (client.last_session_number || 0) + 1;
    navigate(`/session/new?clientId=${client.id}&clientName=${encodeURIComponent(client.name)}&sessionNumber=${nextSession}`);
  };

  const handleComplete = async (client) => {
    if (!confirm(`Mark ${client.name}'s journey as complete?`)) return;
    try {
      await api.put(`/clients/${client.id}/complete`);
      fetchClients();
      setWellDoneName(client.name);
      setWellDoneMsg(pickMessage());
      setTimeout(() => { setWellDoneName(''); setWellDoneMsg(''); }, 4000);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update client');
    }
  };

  const handleReactivate = async (client) => {
    try {
      await api.put(`/clients/${client.id}/reactivate`);
      fetchClients();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to reactivate client');
    }
  };

  const handleTogglePredictive = async (client) => {
    try {
      const { data } = await api.put(`/clients/${client.id}/predictive`);
      setClients(prev => prev.map(c => c.id === client.id ? { ...c, predictive: data.predictive } : c));
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update client');
    }
  };

  const active = clients.filter(c => c.status === 'active');
  const completed = clients.filter(c => c.status === 'completed');

  return (
    <AppShell title={`${user?.name}'s Clients`}>
      {/* Well done banner */}
      {wellDoneName && (
        <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none px-6">
          <div className="bg-brand-600 text-white text-center px-10 py-7 rounded-3xl shadow-2xl animate-bounce-in max-w-sm w-full">
            <p className="text-3xl font-bold mb-1">Well done! 🎉</p>
            <p className="text-base opacity-90 mb-3">{wellDoneName}'s journey is complete</p>
            <p className="text-sm opacity-75 italic leading-snug">{wellDoneMsg}</p>
          </div>
        </div>
      )}

      {/* Add new client */}
      <div className="mb-4">
        {!showAddForm ? (
          <button
            onClick={() => setShowAddForm(true)}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Client
          </button>
        ) : (
          <form onSubmit={handleAddClient} className="card flex gap-2">
            <input
              className="input flex-1"
              placeholder="Client name"
              value={newClientName}
              onChange={e => setNewClientName(e.target.value)}
              autoFocus
            />
            <button type="submit" className="btn-primary px-4 py-2 text-base" disabled={addingClient}>
              Add
            </button>
            <button type="button" className="btn-secondary px-4 py-2 text-base" onClick={() => setShowAddForm(false)}>
              Cancel
            </button>
          </form>
        )}
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400 text-lg">Loading...</div>
      ) : (
        <>
          {/* Active clients */}
          {active.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-400 text-lg">No active clients yet.</p>
              <p className="text-gray-400">Tap "New Client" to get started.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {active.map(client => (
                <ClientCard
                  key={client.id}
                  client={client}
                  latestPlans={latestPlansMap[client.id]}
                  onAddSession={handleAddSession}
                  onComplete={handleComplete}
                  onTogglePredictive={handleTogglePredictive}
                />
              ))}
            </div>
          )}

          {/* Completed clients toggle */}
          {completed.length > 0 && (
            <div className="mt-6">
              <button
                onClick={() => setShowCompleted(s => !s)}
                className="text-gray-500 text-base font-medium flex items-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 transition-transform ${showCompleted ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                Completed Clients ({completed.length})
              </button>
              {showCompleted && (
                <div className="space-y-3 mt-3">
                  {completed.map(client => (
                    <ClientCard
                      key={client.id}
                      client={client}
                      latestPlans={[]}
                      onAddSession={() => {}}
                      onComplete={() => {}}
                      onReactivate={handleReactivate}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </AppShell>
  );
}
