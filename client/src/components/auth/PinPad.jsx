import { useState } from 'react';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'];

export default function PinPad({ onSubmit, loading, error }) {
  const [pin, setPin] = useState('');

  const handleKey = (key) => {
    if (key === 'del') {
      setPin(p => p.slice(0, -1));
    } else if (pin.length < 4) {
      const next = pin + key;
      setPin(next);
      if (next.length === 4) {
        onSubmit(next);
        setPin('');
      }
    }
  };

  return (
    <div className="flex flex-col items-center gap-6">
      {/* PIN dots */}
      <div className="flex gap-4">
        {[0, 1, 2, 3].map(i => (
          <div
            key={i}
            className={`w-5 h-5 rounded-full border-2 transition-all ${
              pin.length > i
                ? 'bg-brand-600 border-brand-600'
                : 'bg-white border-gray-400'
            }`}
          />
        ))}
      </div>

      {error && (
        <p className="text-red-600 text-base font-medium">{error}</p>
      )}

      {/* Number pad */}
      <div className="grid grid-cols-3 gap-3 w-full max-w-xs">
        {KEYS.map((key, idx) => (
          key === '' ? (
            <div key={idx} />
          ) : (
            <button
              key={idx}
              onClick={() => handleKey(key)}
              disabled={loading}
              className={`
                h-16 rounded-2xl text-2xl font-semibold transition-colors
                ${key === 'del'
                  ? 'bg-gray-200 text-gray-700 active:bg-gray-300'
                  : 'bg-white border border-gray-200 text-gray-900 active:bg-gray-100 shadow-sm'
                }
                disabled:opacity-50
              `}
            >
              {key === 'del' ? '⌫' : key}
            </button>
          )
        ))}
      </div>

      {loading && (
        <p className="text-gray-500 text-base">Logging in...</p>
      )}
    </div>
  );
}
