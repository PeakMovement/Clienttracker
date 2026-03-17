import { useNavigate } from 'react-router-dom';

function PlanBadge({ type, detail }) {
  const styles = {
    follow_up: 'bg-blue-100 text-blue-800',
    no_follow_up: 'bg-purple-100 text-purple-800',
    refer: 'bg-orange-100 text-orange-800',
  };
  const labels = {
    follow_up: `Follow Up: ${detail}`,
    no_follow_up: `Review${detail ? ': Asked' : ': Not asked'}`,
    refer: `Refer → ${detail}`,
  };
  return (
    <span className={`text-xs font-medium px-2 py-1 rounded-lg ${styles[type] || 'bg-gray-100 text-gray-600'}`}>
      {labels[type] || type}
    </span>
  );
}

export default function ClientCard({ client, latestPlans, onAddSession, onComplete, onReactivate }) {
  const navigate = useNavigate();
  const isCompleted = client.status === 'completed';

  return (
    <div
      className={`card ${isCompleted ? 'opacity-60' : ''}`}
    >
      <div
        className="cursor-pointer"
        onClick={() => navigate(`/clients/${client.id}`)}
      >
        <div className="flex items-start justify-between mb-1">
          <h3 className="text-lg font-semibold text-gray-900">{client.name}</h3>
          {isCompleted && (
            <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded-lg">Completed</span>
          )}
        </div>
        {client.last_session_number && (
          <p className="text-sm text-gray-500 mb-2">
            Session {client.last_session_number}
            {client.last_session_date && ` · ${new Date(client.last_session_date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}`}
          </p>
        )}
        {latestPlans && latestPlans.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {latestPlans.map(plan => (
              <PlanBadge
                key={plan.id}
                type={plan.plan_type}
                detail={plan.follow_up_date || plan.google_review_asked || plan.refer_department}
              />
            ))}
          </div>
        )}
      </div>

      {!isCompleted && (
        <div className="flex gap-2 pt-2 border-t border-gray-100">
          <button
            onClick={(e) => { e.stopPropagation(); onAddSession(client); }}
            className="flex-1 btn-primary text-base py-2"
          >
            Add Session
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onComplete(client); }}
            className="flex-1 btn-secondary text-base py-2"
          >
            Complete Journey
          </button>
        </div>
      )}
      {isCompleted && onReactivate && (
        <div className="pt-2 border-t border-gray-100">
          <button
            onClick={(e) => { e.stopPropagation(); onReactivate(client); }}
            className="w-full btn-secondary text-base py-2"
          >
            Reactivate
          </button>
        </div>
      )}
    </div>
  );
}
