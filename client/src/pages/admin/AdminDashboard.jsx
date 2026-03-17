import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import AppShell from '../../components/layout/AppShell';
import StatsTile from '../../components/admin/StatsTile';
import ActionCard from '../../components/admin/ActionCard';
import api from '../../api';

const TABS = [
  { id: 'overdueReviews', label: 'Overdue Reviews', endpoint: '/admin/overdue-reviews', color: 'orange' },
  { id: 'reviews', label: 'Pending Reviews', endpoint: '/admin/pending-reviews', color: 'purple' },
  { id: 'referrals', label: 'Pending Referrals', endpoint: '/admin/pending-referrals', color: 'blue' },
  { id: 'overdue', label: 'Overdue Follow-Ups', endpoint: '/admin/overdue-followups', color: 'red' },
  { id: 'upcoming', label: 'Upcoming Follow-Ups', endpoint: '/admin/upcoming-followups', color: 'green' },
];

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [activeTab, setActiveTab] = useState('reviews');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [predictiveClients, setPredictiveClients] = useState([]);
  const intervalRef = useRef(null);

  const fetchStats = useCallback(async () => {
    try {
      const { data } = await api.get('/admin/dashboard');
      setStats(data);
    } catch (err) {
      console.error(err);
    }
  }, []);

  const fetchPredictive = useCallback(async () => {
    try {
      const { data } = await api.get('/admin/predictive-clients');
      setPredictiveClients(data);
    } catch (err) {
      console.error(err);
    }
  }, []);

  const fetchItems = useCallback(async (tab) => {
    const tabDef = TABS.find(t => t.id === tab);
    if (!tabDef) return;
    setLoading(true);
    try {
      const { data } = await api.get(tabDef.endpoint);
      setItems(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const refresh = useCallback(() => {
    fetchStats();
    fetchItems(activeTab);
    fetchPredictive();
  }, [fetchStats, fetchItems, activeTab, fetchPredictive]);

  useEffect(() => {
    refresh();
    intervalRef.current = setInterval(refresh, 30000);
    return () => clearInterval(intervalRef.current);
  }, [refresh]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    fetchItems(tab);
  };

  const handlePredictiveStatus = async (clientId, status) => {
    try {
      await api.put(`/admin/predictive-clients/${clientId}/contact-status`, { status });
      setPredictiveClients(prev => prev.filter(c => c.id !== clientId));
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update');
    }
  };

  const handleComplete = async (planId) => {
    try {
      await api.put(`/admin/plans/${planId}/complete`);
      setItems(prev => prev.filter(i => i.id !== planId));
      fetchStats();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to complete');
    }
  };

  const statConfig = stats ? [
    { id: 'overdueReviews', label: 'Overdue Reviews', count: stats.overdueGoogleReviews, color: 'orange' },
    { id: 'reviews', label: 'Pending Reviews', count: stats.pendingReviews, color: 'purple' },
    { id: 'referrals', label: 'Pending Referrals', count: stats.pendingReferrals, color: 'blue' },
    { id: 'overdue', label: 'Overdue Follow-Ups', count: stats.overdueFollowUps, color: 'red' },
    { id: 'upcoming', label: 'Upcoming Follow-Ups', count: stats.upcomingFollowUps, color: 'green' },
  ] : [];

  return (
    <AppShell title="Admin Overview">
      <div className="space-y-4">
        {/* Info strip */}
        {stats && (
          <div className="flex gap-4 text-sm text-gray-500">
            <span>{stats.activeClients} active clients</span>
            <span>·</span>
            <span>{stats.totalStaff} staff</span>
            <span>·</span>
            <Link to="/admin/staff" className="text-brand-600 font-medium">Manage Staff</Link>
            <span>·</span>
            <Link to="/admin/import" className="text-brand-600 font-medium">Import Bookings</Link>
          </div>
        )}

        {/* Predictive Clients */}
        {predictiveClients.length > 0 && (
          <div className="bg-teal-50 border border-teal-200 rounded-2xl p-4 space-y-2">
            <div className="flex items-center gap-2 mb-1">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-teal-600" viewBox="0 0 20 20" fill="currentColor">
                <path d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" />
              </svg>
              <span className="text-sm font-semibold text-teal-700">Predictive Clients to Contact ({predictiveClients.length})</span>
            </div>
            {predictiveClients.map(c => (
              <div key={c.id} className="flex items-center justify-between bg-white rounded-xl px-3 py-2 border border-teal-100">
                <div>
                  <p className="text-sm font-medium text-gray-800">{c.name}</p>
                  <p className="text-xs text-gray-400">
                    {c.staff_name} · {c.staff_profession}
                    {c.last_session_number && ` · Session ${c.last_session_number}`}
                    {c.last_session_date && ` · ${new Date(c.last_session_date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}`}
                  </p>
                </div>
                <div className="flex items-center gap-2 ml-2 shrink-0">
                  <button
                    onClick={() => handlePredictiveStatus(c.id, 'invited')}
                    className="text-xs px-2 py-1 rounded-lg bg-teal-100 text-teal-700 font-medium hover:bg-teal-200 transition-colors"
                  >
                    Invited
                  </button>
                  <button
                    onClick={() => handlePredictiveStatus(c.id, 'declined')}
                    className="text-xs px-2 py-1 rounded-lg bg-gray-100 text-gray-500 font-medium hover:bg-gray-200 transition-colors"
                  >
                    Declined
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Stats tiles */}
        <div className="grid grid-cols-2 gap-3">
          {statConfig.map(s => (
            <StatsTile
              key={s.id}
              label={s.label}
              count={s.count}
              color={s.color}
              active={activeTab === s.id}
              onClick={() => handleTabChange(s.id)}
            />
          ))}
        </div>

        {/* Tab bar */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`whitespace-nowrap px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-brand-600 text-white'
                  : 'bg-white text-gray-600 border border-gray-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Refresh button */}
        <div className="flex justify-end">
          <button onClick={refresh} className="text-sm text-gray-400 flex items-center gap-1">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>

        {/* Items */}
        {loading ? (
          <div className="text-center py-12 text-gray-400">Loading...</div>
        ) : items.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p className="text-lg">All clear!</p>
            <p className="text-sm mt-1">Nothing pending in this category.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map(item => (
              <ActionCard key={item.id} plan={item} onComplete={handleComplete} />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
