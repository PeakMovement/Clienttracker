import { useState, useRef, useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Papa from 'papaparse';
import AppShell from '../../components/layout/AppShell';
import api from '../../api';

// ── Wix column aliases ──────────────────────────────────────────────────────
const COL = {
  sessionDate: 'Session date',
  startTime: 'Start time',
  clientName: 'bookings.booking_contact_full_name_val',
  clientEmail: 'bookings.booking_contact_email_val',
  clientPhone: 'bookings.booking_contact_phone_val',
  serviceName: 'Service name',
  staffName: 'Staff name',
  bookingStatus: 'Booking status',
  attendanceStatus: 'Attendance status',
};

const SERVICE_DEPT = (s = '') => {
  const l = s.toLowerCase();
  if (l.includes('group strength')) return 'Group Strength Class';
  if (l.includes('injury rehab')) return 'Injury Rehab Class';
  if (l.includes('strength')) return 'Strength Trainer';
  if (l.includes('physio') || l.includes('shockwave')) return 'Physio';
  if (l.includes('biokinetics')) return 'Bio';
  if (l.includes('massage')) return 'Massage';
  if (l.includes('gp') || l.includes('medicine') || l.includes('consultation')) return 'Medicine';
  return null;
};

const VALID_DEPARTMENTS = [
  'Physio', 'Bio', 'Medicine', 'Massage',
  'Strength Trainer', 'Group Strength Class', 'Injury Rehab Class',
];

// ── Attendance → initial approval ─────────────────────────────────────────
const initApproval = (attendance = '') => {
  const l = attendance.toLowerCase();
  if (l.includes('no show')) return false;
  return true; // checked in OR not specified → default approved
};

const attendanceBadge = (attendance = '') => {
  const l = attendance.toLowerCase();
  if (l.includes('no show')) return { label: 'No Show', cls: 'bg-red-100 text-red-700' };
  if (l.includes('checked in')) return { label: 'Checked In', cls: 'bg-green-100 text-green-700' };
  return { label: 'Not Specified', cls: 'bg-amber-100 text-amber-700' };
};

// ── Step indicator ─────────────────────────────────────────────────────────
function StepBar({ step }) {
  const steps = ['Upload', 'Review', 'Assign Plans', 'Confirm'];
  return (
    <div className="flex items-center gap-0 mb-6">
      {steps.map((label, i) => {
        const num = i + 1;
        const done = step > num;
        const active = step === num;
        return (
          <div key={label} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                done ? 'bg-brand-600 text-white' : active ? 'bg-brand-600 text-white' : 'bg-gray-200 text-gray-400'
              }`}>
                {done ? '✓' : num}
              </div>
              <span className={`text-xs mt-1 whitespace-nowrap ${active ? 'text-brand-600 font-medium' : 'text-gray-400'}`}>
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={`flex-1 h-0.5 mx-1 mb-4 ${done ? 'bg-brand-600' : 'bg-gray-200'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Plan picker sub-component ─────────────────────────────────────────────
function PlanPicker({ value, onChange }) {
  const type = value?.type ?? null;

  const set = (patch) => onChange({ ...(value || {}), ...patch });

  return (
    <div className="space-y-2">
      <div className="flex gap-2 flex-wrap">
        {[
          { t: 'follow_up', label: 'Follow-Up', color: 'blue' },
          { t: 'no_follow_up', label: 'No Follow-Up', color: 'purple' },
          { t: 'refer', label: 'Refer', color: 'orange' },
          { t: null, label: 'Skip', color: 'gray' },
        ].map(({ t, label, color }) => (
          <button
            key={String(t)}
            onClick={() => set({ type: t })}
            className={`px-3 py-1 rounded-lg text-sm font-medium border transition-colors ${
              type === t
                ? color === 'blue' ? 'bg-blue-600 text-white border-blue-600'
                  : color === 'purple' ? 'bg-purple-600 text-white border-purple-600'
                  : color === 'orange' ? 'bg-orange-500 text-white border-orange-500'
                  : 'bg-gray-500 text-white border-gray-500'
                : 'bg-white text-gray-600 border-gray-300'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {type === 'follow_up' && (
        <input
          type="date"
          value={value?.followUpDate ?? ''}
          onChange={e => set({ followUpDate: e.target.value })}
          className="block w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
        />
      )}

      {type === 'no_follow_up' && (
        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
          <input
            type="checkbox"
            checked={value?.googleReviewAsked ?? false}
            onChange={e => set({ googleReviewAsked: e.target.checked })}
            className="rounded"
          />
          Google review asked?
        </label>
      )}

      {type === 'refer' && (
        <select
          value={value?.referDepartment ?? ''}
          onChange={e => set({ referDepartment: e.target.value })}
          className="block w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
        >
          <option value="">Select department…</option>
          {VALID_DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
      )}
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────
export default function BookingImportPage() {
  const [step, setStep] = useState(1);
  const [rows, setRows] = useState([]);          // parsed + annotated CSV rows
  const [staffList, setStaffList] = useState([]); // from /api/staff
  const [groups, setGroups] = useState([]);       // grouped for plan assignment
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [parseError, setParseError] = useState('');
  const fileRef = useRef();

  useEffect(() => {
    api.get('/staff').then(({ data }) => setStaffList(data)).catch(() => {});
  }, []);

  // ── Step 1: parse CSV ──
  const handleFile = useCallback((file) => {
    if (!file) return;
    setParseError('');
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: ({ data, errors }) => {
        if (errors.length && data.length === 0) {
          setParseError('Could not parse file. Make sure it is a Wix CSV export.');
          return;
        }
        if (!data[0]?.[COL.clientName]) {
          setParseError('Unexpected column format. Expected Wix booking export columns.');
          return;
        }
        const parsed = data
          .filter(r => r[COL.clientName]?.trim())
          .map((r, i) => ({
            id: i,
            clientName: r[COL.clientName]?.trim() || '',
            clientEmail: r[COL.clientEmail]?.trim() || '',
            clientPhone: r[COL.clientPhone]?.trim() || '',
            sessionDate: r[COL.sessionDate]?.trim() || '',
            startTime: r[COL.startTime]?.trim() || '',
            serviceName: r[COL.serviceName]?.trim() || '',
            staffName: r[COL.staffName]?.trim() || '',
            bookingStatus: r[COL.bookingStatus]?.trim() || '',
            attendanceStatus: r[COL.attendanceStatus]?.trim() || '',
            approved: initApproval(r[COL.attendanceStatus] || ''),
            staffId: null, // resolved in step 2
          }));
        setRows(parsed);
        setStep(2);
      },
      error: () => setParseError('Failed to read file.'),
    });
  }, []);

  const onDrop = useCallback((e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  // ── Step 2 → Step 3: build groups ──
  const buildGroups = () => {
    // For each row, resolve staffId from staffList
    const resolvedRows = rows.map(r => {
      const match = staffList.find(s =>
        s.name.toLowerCase() === r.staffName.toLowerCase()
      );
      return { ...r, staffId: match?.id ?? null, resolvedStaffName: match?.name ?? r.staffName };
    });

    // Group approved rows by clientEmail+staffId (fallback: clientName+staffId)
    const map = new Map();
    for (const r of resolvedRows) {
      if (!r.approved) continue;
      const key = `${(r.clientEmail || r.clientName).toLowerCase()}__${r.staffId ?? r.staffName}`;
      if (!map.has(key)) {
        map.set(key, {
          key,
          clientName: r.clientName,
          clientEmail: r.clientEmail,
          staffName: r.resolvedStaffName,
          staffId: r.staffId,
          sessions: [],
          plan: null,
          staffMissing: !r.staffId,
        });
      }
      map.get(key).sessions.push({ date: r.sessionDate, startTime: r.startTime, service: r.serviceName });
    }

    setGroups([...map.values()]);
    setStep(3);
  };

  const updateGroupPlan = (key, plan) => {
    setGroups(prev => prev.map(g => g.key === key ? { ...g, plan } : g));
  };

  const updateGroupStaff = (key, staffId) => {
    const staff = staffList.find(s => s.id === parseInt(staffId));
    setGroups(prev => prev.map(g =>
      g.key === key ? { ...g, staffId: staff?.id ?? null, staffName: staff?.name ?? '', staffMissing: !staff } : g
    ));
  };

  // ── Step 4: execute import ──
  const handleImport = async () => {
    const toImport = groups.filter(g => g.plan?.type != null && g.staffId);
    if (toImport.length === 0) return;
    setImporting(true);
    try {
      const { data } = await api.post('/admin/import-bookings', {
        groups: toImport.map(g => ({
          clientName: g.clientName,
          clientEmail: g.clientEmail,
          staffId: g.staffId,
          staffName: g.staffName,
          sessions: g.sessions,
          plan: g.plan,
        })),
      });
      setImportResult(data);
      setStep(5);
    } catch (err) {
      alert(err.response?.data?.error || 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  const reset = () => {
    setStep(1); setRows([]); setGroups([]); setImportResult(null); setParseError('');
  };

  const approvedCount = rows.filter(r => r.approved).length;
  const deniedCount = rows.filter(r => !r.approved).length;
  const groupsWithPlan = groups.filter(g => g.plan?.type != null && g.staffId).length;
  const groupsSkipped = groups.filter(g => g.plan?.type == null || !g.staffId).length;

  return (
    <AppShell title="Import Bookings">
      <div className="max-w-3xl mx-auto space-y-4">
        {step < 5 && <StepBar step={step} />}

        {/* ── Step 1: Upload ── */}
        {step === 1 && (
          <div className="space-y-4">
            <p className="text-sm text-gray-500">
              Export your bookings from Wix as a CSV, then upload it here.
            </p>
            <div
              onDrop={onDrop}
              onDragOver={e => e.preventDefault()}
              onClick={() => fileRef.current.click()}
              className="border-2 border-dashed border-gray-300 rounded-2xl p-12 text-center cursor-pointer hover:border-brand-400 hover:bg-brand-50 transition-colors"
            >
              <div className="text-4xl mb-3">📂</div>
              <p className="text-gray-600 font-medium">Drop your Wix CSV here</p>
              <p className="text-sm text-gray-400 mt-1">or click to browse</p>
              <input
                ref={fileRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={e => handleFile(e.target.files[0])}
              />
            </div>
            {parseError && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
                {parseError}
              </div>
            )}
          </div>
        )}

        {/* ── Step 2: Review rows ── */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex gap-3 text-sm">
                <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full font-medium">
                  {approvedCount} approved
                </span>
                <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full font-medium">
                  {deniedCount} denied
                </span>
                <span className="text-gray-400">{rows.length} total</span>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setRows(prev => prev.map(r => ({ ...r, approved: true })))}
                  className="text-xs text-brand-600 underline">Approve all</button>
                <button onClick={() => setRows(prev => prev.map(r => ({ ...r, approved: false })))}
                  className="text-xs text-red-500 underline">Deny all</button>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Client</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Staff</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Service</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Attendance</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">✓</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(row => {
                      const badge = attendanceBadge(row.attendanceStatus);
                      return (
                        <tr
                          key={row.id}
                          className={`border-b border-gray-100 last:border-0 transition-colors ${
                            row.approved ? '' : 'bg-red-50 opacity-60'
                          }`}
                        >
                          <td className="px-4 py-3 font-medium text-gray-800">{row.clientName}</td>
                          <td className="px-4 py-3 text-gray-600">{row.staffName}</td>
                          <td className="px-4 py-3 text-gray-500 text-xs max-w-[150px] truncate">{row.serviceName}</td>
                          <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{row.sessionDate}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${badge.cls}`}>
                              {badge.label}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <input
                              type="checkbox"
                              checked={row.approved}
                              onChange={e => setRows(prev =>
                                prev.map(r => r.id === row.id ? { ...r, approved: e.target.checked } : r)
                              )}
                              className="w-4 h-4 rounded accent-brand-600 cursor-pointer"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex gap-3 justify-between">
              <button onClick={() => setStep(1)} className="px-4 py-2 text-sm text-gray-500 border border-gray-200 rounded-xl">
                ← Back
              </button>
              <button
                onClick={buildGroups}
                disabled={approvedCount === 0}
                className="px-6 py-2 bg-brand-600 text-white text-sm font-medium rounded-xl disabled:opacity-40"
              >
                Continue with {approvedCount} approved →
              </button>
            </div>
          </div>
        )}

        {/* ── Step 3: Assign plans ── */}
        {step === 3 && (
          <div className="space-y-4">
            <p className="text-sm text-gray-500">
              Assign a follow-up plan for each client. Groups are by client + staff member.
              Choose <strong>Skip</strong> if you don't want to create a plan right now.
            </p>

            <div className="space-y-3">
              {groups.map(group => (
                <div key={group.key} className="bg-white border border-gray-200 rounded-2xl p-4 space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-gray-800">{group.clientName}</p>
                      <p className="text-xs text-gray-400">{group.clientEmail}</p>
                    </div>
                    <div className="text-right shrink-0">
                      {group.staffMissing ? (
                        <div className="space-y-1">
                          <p className="text-xs text-amber-600 font-medium">Staff not found: "{group.staffName}"</p>
                          <select
                            defaultValue=""
                            onChange={e => updateGroupStaff(group.key, e.target.value)}
                            className="text-xs border border-gray-300 rounded-lg px-2 py-1"
                          >
                            <option value="">Assign staff…</option>
                            {staffList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                          </select>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-600">{group.staffName}</p>
                      )}
                      <p className="text-xs text-gray-400 mt-0.5">
                        {group.sessions.length} session{group.sessions.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>

                  {/* Session mini-list */}
                  <div className="flex flex-wrap gap-1">
                    {group.sessions.map((s, i) => (
                      <span key={i} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                        {s.date} {s.startTime && `· ${s.startTime}`}
                      </span>
                    ))}
                  </div>

                  <PlanPicker value={group.plan} onChange={plan => updateGroupPlan(group.key, plan)} />
                </div>
              ))}
            </div>

            <div className="flex gap-3 justify-between">
              <button onClick={() => setStep(2)} className="px-4 py-2 text-sm text-gray-500 border border-gray-200 rounded-xl">
                ← Back
              </button>
              <button
                onClick={() => setStep(4)}
                className="px-6 py-2 bg-brand-600 text-white text-sm font-medium rounded-xl"
              >
                Review & Confirm →
              </button>
            </div>
          </div>
        )}

        {/* ── Step 4: Confirm ── */}
        {step === 4 && (
          <div className="space-y-4">
            <div className="bg-white border border-gray-200 rounded-2xl p-5 space-y-4">
              <h2 className="font-semibold text-gray-800">Ready to import</h2>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-green-50 rounded-xl p-3">
                  <p className="text-2xl font-bold text-green-600">{groupsWithPlan}</p>
                  <p className="text-xs text-gray-500 mt-0.5">Groups with plans</p>
                </div>
                <div className="bg-blue-50 rounded-xl p-3">
                  <p className="text-2xl font-bold text-blue-600">{approvedCount}</p>
                  <p className="text-xs text-gray-500 mt-0.5">Sessions to create</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-2xl font-bold text-gray-400">{groupsSkipped}</p>
                  <p className="text-xs text-gray-500 mt-0.5">Skipped</p>
                </div>
              </div>

              <div className="border-t border-gray-100 pt-3 space-y-2">
                {groups.filter(g => g.plan?.type != null && g.staffId).map(group => {
                  const planLabel =
                    group.plan.type === 'follow_up' ? `Follow-Up · ${group.plan.followUpDate || 'no date'}` :
                    group.plan.type === 'no_follow_up' ? `No Follow-Up${group.plan.googleReviewAsked ? ' · Google review' : ''}` :
                    group.plan.type === 'refer' ? `Refer → ${group.plan.referDepartment || 'no dept'}` : '';
                  return (
                    <div key={group.key} className="flex items-center justify-between text-sm">
                      <span className="text-gray-700 font-medium">{group.clientName}</span>
                      <span className="text-gray-400 text-xs">{group.staffName}</span>
                      <span className="text-brand-600 text-xs font-medium">{planLabel}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex gap-3 justify-between">
              <button onClick={() => setStep(3)} className="px-4 py-2 text-sm text-gray-500 border border-gray-200 rounded-xl">
                ← Back
              </button>
              <button
                onClick={handleImport}
                disabled={importing || groupsWithPlan === 0}
                className="px-8 py-2.5 bg-brand-600 text-white font-semibold rounded-xl disabled:opacity-40 flex items-center gap-2"
              >
                {importing && <span className="animate-spin">⏳</span>}
                {importing ? 'Importing…' : `Import ${groupsWithPlan} group${groupsWithPlan !== 1 ? 's' : ''}`}
              </button>
            </div>
          </div>
        )}

        {/* ── Step 5: Done ── */}
        {step === 5 && importResult && (
          <div className="text-center space-y-6 py-8">
            <div className="text-5xl">✅</div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">Import complete</h2>
              <p className="text-gray-500 mt-1">
                {importResult.imported} session{importResult.imported !== 1 ? 's' : ''} imported successfully.
              </p>
            </div>

            {importResult.errors?.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-left space-y-1">
                <p className="text-sm font-semibold text-amber-700">Some entries had issues:</p>
                {importResult.errors.map((e, i) => (
                  <p key={i} className="text-xs text-amber-600">• {e}</p>
                ))}
              </div>
            )}

            <div className="flex gap-3 justify-center">
              <button onClick={reset} className="px-5 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600">
                Import another file
              </button>
              <Link to="/admin" className="px-5 py-2.5 bg-brand-600 text-white rounded-xl text-sm font-medium">
                Back to dashboard
              </Link>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
