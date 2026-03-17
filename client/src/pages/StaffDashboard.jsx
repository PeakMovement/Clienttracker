import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import AppShell from '../components/layout/AppShell';
import ClientCard from '../components/clients/ClientCard';
import { useAuth } from '../context/AuthContext';
import api from '../api';

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
            plansMap[c.id] = detail.sessions[0].plans;
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
