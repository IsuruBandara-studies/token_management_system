import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginStaff } from '../api/api';

function StaffLogin({ isStaffLoggedIn, onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (isStaffLoggedIn) {
      navigate('/staff', { replace: true });
    }
  }, [isStaffLoggedIn, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const res = await loginStaff({ username, password });
      localStorage.setItem('staffToken', res.data.token);
      localStorage.setItem('staffName', res.data.staff.name || res.data.staff.username);
      onLogin();
      navigate('/staff');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed.');
    }
  };

  return (
    <div className="flex flex-1 items-center justify-center bg-slate-100 px-4 py-12">
      <div className="w-full max-w-sm animate-fade-up">
        <div className="panel shadow-md">
          <div className="mb-6">
            <h1 className="text-xl font-bold text-slate-800">Staff Login</h1>
            <p className="mt-1 text-sm text-slate-500">Sign in to access the dashboard</p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <label className="form-label">
              Username
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="form-input"
                autoComplete="username"
              />
            </label>
            <label className="form-label">
              Password
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="form-input"
                autoComplete="current-password"
              />
            </label>
            <button type="submit" className="btn-primary mt-1 w-full">
              Log In
            </button>
          </form>

          {error && (
            <p className="error-text mt-4 rounded-lg bg-red-50 px-3 py-2">{error}</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default StaffLogin;
