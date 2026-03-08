import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api.js';

export default function Signup() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('student');
  const [adminSecret, setAdminSecret] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const payload = { name, email, password, role };
      if (role === 'admin') payload.adminSecret = adminSecret;
      const res = await api.post('/auth/signup', payload);
      const token = res.data?.token;
      const userRole = res.data?.role || role;
      if (token) {
        localStorage.setItem('token', token);
        localStorage.setItem('role', userRole);
      }
      if (userRole === 'admin') {
        navigate('/admin');
      } else {
        navigate('/exam');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#fff', borderRadius: 12, padding: '2rem', width: '100%', maxWidth: 400, boxShadow: '0 4px 24px rgba(0,0,0,0.08)', border: '1px solid #e5e7eb' }}>
        <h2 style={{ margin: '0 0 4px', fontSize: '1.5rem', fontWeight: 700, color: '#111' }}>Create Account</h2>
        <p style={{ margin: '0 0 1.5rem', color: '#6b7280', fontSize: '0.9rem' }}>Join the AI Exam Proctoring System</p>

        <div style={{ display: 'flex', gap: 8, marginBottom: '1rem' }}>
          <button
            type="button"
            onClick={() => setRole('student')}
            style={{ flex: 1, padding: 10, borderRadius: 8, border: '1.5px solid #d1d5db', background: role === 'student' ? '#1d4ed8' : '#f9fafb', color: role === 'student' ? '#fff' : '#374151', fontWeight: 500, cursor: 'pointer' }}
          >
            🎓 Student
          </button>
          <button
            type="button"
            onClick={() => setRole('admin')}
            style={{ flex: 1, padding: 10, borderRadius: 8, border: '1.5px solid #d1d5db', background: role === 'admin' ? '#1d4ed8' : '#f9fafb', color: role === 'admin' ? '#fff' : '#374151', fontWeight: 500, cursor: 'pointer' }}
          >
            🛡️ Admin
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#374151' }}>Full Name</label>
            <input
              type="text"
              placeholder="Enter your full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              style={{ padding: '10px 12px', borderRadius: 8, border: '1.5px solid #d1d5db', fontSize: '0.95rem' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#374151' }}>Email Address</label>
            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{ padding: '10px 12px', borderRadius: 8, border: '1.5px solid #d1d5db', fontSize: '0.95rem' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#374151' }}>Password</label>
            <input
              type="password"
              placeholder="Create a password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{ padding: '10px 12px', borderRadius: 8, border: '1.5px solid #d1d5db', fontSize: '0.95rem' }}
            />
          </div>

          {role === 'admin' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#374151' }}>Admin Secret Key</label>
              <input
                type="password"
                placeholder="Enter admin secret key"
                value={adminSecret}
                onChange={(e) => setAdminSecret(e.target.value)}
                required
                style={{ padding: '10px 12px', borderRadius: 8, border: '1.5px solid #f59e0b', fontSize: '0.95rem' }}
              />
              <p style={{ fontSize: '0.78rem', color: '#92400e', margin: '2px 0 0' }}>⚠️ Contact your system administrator for the secret key</p>
            </div>
          )}

          {error && (
            <div style={{ padding: '10px 12px', borderRadius: 8, background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', fontSize: '0.875rem' }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{ padding: 12, borderRadius: 8, border: 'none', background: '#1d4ed8', color: '#fff', fontWeight: 600, fontSize: '1rem', cursor: 'pointer', marginTop: 4 }}
          >
            {loading ? 'Creating Account...' : `Sign up as ${role === 'admin' ? 'Admin' : 'Student'}`}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '1.25rem', color: '#6b7280', fontSize: '0.875rem' }}>
          Already have an account? <Link to="/login" style={{ color: '#1d4ed8', fontWeight: 600, textDecoration: 'none' }}>Log in</Link>
        </p>
      </div>
    </div>
  );
}