function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + (dateStr.length === 10 ? 'T00:00:00' : ''));
  return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' });
}

function isOverdue(dateStr) {
  if (!dateStr) return false;
  return new Date(dateStr + 'T00:00:00') < new Date(new Date().toDateString());
}

export default function ActionCard({ plan, onComplete }) {
  const { plan_type, follow_up_date, google_review_asked, refer_department,
          client_name, staff_name, session_number, created_at } = plan;

  return (
    <div className="card">
      <div className="flex items-start justify-between mb-2">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{client_name}</h3>
          <p className="text-sm text-gray-500">
            {staff_name} · Session {session_number}
          </p>
        </div>
        <span className="text-xs text-gray-400 whitespace-nowrap ml-2">
          {formatDate(created_at.slice(0, 10))}
        </span>
      </div>

      {plan_type === 'follow_up' && (
        <div className={`text-base font-medium rounded-xl px-3 py-2 mb-3 ${
          isOverdue(follow_up_date)
            ? 'bg-red-100 text-red-800'
            : 'bg-blue-50 text-blue-800'
        }`}>
          Follow-up: {formatDate(follow_up_date)}
          {isOverdue(follow_up_date) && <span className="ml-2 text-xs font-bold">OVERDUE</span>}
        </div>
      )}

      {plan_type === 'no_follow_up' && (
        <div className="text-base font-medium bg-purple-50 text-purple-800 rounded-xl px-3 py-2 mb-3">
          Google review {google_review_asked ? 'was asked' : 'was NOT asked'}
        </div>
      )}

      {plan_type === 'refer' && (
        <div className="text-base font-medium bg-orange-50 text-orange-800 rounded-xl px-3 py-2 mb-3">
          Refer to: {refer_department}
        </div>
      )}

      <button
        onClick={() => onComplete(plan.id)}
        className="btn-primary w-full text-base py-2"
      >
        Mark Complete
      </button>
    </div>
  );
}
