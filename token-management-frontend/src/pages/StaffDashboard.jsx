import { useEffect, useState } from 'react';
import {
  getCounters, createCounter, callNext, completeToken, getQueue,
  getServices, createService, updateService, deleteService
} from '../api/api';
import { socket, TOPICS } from '../socket/socket';

function StaffDashboard() {
  const [counters, setCounters] = useState([]);
  const [queue, setQueue] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [actionError, setActionError] = useState('');
  // Live seat-sensor state keyed by counterNumber: { [counterNumber]: 'empty' | 'occupied' }
  const [seatStates, setSeatStates] = useState({});

  // Add-counter state
  const [newCounterNumber, setNewCounterNumber] = useState('');
  const [counterError, setCounterError] = useState('');

  // Service management state
  const [services, setServices] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ name: '', estimatedDuration: '', description: '' });
  const [serviceError, setServiceError] = useState('');

  const fetchCounters = async () => {
    try {
      const res = await getCounters();
      setCounters(res.data);
    } catch (err) {
      console.error('Failed to load counters:', err.message);
    }
  };

  const fetchQueue = async () => {
    try {
      const res = await getQueue();
      setQueue(res.data.queue);
    } catch (err) {
      console.error('Failed to load queue:', err.message);
    }
  };

  const fetchServices = async () => {
    try {
      const res = await getServices();
      setServices(res.data);
    } catch (err) {
      console.error('Failed to load services:', err.message);
    }
  };

  useEffect(() => {
    fetchCounters();
    fetchQueue();
    fetchServices();

    const refreshEvents = [TOPICS.TOKEN_NEW, TOPICS.TOKEN_CALL, TOPICS.TOKEN_COMPLETE];
    const refreshAll = () => {
      fetchCounters();
      fetchQueue();
    };
    refreshEvents.forEach((topic) => socket.on(topic, refreshAll));

    const handleRecommendation = (payload) => {
      setRecommendations((prev) => [...prev, { ...payload, id: Date.now() }]);
    };
    socket.on(TOPICS.COUNTER_STATUS, handleRecommendation);

    // IoT seat sensor: track live empty/occupied per counter, and refresh the
    // board since an 'empty' event triggers an auto-complete + auto-call on the backend.
    const handleSeatStatus = (payload) => {
      if (!payload || payload.counterNumber == null) return;
      setSeatStates((prev) => ({ ...prev, [payload.counterNumber]: payload.state }));
      refreshAll();
    };
    socket.on(TOPICS.SEAT_STATUS, handleSeatStatus);

    return () => {
      refreshEvents.forEach((topic) => socket.off(topic, refreshAll));
      socket.off(TOPICS.COUNTER_STATUS, handleRecommendation);
      socket.off(TOPICS.SEAT_STATUS, handleSeatStatus);
    };
  }, []);

  const handleCallNext = async (counterId) => {
    setActionError('');
    try {
      const res = await callNext(counterId);
      if (res.data.message) setActionError(res.data.message);
      fetchCounters();
      fetchQueue();
    } catch (err) {
      setActionError(err.response?.data?.error || 'Failed to call next.');
    }
  };

  const handleComplete = async (tokenId) => {
    setActionError('');
    try {
      await completeToken(tokenId);
      fetchCounters();
      fetchQueue();
    } catch (err) {
      setActionError(err.response?.data?.error || 'Failed to complete.');
    }
  };

  const dismissRecommendation = (id) => {
    setRecommendations((prev) => prev.filter((r) => r.id !== id));
  };

  // --- Add counter ---
  const handleAddCounter = async (e) => {
    e.preventDefault();
    setCounterError('');

    if (!newCounterNumber) {
      setCounterError('Counter number is required.');
      return;
    }

    try {
      await createCounter({ counterNumber: Number(newCounterNumber) });
      setNewCounterNumber('');
      fetchCounters();
    } catch (err) {
      setCounterError(err.response?.data?.error || 'Failed to add counter.');
    }
  };

  // --- Service management handlers ---
  const resetForm = () => {
    setForm({ name: '', estimatedDuration: '', description: '' });
    setEditingId(null);
    setServiceError('');
  };

  const handleServiceSubmit = async (e) => {
    e.preventDefault();
    setServiceError('');

    if (!form.name || !form.estimatedDuration) {
      setServiceError('Name and estimated duration are required.');
      return;
    }

    const payload = {
      name: form.name,
      estimatedDuration: Number(form.estimatedDuration),
      description: form.description
    };

    try {
      if (editingId) {
        await updateService(editingId, payload);
      } else {
        await createService(payload);
      }
      resetForm();
      fetchServices();
    } catch (err) {
      setServiceError(err.response?.data?.error || 'Failed to save service.');
    }
  };

  const handleEditClick = (service) => {
    setEditingId(service._id);
    setForm({
      name: service.name,
      estimatedDuration: service.estimatedDuration,
      description: service.description || ''
    });
    setServiceError('');
  };

  const handleDeleteClick = async (id) => {
    if (!window.confirm('Delete this service? This cannot be undone.')) return;
    try {
      await deleteService(id);
      fetchServices();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete service.');
    }
  };

  const staffName = localStorage.getItem('staffName');
  const waitingTokens = queue.filter((t) => t.status === 'waiting');
  const calledTokens = queue.filter((t) => t.status === 'called');
  const busyCount = counters.filter((c) => c.status === 'busy').length;

  return (
    <div className="flex-1 bg-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        {/* Page header */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Staff Dashboard</h1>
            {staffName && (
              <p className="mt-0.5 text-sm text-slate-500">Signed in as {staffName}</p>
            )}
          </div>
          <div className="flex gap-3">
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 shadow-sm">
              <span className="text-sm text-slate-500">Waiting</span>
              <span className="font-mono text-xl font-bold text-slate-800">
                {waitingTokens.length}
              </span>
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 shadow-sm">
              <span className="text-sm text-slate-500">Counters Busy</span>
              <span className="font-mono text-xl font-bold text-slate-800">
                {busyCount}/{counters.length}
              </span>
            </div>
          </div>
        </div>

        {actionError && (
          <p className="error-text mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5">
            {actionError}
          </p>
        )}

        {recommendations.length > 0 && (
          <div className="mb-5 space-y-2">
            {recommendations.map((r) => (
              <div
                key={r.id}
                className="animate-slide-in flex items-center justify-between gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900"
              >
                <span>
                  Counter {r.counterNumber}: {r.message} (idle {r.idleForSeconds}s)
                </span>
                <button
                  onClick={() => dismissRecommendation(r.id)}
                  className="btn-secondary shrink-0 px-3 py-1 text-xs"
                >
                  Dismiss
                </button>
              </div>
            ))}
          </div>
        )}

        {/* --- Counters + occupancy (moved to top) --- */}
        <section className="mb-6">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-slate-800">Counters</h2>
            <form onSubmit={handleAddCounter} className="flex items-end gap-2">
              <label className="form-label">
                New Counter #
                <input
                  type="number"
                  value={newCounterNumber}
                  onChange={(e) => setNewCounterNumber(e.target.value)}
                  className="form-input w-28"
                />
              </label>
              <button type="submit" className="btn-primary">Add Counter</button>
            </form>
          </div>
          {counterError && <p className="error-text mb-3">{counterError}</p>}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {counters.map((counter) => (
              <div
                key={counter._id}
                className={`panel transition-shadow hover:shadow-md ${
                  counter.status === 'idle'
                    ? 'border-l-4 border-l-sky-400'
                    : 'border-l-4 border-l-orange-400'
                }`}
              >
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-base font-semibold text-slate-800">
                    Counter {counter.counterNumber}
                  </h3>
                  <div className="flex items-center gap-2">
                    {seatStates[counter.counterNumber] && (
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                          seatStates[counter.counterNumber] === 'empty'
                            ? 'bg-sky-100 text-sky-700'
                            : 'bg-orange-100 text-orange-700'
                        }`}
                        title="Live seat sensor"
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            seatStates[counter.counterNumber] === 'empty'
                              ? 'bg-sky-500'
                              : 'bg-orange-500'
                          }`}
                        />
                        Seat {seatStates[counter.counterNumber]}
                      </span>
                    )}
                    <span
                      className={`badge ${
                        counter.status === 'idle' ? 'badge-status-idle' : 'badge-status-busy'
                      }`}
                    >
                      {counter.status}
                    </span>
                  </div>
                </div>

                {counter.status === 'idle' && (
                  <button
                    onClick={() => handleCallNext(counter._id)}
                    className="btn-primary w-full"
                  >
                    Call Next Customer
                  </button>
                )}

                {counter.status === 'busy' && counter.currentToken && (
                  <button
                    onClick={() => handleComplete(counter.currentToken._id || counter.currentToken)}
                    className="btn-success w-full"
                  >
                    Complete Service
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* --- Which token is at which counter, and what's next --- */}
        <section className="panel mb-6">
          <h2 className="mb-4 text-lg font-semibold text-slate-800">Counter Assignments</h2>
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-2.5">Counter</th>
                  <th className="px-4 py-2.5">Token #</th>
                  <th className="px-4 py-2.5">Service</th>
                  <th className="px-4 py-2.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {calledTokens.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-4 text-center text-slate-400">
                      No counters currently serving a customer
                    </td>
                  </tr>
                ) : (
                  calledTokens.map((t) => (
                    <tr key={t._id}>
                      <td className="px-4 py-2.5 font-semibold text-slate-800">
                        Counter {t.counter?.counterNumber ?? '—'}
                      </td>
                      <td className="px-4 py-2.5 font-mono font-bold text-slate-800">
                        #{t.tokenNumber}
                      </td>
                      <td className="px-4 py-2.5 text-slate-600">{t.service.name}</td>
                      <td className="px-4 py-2.5">
                        <span className="badge badge-status-busy">In Service</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <h3 className="mb-3 mt-6 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Up Next (priority order)
          </h3>
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-2.5">Position</th>
                  <th className="px-4 py-2.5">Token #</th>
                  <th className="px-4 py-2.5">Service</th>
                  <th className="px-4 py-2.5 text-right">Priority Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {waitingTokens.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-4 text-center text-slate-400">
                      No customers waiting
                    </td>
                  </tr>
                ) : (
                  waitingTokens.map((t, i) => (
                    <tr key={t._id} className={i === 0 ? 'bg-sky-50' : ''}>
                      <td className="px-4 py-2.5 font-mono text-slate-500">{i + 1}</td>
                      <td className="px-4 py-2.5 font-mono font-bold text-slate-800">
                        #{t.tokenNumber}
                      </td>
                      <td className="px-4 py-2.5 text-slate-600">{t.service.name}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-slate-700">
                        {t.priorityScore}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* --- Manage Services (moved to bottom) --- */}
        <section className="panel mb-6">
          <h2 className="mb-4 text-lg font-semibold text-slate-800">Manage Services</h2>

          <form
            onSubmit={handleServiceSubmit}
            className="mb-4 flex flex-wrap items-end gap-3"
          >
            <label className="form-label min-w-[140px] flex-1">
              Name
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="form-input"
              />
            </label>
            <label className="form-label w-28">
              Duration (min)
              <input
                type="number"
                value={form.estimatedDuration}
                onChange={(e) => setForm({ ...form, estimatedDuration: e.target.value })}
                className="form-input"
              />
            </label>
            <label className="form-label min-w-[160px] flex-1">
              Description
              <input
                type="text"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="form-input"
              />
            </label>
            <div className="flex gap-2">
              <button type="submit" className="btn-primary">
                {editingId ? 'Update Service' : 'Add Service'}
              </button>
              {editingId && (
                <button type="button" onClick={resetForm} className="btn-secondary">
                  Cancel
                </button>
              )}
            </div>
          </form>

          {serviceError && <p className="error-text mb-3">{serviceError}</p>}

          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-2.5">Name</th>
                  <th className="px-4 py-2.5">Duration</th>
                  <th className="px-4 py-2.5">Description</th>
                  <th className="px-4 py-2.5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {services.map((s) => (
                  <tr key={s._id} className="transition-colors hover:bg-slate-50">
                    <td className="px-4 py-2.5 font-medium text-slate-800">{s.name}</td>
                    <td className="px-4 py-2.5 text-slate-600">{s.estimatedDuration} min</td>
                    <td className="px-4 py-2.5 text-slate-500">{s.description}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditClick(s)}
                          className="btn-secondary px-3 py-1 text-xs"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteClick(s._id)}
                          className="btn-danger"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}

export default StaffDashboard;