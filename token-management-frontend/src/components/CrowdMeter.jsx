import { useEffect, useState } from 'react';
import { getCrowd, resetCrowd } from '../api/api';
import { socket, TOPICS } from '../socket/socket';

// Staff-only card: sensor occupancy plus how many of those people hold a token.
// Levels mirror the backend: 0-3 LOW, 4-6 MEDIUM, 7+ HIGH.
const MAX_BAR = 10; // bar is full at 10 people

const LEVEL_STYLES = {
  LOW: { bar: 'bg-emerald-500', text: 'text-emerald-600', label: 'Low' },
  MEDIUM: { bar: 'bg-amber-500', text: 'text-amber-600', label: 'Medium' },
  HIGH: { bar: 'bg-red-500', text: 'text-red-600', label: 'High' }
};

const EMPTY_STATE = {
  level: 'LOW',
  occupancy: 0,
  totalIn: 0,
  totalOut: 0,
  waiting: 0,
  called: 0,
  withToken: 0,
  withoutToken: 0,
  unmatchedTokens: 0
};

function Stat({ label, value, detail }) {
  return (
    <div className="rounded-lg bg-slate-50 px-3 py-2 text-center">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">{label}</p>
      <p className="font-mono text-xl font-bold text-slate-800">{value}</p>
      {detail && <p className="text-[11px] text-slate-500">{detail}</p>}
    </div>
  );
}

function CrowdMeter() {
  const [state, setState] = useState(EMPTY_STATE);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = () => {
      getCrowd()
        .then((res) => setState(res.data))
        .catch((err) => console.error('Failed to load crowd state:', err.message));
    };

    load();

    // Occupancy changes with sensor/token events; token counts change with the queue
    const events = [
      TOPICS.CROWD_LEVEL,
      TOPICS.TOKEN_NEW,
      TOPICS.TOKEN_CALL,
      TOPICS.TOKEN_COMPLETE,
      TOPICS.TOKEN_NO_SHOW
    ];
    events.forEach((topic) => socket.on(topic, load));
    return () => events.forEach((topic) => socket.off(topic, load));
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

  const style = LEVEL_STYLES[state.level] || LEVEL_STYLES.LOW;
  const percent = Math.min(100, (state.occupancy / MAX_BAR) * 100);

  return (
    <div className="panel">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
            People Inside
          </p>
          <p className="mt-1 font-mono text-5xl font-bold leading-none text-slate-800">
            {state.occupancy}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
            Crowd Level
          </p>
          <p className={`mt-1 text-2xl font-bold ${style.text}`}>{style.label}</p>
        </div>
      </div>

      <div className="mt-4 h-3 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full transition-all duration-500 ${style.bar}`}
          style={{ width: `${percent}%` }}
        />
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-slate-500">
        <span>0–3 Low</span>
        <span>4–6 Medium</span>
        <span>7+ High</span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat
          label="With Token"
          value={state.withToken}
          detail={`${state.waiting} waiting · ${state.called} at counter`}
        />
        <Stat label="Without Token" value={state.withoutToken} detail="not registered yet" />
        <Stat label="In" value={state.totalIn} />
        <Stat label="Out" value={state.totalOut} />
      </div>

      {state.unmatchedTokens > 0 && (
        <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          {state.unmatchedTokens} active token(s) exceed the people counted inside. The sensor may
          have missed someone, or a token was issued before the customer arrived.
        </p>
      )}

      <div className="mt-4 flex items-center justify-between gap-3">
        {error ? <p className="error-text">{error}</p> : <span />}
        <button type="button" onClick={handleReset} className="btn-secondary px-3 py-1 text-xs">
          Reset Counter
        </button>
      </div>
    </div>
  );
}

export default CrowdMeter;
