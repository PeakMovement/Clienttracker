import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import AppShell from '../../components/layout/AppShell';
import StatsTile from '../../components/admin/StatsTile';
import ActionCard from '../../components/admin/ActionCard';
import api from '../../api';

const TABS = [
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
  const intervalRef = useRef(null);

  const fetchStats = useCallback(async () => {
    try {
      const { data } = await api.get('/admin/dashboard');
      setStats(data);
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
  }, [fetchStats, fetchItems, activeTab]);

  useEffect(() => {
    refresh();
    intervalRef.current = setInterval(refresh, 30000);
    return () => clearInterval(intervalRef.current);
  }, [refresh]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    fetchItems(tab);
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
