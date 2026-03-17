import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import AppShell from '../../components/layout/AppShell';
import api from '../../api';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const FULL_DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function getMonday(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day; // Monday as week start
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function toISO(date) {
  return date.toISOString().slice(0, 10);
}

function formatHeader(date) {
  return date.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
}

export default function FollowUpCalendar() {
  const [followUps, setFollowUps] = useState([]);
  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/admin/followup-calendar')
      .then(({ data }) => setFollowUps(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Build 14-day grid (2 weeks)
  const days = Array.from({ length: 14 }, (_, i) => addDays(weekStart, i));
  const today = toISO(new Date());

  // Group follow-ups by date
  const byDate = {};
  followUps.forEach(f => {
    const key = f.follow_up_date;
    if (!byDate[key]) byDate[key] = [];
    byDate[key].push(f);
  });

  // Count overdue (before weekStart) and future (after 2nd week)
  const weekEnd = toISO(addDays(weekStart, 13));
  const weekStartISO = toISO(weekStart);
  const overdue = followUps.filter(f => f.follow_up_date < weekStartISO);
  const future = followUps.filter(f => f.follow_up_date > weekEnd);

  const prevWeek = () => setWeekStart(d => addDays(d, -14));
  const nextWeek = () => setWeekStart(d => addDays(d, 14));
  const goToday = () => setWeekStart(getMonday(new Date()));

  const totalVisible = days.reduce((sum, d) => sum + (byDate[toISO(d)]?.length || 0), 0);

  return (
    <AppShell title="Follow-Up Calendar" backTo="/admin">
      <div className="space-y-4">
        {/* Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button onClick={prevWeek} className="p-2 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button onClick={goToday} className="text-sm px-3 py-1.5 rounded-xl bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors font-medium">
              Today
            </button>
            <button onClick={nextWeek} className="p-2 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
            <span className="text-sm font-semibold text-gray-700">
              {formatHeader(weekStart)} — {formatHeader(addDays(weekStart, 13))}
            </span>
          </div>
          <div className="text-sm text-gray-400">
            {totalVisible} in view · {followUps.length} total
          </div>
        </div>

        {/* Overdue banner */}
        {overdue.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 flex items-center gap-3">
            <span className="text-red-500 font-bold text-sm">{overdue.length} overdue</span>
            <span className="text-red-400 text-sm">follow-up{overdue.length !== 1 ? 's' : ''} before this period</span>
            <div className="flex flex-wrap gap-1 ml-auto">
              {overdue.slice(0, 4).map(f => (
                <span key={f.id} className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-lg font-medium">
                  {f.client_name} · {f.follow_up_date ? new Date(f.follow_up_date + 'T00:00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short' }) : '—'}
                </span>
              ))}
              {overdue.length > 4 && <span className="text-xs text-red-400">+{overdue.length - 4} more</span>}
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-center py-16 text-gray-400">Loading…</div>
        ) : (
          <>
            {/* Week 1 */}
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                Week 1 · {formatHeader(weekStart)} – {formatHeader(addDays(weekStart, 6))}
              </p>
              <div className="grid grid-cols-7 gap-2">
                {days.slice(0, 7).map(day => {
                  const iso = toISO(day);
                  const items = byDate[iso] || [];
                  const isToday = iso === today;
                  const isPast = iso < today;
                  return (
                    <div
                      key={iso}
                      className={`rounded-2xl p-2 min-h-[90px] border ${
                        isToday
                          ? 'bg-brand-50 border-brand-300'
                          : isPast
                          ? 'bg-gray-50 border-gray-100'
                          : 'bg-white border-gray-200'
                      }`}
                    >
                      <div className="flex flex-col items-center mb-1.5">
                        <span className={`text-xs font-medium ${isToday ? 'text-brand-600' : 'text-gray-400'}`}>
                          {DAY_NAMES[day.getDay()]}
                        </span>
                        <span className={`text-sm font-bold ${isToday ? 'text-brand-700' : isPast ? 'text-gray-400' : 'text-gray-700'}`}>
                          {day.getDate()}
                        </span>
                      </div>
                      <div className="space-y-1">
                        {items.map(f => (
                          <div
                            key={f.id}
                            className={`text-xs px-1.5 py-1 rounded-lg leading-tight ${
                              isPast
                                ? 'bg-red-100 text-red-700'
                                : isToday
                                ? 'bg-brand-100 text-brand-700'
                                : 'bg-blue-50 text-blue-700'
                            }`}
                          >
                            <p className="font-semibold truncate">{f.client_name}</p>
                            <p className="opacity-70 truncate">{f.staff_name}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Week 2 */}
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                Week 2 · {formatHeader(addDays(weekStart, 7))} – {formatHeader(addDays(weekStart, 13))}
              </p>
              <div className="grid grid-cols-7 gap-2">
                {days.slice(7, 14).map(day => {
                  const iso = toISO(day);
                  const items = byDate[iso] || [];
                  const isToday = iso === today;
                  const isPast = iso < today;
                  return (
                    <div
                      key={iso}
                      className={`rounded-2xl p-2 min-h-[90px] border ${
                        isToday
                          ? 'bg-brand-50 border-brand-300'
                          : isPast
                          ? 'bg-gray-50 border-gray-100'
                          : 'bg-white border-gray-200'
                      }`}
                    >
                      <div className="flex flex-col items-center mb-1.5">
                        <span className={`text-xs font-medium ${isToday ? 'text-brand-600' : 'text-gray-400'}`}>
                          {DAY_NAMES[day.getDay()]}
                        </span>
                        <span className={`text-sm font-bold ${isToday ? 'text-brand-700' : isPast ? 'text-gray-400' : 'text-gray-700'}`}>
                          {day.getDate()}
                        </span>
                      </div>
                      <div className="space-y-1">
                        {items.map(f => (
                          <div
                            key={f.id}
                            className={`text-xs px-1.5 py-1 rounded-lg leading-tight ${
                              isPast
                                ? 'bg-red-100 text-red-700'
                                : isToday
                                ? 'bg-brand-100 text-brand-700'
                                : 'bg-blue-50 text-blue-700'
                            }`}
                          >
                            <p className="font-semibold truncate">{f.client_name}</p>
                            <p className="opacity-70 truncate">{f.staff_name}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Future overflow */}
            {future.length > 0 && (
              <div className="bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 flex items-center gap-3">
                <span className="text-gray-500 font-bold text-sm">{future.length} upcoming</span>
                <span className="text-gray-400 text-sm">follow-up{future.length !== 1 ? 's' : ''} beyond this period</span>
              </div>
            )}

            {followUps.length === 0 && (
              <div className="text-center py-16 text-gray-400">
                <p className="text-lg font-medium">No follow-ups scheduled</p>
                <p className="text-sm mt-1">Follow-ups will appear here when added to client sessions.</p>
              </div>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}
