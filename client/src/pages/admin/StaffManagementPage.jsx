import { useState, useEffect } from 'react';
import AppShell from '../../components/layout/AppShell';
import { useAuth } from '../../context/AuthContext';
import api from '../../api';

const PROFESSIONS = [
  'Physiotherapist', 'Biokineticist', 'Doctor', 'Massage Therapist',
  'Strength Trainer', 'Group Class Instructor', 'Injury Rehab Specialist', 'Manager', 'Receptionist', 'Other',
];

function StaffForm({ initial, onSave, onCancel }) {
  const [name, setName] = useState(initial?.name || '');
  const [pin, setPin] = useState('');
  const [profession, setProfession] = useState(initial?.profession || '');
  const [isAdmin, setIsAdmin] = useState(initial?.is_admin === 1 || false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !profession) {
      setError('Name and profession are required');
      return;
    }
    if (!initial && !pin) {
      setError('PIN is required for new staff');
      return;
    }
    if (pin && !/^\d{4}$/.test(pin)) {
      setError('PIN must be exactly 4 digits');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await onSave({ name: name.trim(), pin: pin || undefined, profession, isAdmin });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="card space-y-3">
      <h3 className="text-lg font-semibold">{initial ? 'Edit Staff Member' : 'Add New Staff Member'}</h3>

      <div>
        <label className="label">Name *</label>
        <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="Full name" />
      </div>

      <div>
        <label className="label">4-Digit PIN {initial ? '(leave blank to keep current)' : '*'}</label>
        <input
          className="input"
          type="tel"
          inputMode="numeric"
          maxLength={4}
          value={pin}
          onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
          placeholder="e.g. 1234"
        />
      </div>

      <div>
        <label className="label">Profession *</label>
        <select className="input" value={profession} onChange={e => setProfession(e.target.value)}>
          <option value="">Select profession</option>
          {PROFESSIONS.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setIsAdmin(a => !a)}
          className={`w-12 h-7 rounded-full transition-colors ${isAdmin ? 'bg-brand-600' : 'bg-gray-300'}`}
        >
          <div className={`w-5 h-5 bg-white rounded-full shadow mx-1 transition-transform ${isAdmin ? 'translate-x-5' : ''}`} />
        </button>
        <span className="text-base text-gray-700">Admin / Boss access</span>
      </div>

      {error && <p className="text-red-600 text-sm">{error}</p>}

      <div className="flex gap-2 pt-1">
        <button type="submit" className="btn-primary flex-1 text-base py-2" disabled={saving}>
          {saving ? 'Saving...' : 'Save'}
        </button>
        <button type="button" className="btn-secondary flex-1 text-base py-2" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}

export default function StaffManagementPage() {
  const { user } = useAuth();
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const fetchStaff = async () => {
    try {
      const { data } = await api.get('/staff');
      setStaff(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStaff(); }, []);

  const handleAdd = async (formData) => {
    await api.post('/staff', formData);
    setShowAddForm(false);
    fetchStaff();
  };

  const handleEdit = async (id, formData) => {
    await api.put(`/staff/${id}`, formData);
    setEditingId(null);
    fetchStaff();
  };

  const handleDelete = async (member) => {
    if (!confirm(`Remove ${member.name}? This will also delete all their client records.`)) return;
    try {
      await api.delete(`/staff/${member.id}`);
      fetchStaff();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete');
    }
  };

  return (
    <AppShell title="Staff Management" backTo="/admin">
      <div className="space-y-4">
        {!showAddForm && (
          <button onClick={() => setShowAddForm(true)} className="btn-primary w-full flex items-center justify-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Staff Member
          </button>
        )}

        {showAddForm && (
          <StaffForm onSave={handleAdd} onCancel={() => setShowAddForm(false)} />
        )}

        {loading ? (
          <div className="text-center py-12 text-gray-400">Loading...</div>
        ) : (
          staff.map(member => (
            <div key={member.id}>
              {editingId === member.id ? (
                <StaffForm
                  initial={member}
                  onSave={(data) => handleEdit(member.id, data)}
                  onCancel={() => setEditingId(null)}
                />
              ) : (
                <div className="card flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900">{member.name}</span>
                      {member.isAdmin && (
                        <span className="text-xs bg-brand-100 text-brand-700 px-2 py-0.5 rounded-lg">Admin</span>
                      )}
                      {member.id === user?.id && (
                        <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-lg">You</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mt-0.5">{member.profession}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditingId(member.id)}
                      className="btn-secondary px-4 py-2 text-sm"
                    >
                      Edit
                    </button>
                    {member.id !== user?.id && (
                      <button
                        onClick={() => handleDelete(member)}
                        className="btn-danger px-4 py-2 text-sm"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </AppShell>
  );
}
