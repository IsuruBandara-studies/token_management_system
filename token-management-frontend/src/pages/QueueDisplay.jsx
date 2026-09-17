import { useEffect, useState } from 'react';
import { getQueue } from '../api/api';
import { socket, TOPICS } from '../socket/socket';

const crowdBadgeClass = {
  LOW: 'badge-crowd-low',
  MEDIUM: 'badge-crowd-medium',
  HIGH: 'badge-crowd-high',
};

const crowdGlowClass = {
  LOW: 'shadow-[0_0_24px_rgba(16,185,129,0.25)]',
  MEDIUM: 'shadow-[0_0_24px_rgba(245,158,11,0.25)]',
  HIGH: 'shadow-[0_0_32px_rgba(239,68,68,0.35)]',
};

function QueueDisplay() {
  const [queue, setQueue] = useState([]);
  const [crowdLevel, setCrowdLevel] = useState('LOW');

  const fetchQueue = async () => {
    try {
      const res = await getQueue();
      setQueue(res.data.queue);
      setCrowdLevel(res.data.crowdLevel);
    } catch (err) {
      console.error('Failed to fetch queue:', err.message);
    }
  };

  useEffect(() => {
    fetchQueue();

    const refreshEvents = [
      TOPICS.TOKEN_NEW,
      TOPICS.TOKEN_CALL,
      TOPICS.TOKEN_COMPLETE,
      TOPICS.CROWD_LEVEL
    ];

    refreshEvents.forEach((topic) => {
      socket.on(topic, fetchQueue);
    });

    return () => {
      refreshEvents.forEach((topic) => {
        socket.off(topic, fetchQueue);
      });
    };
  }, []);

  const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="min-h-full flex-1 bg-queue-bg text-text-inverse">
      <header className="border-b border-queue-border bg-queue-panel px-6 py-4 sm:px-10 sm:py-5">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">
              Now Serving
            </p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
              Live Queue
            </h1>
          </div>

          <div className="flex items-center gap-4 sm:gap-6">
            <time className="hidden font-mono text-lg text-slate-400 sm:block">{now}</time>
            <div
              className={`rounded-xl px-4 py-2.5 sm:px-6 sm:py-3 ${crowdGlowClass[crowdLevel]}`}
            >
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 sm:text-xs">
                Crowd Level
              </p>
              <span className={`badge mt-1 text-sm sm:text-base ${crowdBadgeClass[crowdLevel]}`}>
                {crowdLevel}
              </span>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-10 sm:py-8">
        {queue.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-queue-border bg-queue-panel/50 py-24 text-center">
            <div className="mb-4 text-5xl opacity-30">—</div>
            <p className="text-xl font-medium text-slate-400">No customers waiting</p>
            <p className="mt-1 text-sm text-slate-600">Queue is clear</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {queue.map((token, i) => {
              const isCalled = token.status === 'called';
              return (
                <div
                  key={token._id}
                  className={`animate-queue-row rounded-2xl border p-5 shadow-lg transition-colors duration-300 ${
                    isCalled
                      ? 'border-emerald-500/40 bg-emerald-950/30 shadow-[0_0_24px_rgba(16,185,129,0.2)]'
                      : 'border-queue-border bg-queue-panel'
                  }`}
                  style={{ animationDelay: `${Math.min(i * 40, 200)}ms` }}
                >
                  <div className="mb-3 flex items-center justify-between">
                    <span
                      className={`font-mono text-4xl font-bold tracking-tight ${
                        isCalled ? 'text-emerald-400' : 'text-white'
                      }`}
                    >
                      #{token.tokenNumber}
                    </span>
                    {isCalled ? (
                      <span className="badge bg-emerald-500/20 text-emerald-300">
                        Proceed to counter
                      </span>
                    ) : (
                      <span className="badge bg-slate-700/50 text-slate-400">
                        Waiting
                      </span>
                    )}
                  </div>

                  <p className="truncate text-base text-slate-400">{token.service.name}</p>

                  {isCalled && token.counter && (
                    <div className="mt-4 rounded-xl bg-emerald-500/10 px-4 py-3 text-center">
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-emerald-400">
                        Counter
                      </p>
                      <p className="font-mono text-3xl font-bold text-emerald-300">
                        {token.counter.counterNumber}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <p className="mt-6 text-center text-xs text-slate-600">
          Updates automatically · Please wait for your number to be called
        </p>
      </div>
    </div>
  );
}

export default QueueDisplay;