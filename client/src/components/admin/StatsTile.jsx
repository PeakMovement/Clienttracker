export default function StatsTile({ label, count, color = 'gray', onClick, active }) {
  const colorMap = {
    blue: active ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-800 border border-blue-200',
    purple: active ? 'bg-purple-600 text-white' : 'bg-purple-50 text-purple-800 border border-purple-200',
    red: active ? 'bg-red-600 text-white' : 'bg-red-50 text-red-800 border border-red-200',
    green: active ? 'bg-green-600 text-white' : 'bg-green-50 text-green-800 border border-green-200',
    gray: active ? 'bg-gray-600 text-white' : 'bg-gray-50 text-gray-800 border border-gray-200',
  };

  return (
    <button
      onClick={onClick}
      className={`rounded-2xl p-4 text-left transition-colors ${colorMap[color]} ${onClick ? 'active:opacity-80' : ''}`}
    >
      <div className="text-3xl font-bold">{count ?? '—'}</div>
      <div className="text-sm font-medium mt-1 leading-tight">{label}</div>
    </button>
  );
}
