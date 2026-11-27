import { useEffect, useState } from 'react';
import { getCrowd, resetCrowd } from '../api/api';
import { socket, TOPICS } from '../socket/socket';

// Mirrors the backend: 0-3 LOW, 4-6 MEDIUM, 7+ HIGH
const MAX_BAR = 10; // bar is full at 10 people

const LEVEL_STYLES = {
  LOW: { bar: 'bg-emerald-500', text: 'text-emerald-500', label: 'Low' },
  MEDIUM: { bar: 'bg-amber-500', text: 'text-amber-500', label: 'Medium' },
  HIGH: { bar: 'bg-red-500', text: 'text-red-500', label: 'High' }
};

const THEMES = {
  light: {
    card: 'border-slate-200 bg-white text-slate-800 shadow-sm',
    muted: 'text-slate-500',
    track: 'bg-slate-100',
    stat: 'bg-slate-50 text-slate-700'
  },
  dark: {
    card: 'border-queue-border bg-queue-panel text-white',
    muted: 'text-slate-400',
    track: 'bg-slate-800',
    stat: 'bg-slate-800/60 text-slate-200'
  }
};

function CrowdMeter({ variant = 'light', showReset = false }) {
  const [state, setState] = useState({ level: 'LOW', occupancy: 0, totalIn: 0, totalOut: 0 });
  const [error, setError] = useState('');

  useEffect(() => {
    getCrowd()
      .then((res) => setState(res.data))
      .catch((err) => console.error('Failed to load crowd state:', err.message));

    const handleLevel = (payload) => setState(payload);
    socket.on(TOPICS.CROWD_LEVEL, handleLevel);
    return () => socket.off(TOPICS.CROWD_LEVEL, handleLevel);
  }, []);

  const handleReset = async () => {
    if (!window.confirm('Reset the people counter to 0?')) return;
    setError('');
    try {
      const res = await resetCrowd();
      setState(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to reset counter.');
    }
  };

  const theme = THEMES[variant] || THEMES.light;
  const style = LEVEL_STYLES[state.level] || LEVEL_STYLES.LOW;
  const percent = Math.min(100, (state.occupancy / MAX_BAR) * 100);

  return (
    <div className={`rounded-xl border p-5 ${theme.card}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className={`text-xs font-semibold uppercase tracking-widest ${theme.muted}`}>
            People Inside
          </p>
          <p className="mt-1 font-mono text-5xl font-bold leading-none">{state.occupancy}</p>
        </div>
        <div className="text-right">
          <p className={`text-xs font-semibold uppercase tracking-widest ${theme.muted}`}>
            Crowd Level
          </p>
          <p className={`mt-1 text-2xl font-bold ${style.text}`}>{style.label}</p>
        </div>
      </div>

      <div className={`mt-4 h-3 w-full overflow-hidden rounded-full ${theme.track}`}>
        <div
          className={`h-full rounded-full transition-all duration-500 ${style.bar}`}
          style={{ width: `${percent}%` }}
        />
      </div>
      <div className={`mt-1 flex justify-between text-[10px] ${theme.muted}`}>
        <span>0–3 Low</span>
        <span>4–6 Medium</span>
        <span>7+ High</span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-center text-sm">
        <div className={`rounded-lg px-3 py-2 ${theme.stat}`}>
          <p className={`text-[10px] font-semibold uppercase tracking-widest ${theme.muted}`}>In</p>
          <p className="font-mono text-xl font-bold">{state.totalIn}</p>
        </div>
        <div className={`rounded-lg px-3 py-2 ${theme.stat}`}>
          <p className={`text-[10px] font-semibold uppercase tracking-widest ${theme.muted}`}>Out</p>
          <p className="font-mono text-xl font-bold">{state.totalOut}</p>
        </div>
      </div>

      {showReset && (
        <div className="mt-4 flex items-center justify-between gap-3">
          {error ? <p className="error-text">{error}</p> : <span />}
          <button type="button" onClick={handleReset} className="btn-secondary px-3 py-1 text-xs">
            Reset Counter
          </button>
        </div>
      )}
    </div>
  );
}

export default CrowdMeter;
