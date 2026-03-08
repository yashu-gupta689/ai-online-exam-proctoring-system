import { Routes, Route, Link, Navigate, useNavigate } from 'react-router-dom';
import Login from './components/Login.jsx';
import Signup from './components/Signup.jsx';
import Exam from './components/Exam.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';
import Violations from './pages/Violations.jsx';
import Results from './pages/Results.jsx';

export default function App() {
  const navigate = useNavigate();
  function ProtectedRoute({ element, requiredRole }) {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const role = typeof window !== 'undefined' ? localStorage.getItem('role') : null;
    if (!token) return <Navigate to="/login" replace />;
    if (requiredRole && role !== requiredRole) return <Navigate to="/login" replace />;
    return element;
  }
  return (
    <div style={{ minHeight: '100vh' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 16, background: '#0f172a', color: '#fff', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 700, fontSize: 20 }}>
          <span>🛡️</span>
          <span>AI Online Exam Proctoring</span>
        </div>
        <nav style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <Link to="/login" style={{ padding: '8px 12px', borderRadius: 999, color: '#fff', textDecoration: 'none', background: 'rgba(255,255,255,0.08)' }}>Login</Link>
          <Link to="/signup" style={{ padding: '8px 12px', borderRadius: 999, color: '#fff', textDecoration: 'none', background: 'rgba(255,255,255,0.08)' }}>Signup</Link>
          <Link to="/exam" style={{ padding: '8px 12px', borderRadius: 999, color: '#fff', textDecoration: 'none', background: 'rgba(255,255,255,0.08)' }}>Exam</Link>
          <Link to="/results" style={{ padding: '8px 12px', borderRadius: 999, color: '#fff', textDecoration: 'none', background: 'rgba(255,255,255,0.08)' }}>Results</Link>
          <Link to="/admin" style={{ padding: '8px 12px', borderRadius: 999, color: '#fff', textDecoration: 'none', background: 'rgba(255,255,255,0.08)' }}>Admin</Link>
          <Link to="/violations" style={{ padding: '8px 12px', borderRadius: 999, color: '#fff', textDecoration: 'none', background: 'rgba(255,255,255,0.08)' }}>Violations</Link>
          {typeof window !== 'undefined' && localStorage.getItem('token') && (
            <button
              onClick={() => {
                try {
                  localStorage.removeItem('token');
                  localStorage.removeItem('role');
                } catch {}
                navigate('/login');
              }}
              style={{ padding: '8px 12px', borderRadius: 999, background: '#ef4444', color: '#fff' }}
            >
              Logout
            </button>
          )}
        </nav>
      </header>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/exam" element={<Exam />} />
        <Route path="/results" element={<Results />} />
        <Route path="/admin" element={<ProtectedRoute requiredRole="admin" element={<AdminDashboard />} />} />
        <Route path="/violations" element={<Violations />} />
      </Routes>
      <div style={{ minHeight: '90vh', padding: 20 }} />
    </div>
  );
}
