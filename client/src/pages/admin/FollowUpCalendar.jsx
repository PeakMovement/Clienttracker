import { useState, useEffect } from 'react';
import AppShell from '../../components/layout/AppShell';
import api from '../../api';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const TYPE_META = {
  follow_up:    { label: 'Follow-Up',  bg: 'bg-blue-50',   text: 'text-blue-700',   dot: 'bg-blue-400' },
  no_follow_up: { label: 'Review',     bg: 'bg-purple-50', text: 'text-purple-700', dot: 'bg-purple-400' },
  refer:        { label: 'Referral',   bg: 'bg-orange-50', text: 'text-orange-700', dot: 'bg-orange-400' },
};

function getMonday(date) {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
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

function fmtShort(date) {
  return date.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
}

function DayCell({ day, items, today }) {
  const iso = toISO(day);
  const isToday = iso === today;
  const isPast = iso < today;

  return (
    <div className={`rounded-2xl p-2 min-h-[90px] border flex flex-col ${
      isToday  ? 'bg-brand-50 border-brand-300' :
      isPast   ? 'bg-gray-50 border-gray-100' :
                 'bg-white border-gray-200'
    }`}>
      <div className="flex flex-col items-center mb-1.5">
        <span className={`text-xs font-medium ${isToday ? 'text-brand-600' : 'text-gray-400'}`}>
          {DAY_NAMES[day.getDay()]}
        </span>
        <span className={`text-sm font-bold leading-none ${
          isToday ? 'text-brand-700' : isPast ? 'text-gray-400' : 'text-gray-700'
        }`}>
          {day.getDate()}
        </span>
      </div>
      <div className="space-y-1 flex-1">
        {items.map(f => {
          const meta = TYPE_META[f.plan_type] || TYPE_META.follow_up;
          const pastChip = isPast && f.plan_type === 'follow_up';
          return (
            <div key={f.id} className={`text-xs px-1.5 py-1 rounded-lg leading-tight ${
              pastChip ? 'bg-red-100 text-red-700' : `${meta.bg} ${meta.text}`
            }`}>
              <div className="flex items-center gap-1 mb-0.5">
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${pastChip ? 'bg-red-400' : meta.dot}`} />
                <span className="font-semibold truncate">{f.client_name}</span>
              </div>
              <p className="opacity-60 truncate pl-2.5">{f.staff_name}</p>
              {f.plan_type === 'refer' && f.refer_department && (
                <p className="opacity-60 truncate pl-2.5">→ {f.refer_department}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function FollowUpCalendar() {
  const [items, setItems] = useState([]);
  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/admin/followup-calendar')
      .then(({ data }) => setItems(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const today = toISO(new Date());
  const days = Array.from({ length: 14 }, (_, i) => addDays(weekStart, i));
  const weekStartISO = toISO(weekStart);
  const weekEndISO = toISO(addDays(weekStart, 13));

  const byDate = {};
  items.forEach(f => {
    const key = f.calendar_date;
    if (!byDate[key]) byDate[key] = [];
    byDate[key].push(f);
  });

  const overdue = items.filter(f => f.calendar_date && f.calendar_date < weekStartISO);
  const future  = items.filter(f => f.calendar_date && f.calendar_date > weekEndISO);
  const visible = items.filter(f => f.calendar_date >= weekStartISO && f.calendar_date <= weekEndISO);

  const counts = { follow_up: 0, no_follow_up: 0, refer: 0 };
  visible.forEach(f => { if (counts[f.plan_type] !== undefined) counts[f.plan_type]++; });

  return (
    <AppShell title="Follow-Up Calendar" backTo="/admin">
      <div className="space-y-4">

        {/* Nav row */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <button onClick={() => setWeekStart(d => addDays(d, -14))}
              className="p-2 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button onClick={() => setWeekStart(getMonday(new Date()))}
              className="text-sm px-3 py-1.5 rounded-xl bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors font-medium">
              Today
            </button>
            <button onClick={() => setWeekStart(d => addDays(d, 14))}
              className="p-2 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
            <span className="text-sm font-semibold text-gray-700">
              {fmtShort(weekStart)} — {fmtShort(addDays(weekStart, 13))}
            </span>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-3 text-xs text-gray-500">
            {Object.entries(TYPE_META).map(([type, meta]) => (
              <span key={type} className="flex items-center gap-1">
                <span className={`w-2 h-2 rounded-full ${meta.dot}`} />
                {meta.label}
              </span>
            ))}
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-red-400" />
              Overdue
            </span>
          </div>
        </div>

        {/* Summary chips */}
        <div className="flex gap-2 flex-wrap">
          {counts.follow_up > 0 && (
            <span className="text-xs px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 font-medium">{counts.follow_up} follow-up{counts.follow_up !== 1 ? 's' : ''}</span>
          )}
          {counts.no_follow_up > 0 && (
            <span className="text-xs px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 font-medium">{counts.no_follow_up} review{counts.no_follow_up !== 1 ? 's' : ''}</span>
          )}
          {counts.refer > 0 && (
            <span className="text-xs px-2.5 py-1 rounded-full bg-orange-50 text-orange-700 font-medium">{counts.refer} referral{counts.refer !== 1 ? 's' : ''}</span>
          )}
          {visible.length === 0 && !loading && (
            <span className="text-xs text-gray-400">Nothing scheduled this period</span>
          )}
        </div>

        {/* Overdue banner */}
        {overdue.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 flex flex-wrap items-center gap-2">
            <span className="text-red-500 font-semibold text-sm">{overdue.length} overdue</span>
            <span className="text-red-400 text-sm mr-auto">before this period</span>
            {overdue.slice(0, 4).map(f => (
              <span key={f.id} className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-lg font-medium">
                {f.client_name} · {f.calendar_date ? new Date(f.calendar_date + 'T00:00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short' }) : '—'}
              </span>
            ))}
            {overdue.length > 4 && <span className="text-xs text-red-400">+{overdue.length - 4} more</span>}
          </div>
        )}

        {loading ? (
          <div className="text-center py-16 text-gray-400">Loading…</div>
        ) : (
          <>
            {/* Week 1 */}
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                Week 1 · {fmtShort(weekStart)} – {fmtShort(addDays(weekStart, 6))}
              </p>
              <div className="grid grid-cols-7 gap-2">
                {days.slice(0, 7).map(day => (
                  <DayCell key={toISO(day)} day={day} items={byDate[toISO(day)] || []} today={today} />
                ))}
              </div>
            </div>

            {/* Week 2 */}
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                Week 2 · {fmtShort(addDays(weekStart, 7))} – {fmtShort(addDays(weekStart, 13))}
              </p>
              <div className="grid grid-cols-7 gap-2">
                {days.slice(7).map(day => (
                  <DayCell key={toISO(day)} day={day} items={byDate[toISO(day)] || []} today={today} />
                ))}
              </div>
            </div>

            {/* Future overflow */}
            {future.length > 0 && (
              <div className="bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-sm text-gray-500">
                <span className="font-semibold">{future.length}</span> more scheduled beyond this period
              </div>
            )}

            {items.length === 0 && (
              <div className="text-center py-16 text-gray-400">
                <p className="text-lg font-medium">No actions scheduled</p>
                <p className="text-sm mt-1">Follow-ups, reviews and referrals will appear here.</p>
              </div>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}
