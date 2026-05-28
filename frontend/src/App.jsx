import AdminRegister from './pages/AdminRegister.jsx';
import { Routes, Route, Link, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Login from './components/Login.jsx';
import Signup from './components/Signup.jsx';
import Exam from './components/Exam.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';
import Violations from './pages/Violations.jsx';
import Results from './pages/Results.jsx';
import StudentDashboard from './pages/StudentDashboard.jsx';
import AdminLiveMonitor from './pages/AdminLiveMonitor.jsx';
import ExamList from './pages/ExamList.jsx';

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem('token'));
  const [role, setRole] = useState(localStorage.getItem('role'));

  useEffect(() => {
    const handleStorageChange = () => {
      setIsLoggedIn(!!localStorage.getItem('token'));
      setRole(localStorage.getItem('role'));
    };
    window.addEventListener('storage', handleStorageChange);
    // Poll for changes since storage event only works across windows
    const interval = setInterval(handleStorageChange, 1000);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  function ProtectedRoute({ element, requiredRole }) {
    const token = localStorage.getItem('token');
    const userRole = localStorage.getItem('role');
    if (!token) return <Navigate to="/login" replace />;
    if (requiredRole && userRole !== requiredRole) return <Navigate to="/login" replace />;
    return element;
  }

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    setIsLoggedIn(false);
    setRole(null);
    navigate('/login');
    setIsMobileMenuOpen(false);
  };

  const NavLink = ({ to, children }) => {
    const isActive = location.pathname === to;
    return (
      <Link
        to={to}
        onClick={() => setIsMobileMenuOpen(false)}
        style={{
          padding: '8px 16px',
          borderRadius: '8px',
          color: isActive ? 'var(--primary)' : 'var(--text-muted)',
          textDecoration: 'none',
          fontWeight: isActive ? '700' : '500',
          background: isActive ? 'rgba(29, 78, 216, 0.08)' : 'transparent',
          fontSize: '14px',
          transition: 'all 0.2s ease'
        }}
      >
        {children}
      </Link>
    );
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header style={{ 
        background: '#fff', 
        borderBottom: '1px solid var(--border)', 
        position: 'sticky', 
        top: 0, 
        zIndex: 50,
        height: '64px',
        display: 'flex',
        alignItems: 'center'
      }}>
        <div style={{ 
          width: '100%', 
          maxWidth: '1280px', 
          margin: '0 auto', 
          padding: '0 24px', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center' 
        }}>
          {/* Logo */}
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
            <div style={{ 
              width: '32px', 
              height: '32px', 
              background: 'var(--primary)', 
              borderRadius: '8px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              color: 'white',
              fontWeight: '800'
            }}>P</div>
            <span style={{ fontWeight: '700', fontSize: '18px', color: 'var(--text-main)', letterSpacing: '-0.025em' }}>
              ProctorAI
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav style={{ display: 'flex', gap: '4px', alignItems: 'center' }} className="desktop-nav">
            {!isLoggedIn ? (
              <>
                <NavLink to="/login">Login</NavLink>
                <NavLink to="/signup">Signup</NavLink>
              </>
            ) : role === 'admin' ? (
              <>
                <NavLink to="/admin">Dashboard</NavLink>
                <NavLink to="/admin/monitor">Monitor</NavLink>
                <NavLink to="/violations">Violations</NavLink>
                <NavLink to="/results">Results</NavLink>
              </>
            ) : (
              <>
                <NavLink to="/exams">Exams</NavLink>
                <NavLink to="/dashboard">Dashboard</NavLink>
              </>
            )}
            
            {isLoggedIn && (
              <button
                onClick={handleLogout}
                className="btn"
                style={{ 
                  marginLeft: '12px', 
                  background: '#fef2f2', 
                  color: 'var(--danger)', 
                  padding: '8px 16px',
                  fontSize: '14px'
                }}
              >
                Logout
              </button>
            )}
          </nav>

          {/* Mobile Menu Button */}
          <button 
            style={{ display: 'none' }} 
            className="mobile-menu-btn"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? '✕' : '☰'}
          </button>
        </div>
      </header>

      {/* Mobile Nav Overlay */}
      {isMobileMenuOpen && (
        <div style={{
          position: 'fixed',
          top: '64px',
          left: 0,
          right: 0,
          bottom: 0,
          background: '#fff',
          zIndex: 40,
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}>
          {/* Mobile nav items... simplified for now as same logic as desktop */}
        </div>
      )}

      <main style={{ flex: 1 }}>
        <Routes>
          <Route path="/admin-register" element={<AdminRegister />} />
          <Route path="/" element={isLoggedIn ? (role === 'admin' ? <Navigate to="/admin" /> : <Navigate to="/exams" />) : <Navigate to="/login" />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/exams" element={<ProtectedRoute element={<ExamList />} />} />
          <Route path="/exam/:id" element={<ProtectedRoute element={<Exam />} />} />
          <Route path="/exam" element={<Exam />} />
          <Route path="/results" element={<ProtectedRoute requiredRole="admin" element={<Results />} />} />
          <Route path="/dashboard" element={<ProtectedRoute element={<StudentDashboard />} />} />
          <Route path="/admin" element={<ProtectedRoute requiredRole="admin" element={<AdminDashboard />} />} />
          <Route path="/admin/monitor" element={<ProtectedRoute requiredRole="admin" element={<AdminLiveMonitor />} />} />
          <Route path="/violations" element={<ProtectedRoute requiredRole="admin" element={<Violations />} />} />
        </Routes>
      </main>

      <style>{`
        @media (max-width: 768px) {
          .desktop-nav { display: none !important; }
          .mobile-menu-btn { 
            display: flex !important; 
            background: none; 
            border: none; 
            font-size: 24px; 
            cursor: pointer; 
            color: var(--text-main);
          }
        }
      `}</style>
    </div>
  );
}
