import { useEffect, useState } from 'react';
import { getQueue } from '../api/api';
import { socket, TOPICS } from '../socket/socket';

const crowdBadgeClass = {
  LOW: 'badge-crowd-low',
  MEDIUM: 'badge-crowd-medium',
  HIGH: 'badge-crowd-high',
};

function StaffQueueView() {
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

  return (
    <div className="flex-1 bg-slate-50">
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold text-slate-800">Live Queue (Staff View)</h1>
          <span className={`badge ${crowdBadgeClass[crowdLevel]}`}>
            Crowd: {crowdLevel}
          </span>
        </div>

        {queue.length === 0 ? (
          <div className="panel py-16 text-center text-slate-400">
            No customers waiting.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-2.5">Position</th>
                  <th className="px-4 py-2.5">Token #</th>
                  <th className="px-4 py-2.5">Service</th>
                  <th className="px-4 py-2.5">Loyalty</th>
                  <th className="px-4 py-2.5 text-right">Priority Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {queue.map((token, i) => (
                  <tr key={token._id} className="transition-colors hover:bg-slate-50">
                    <td className="px-4 py-2.5 font-mono text-slate-500">{i + 1}</td>
                    <td className="px-4 py-2.5 font-mono font-bold text-slate-800">
                      #{token.tokenNumber}
                    </td>
                    <td className="px-4 py-2.5 text-slate-600">{token.service.name}</td>
                    <td className="px-4 py-2.5 text-slate-500">
                      {token.customer.loyaltyLevel}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-slate-700">
                      {token.priorityScore}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default StaffQueueView;