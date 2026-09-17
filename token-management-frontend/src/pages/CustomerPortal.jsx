import { useEffect, useState, useRef } from 'react';
import { getServices, createToken } from '../api/api';

const AUTO_DISMISS_SECONDS = 15;

function CustomerPortal() {
  const [services, setServices] = useState([]);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [name, setName] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [issuedToken, setIssuedToken] = useState(null);
  const [secondsLeft, setSecondsLeft] = useState(AUTO_DISMISS_SECONDS);
  const [error, setError] = useState('');

  const timerRef = useRef(null);

  useEffect(() => {
    getServices()
      .then((res) => setServices(res.data))
      .catch((err) => console.error('Failed to load services:', err.message));
  }, []);

  // Countdown + auto-dismiss whenever a token is issued
  useEffect(() => {
    if (!issuedToken) return;

    setSecondsLeft(AUTO_DISMISS_SECONDS);

    timerRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          setIssuedToken(null);
          return AUTO_DISMISS_SECONDS;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [issuedToken]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!phoneNumber || !serviceId) {
      setError('Phone number and service are required.');
      return;
    }

    try {
      const res = await createToken({ phoneNumber, name, serviceId });
      setIssuedToken(res.data);
      setPhoneNumber('');
      setName('');
      setServiceId('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create token.');
    }
  };

  const handleDismissNow = () => {
    clearInterval(timerRef.current);
    setIssuedToken(null);
  };

  return (
    <div className="flex flex-1 flex-col bg-gradient-to-b from-teal-50 to-slate-50">
      <div className="mx-auto w-full max-w-md flex-1 px-4 py-8 sm:px-6 sm:py-12">
        {/* Header */}
        <div className="mb-8 text-center animate-fade-up">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-600 text-2xl text-white shadow-lg shadow-teal-600/25">
            #
          </div>
          <h1 className="text-2xl font-bold text-slate-800 sm:text-3xl">Get Your Token</h1>
          <p className="mt-2 text-sm text-slate-500">
            Join the queue — we'll call your number when ready
          </p>
        </div>

        {/* Form card */}
        <div className="panel animate-fade-up shadow-md" style={{ animationDelay: '80ms' }}>
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <label className="form-label">
              Phone Number *
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="0771234567"
                className="form-input"
                autoComplete="tel"
              />
            </label>

            <label className="form-label">
              Name (optional)
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="form-input"
                autoComplete="name"
              />
            </label>

            <label className="form-label">
              Service *
              <select
                value={serviceId}
                onChange={(e) => setServiceId(e.target.value)}
                className="form-input"
              >
                <option value="">— Select a service —</option>
                {services.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.name} (~{s.estimatedDuration} min)
                  </option>
                ))}
              </select>
            </label>

            <button type="submit" className="btn-primary mt-1 w-full py-3 text-base">
              Get Token
            </button>
          </form>

          {error && (
            <p className="error-text mt-4 rounded-lg bg-red-50 px-3 py-2">{error}</p>
          )}
        </div>
      </div>

      {/* Full-screen token modal */}
      {issuedToken && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 px-4 backdrop-blur-sm animate-fade-up">
          <div
            className="animate-token-reveal relative w-full max-w-sm overflow-hidden rounded-3xl border-2 border-emerald-400 bg-white text-center shadow-2xl"
            key={issuedToken.tokenNumber}
          >
            <div className="bg-emerald-600 px-6 py-4">
              <p className="text-sm font-medium text-emerald-100">Your token number is</p>
            </div>

            <div className="px-6 py-10">
              <p className="font-mono text-7xl font-bold tracking-tight text-emerald-700 sm:text-8xl">
                #{issuedToken.tokenNumber}
              </p>
              <p className="mt-5 text-base text-slate-600">
                Service:{' '}
                <span className="font-semibold text-slate-800">
                  {issuedToken.service.name}
                </span>
              </p>
              <p className="mt-3 text-sm text-slate-500">
                Please watch the queue display for your number.
              </p>
            </div>

            <div className="border-t border-slate-100 px-6 py-4">
              <button
                onClick={handleDismissNow}
                className="btn-secondary w-full py-2.5 text-sm"
              >
                Done — closes in {secondsLeft}s
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CustomerPortal;