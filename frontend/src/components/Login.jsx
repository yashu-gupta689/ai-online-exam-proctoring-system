import { useState } from 'react';
import api from '../services/api.js';
import { useNavigate, Link } from 'react-router-dom';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('student');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const endpoint = role === 'admin' ? '/auth/admin/login' : '/auth/login';
      const res = await api.post(endpoint, { email, password });
      const token = res.data?.token;
      const user = res.data?.user;
      if (token) {
        localStorage.setItem('token', token);
        localStorage.setItem('role', user?.role || role);
      }
      if (user?.role === 'admin' || role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/exam');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0, width: '100%', maxWidth: 900, overflow: 'hidden', borderRadius: 16, boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}>
        
        {/* Left Panel */}
        <div style={{ background: '#0f172a', color: '#fff', padding: 32, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 12 }}>🛡️ AI Online Exam Proctoring</div>
          <div style={{ opacity: 0.7, marginBottom: 20, fontSize: 14 }}>Secure. Smart. Proctored.</div>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 12 }}>
            <li style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>👤 AI Face Detection</li>
            <li style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>👁️ Live Monitoring</li>
            <li style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>⚡ Instant Results</li>
          </ul>
        </div>

        {/* Right Panel */}
        <div style={{ background: '#fff', padding: 32 }}>
          <div style={{ fontSize: 24, fontWeight: 700, marginBottom: 20, color: '#0f172a' }}>Welcome Back</div>
          
          <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 14, flexDirection: 'column' }}>
            
            {/* Role Toggle */}
            <div style={{ display: 'flex', gap: 8 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', padding: '8px 16px', borderRadius: 8, border: `2px solid ${role === 'student' ? '#1d4ed8' : '#e2e8f0'}`, background: role === 'student' ? '#eff6ff' : '#fff', fontWeight: role === 'student' ? 600 : 400 }}>
                <input type="radio" name="role" value="student" checked={role === 'student'} onChange={() => setRole('student')} style={{ accentColor: '#1d4ed8' }} />
                Student
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', padding: '8px 16px', borderRadius: 8, border: `2px solid ${role === 'admin' ? '#1d4ed8' : '#e2e8f0'}`, background: role === 'admin' ? '#eff6ff' : '#fff', fontWeight: role === 'admin' ? 600 : 400 }}>
                <input type="radio" name="role" value="admin" checked={role === 'admin'} onChange={() => setRole('admin')} style={{ accentColor: '#1d4ed8' }} />
                Admin
              </label>
            </div>

            {/* Email */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>📧 Email</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="Enter your email"
                style={{ padding: '10px 12px', borderRadius: 8, border: '1.5px solid #e2e8f0', fontSize: 14, outline: 'none' }}
              />
            </div>

            {/* Password */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>🔒 Password</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Enter your password"
                style={{ padding: '10px 12px', borderRadius: 8, border: '1.5px solid #e2e8f0', fontSize: 14, outline: 'none' }}
              />
            </div>

            {/* Error */}
            {error && (
              <div style={{ padding: '10px 12px', borderRadius: 8, background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', fontSize: 13 }}>
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              style={{ background: 'linear-gradient(90deg, #1d4ed8, #2563eb)', color: '#fff', padding: '12px 16px', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 15, cursor: 'pointer' }}
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>

          </form>

          <div style={{ marginTop: 16, fontSize: 13, color: '#64748b', textAlign: 'center' }}>
            No account? <Link to="/signup" style={{ color: '#1d4ed8', fontWeight: 600, textDecoration: 'none' }}>Sign up</Link>
          </div>
        </div>

      </div>
    </div>
  );
}
 
 