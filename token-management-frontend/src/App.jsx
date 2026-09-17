import { useState } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Link,
  Outlet,
  useLocation,
  useNavigate,
} from 'react-router-dom';
import QueueDisplay from './pages/QueueDisplay';
import CustomerPortal from './pages/CustomerPortal';
import StaffDashboard from './pages/StaffDashboard';
import StaffQueueView from './pages/StaffQueueView';
import StaffLogin from './pages/StaffLogin';
import ProtectedRoute from './components/ProtectedRoute';

function StaffNavBar({ onLogout }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const linkClass = (path) =>
    `nav-link${pathname === path ? ' nav-link-active' : ''}`;

  const handleLogout = () => {
    onLogout();
    navigate('/staff-login', { replace: true });
  };

  return (
    <nav className="flex shrink-0 items-center gap-6 border-b border-slate-800 bg-slate-900 px-4 py-2.5">
      <span className="mr-auto text-xs font-semibold uppercase tracking-widest text-slate-500">
        Staff Console
      </span>
      <Link to="/staff" className={linkClass('/staff')}>
        Dashboard
      </Link>
      <Link to="/staff-queue" className={linkClass('/staff-queue')}>
        Live Queue
      </Link>
      <button
        type="button"
        onClick={handleLogout}
        className="nav-link cursor-pointer border-none bg-transparent p-0"
      >
        Log Out
      </button>
    </nav>
  );
}

function StaffLayout({ onLogout }) {
  return (
    <ProtectedRoute>
      <div className="flex min-h-screen flex-col">
        <StaffNavBar onLogout={onLogout} />
        <main className="flex flex-1 flex-col">
          <Outlet />
        </main>
      </div>
    </ProtectedRoute>
  );
}

function App() {
  const [isStaffLoggedIn, setIsStaffLoggedIn] = useState(
    () => !!localStorage.getItem('staffToken')
  );

  const handleStaffLogin = () => {
    setIsStaffLoggedIn(true);
  };

  const handleStaffLogout = () => {
    localStorage.removeItem('staffToken');
    localStorage.removeItem('staffName');
    setIsStaffLoggedIn(false);
  };

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<QueueDisplay />} />
        <Route path="/customer" element={<CustomerPortal />} />
        <Route
          path="/staff-login"
          element={
            <StaffLogin isStaffLoggedIn={isStaffLoggedIn} onLogin={handleStaffLogin} />
          }
        />

        <Route element={<StaffLayout onLogout={handleStaffLogout} />}>
          <Route path="/staff" element={<StaffDashboard />} />
          <Route path="/staff-queue" element={<StaffQueueView />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;