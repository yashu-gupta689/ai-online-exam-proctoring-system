import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api.js';

export default function AdminRegister() {
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '', secretKey: '' });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async () => {
    if (!form.name || !form.email || !form.password || !form.secretKey) {
      setMsg('Please fill all fields!'); return;
    }
    if (form.password !== form.confirmPassword) {
      setMsg('Passwords do not match!'); return;
    }
    if (form.password.length < 6) {
      setMsg('Password must be at least 6 characters!'); return;
    }
    setLoading(true);
    try {
      await api.post('/auth/signup', {
        name: form.name,
        email: form.email,
        password: form.password,
        role: 'admin',
        adminSecret: form.secretKey,
      });
      setSuccess(true);
      setMsg('Admin account created! Redirecting...');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      const error = err.response?.data?.error || 'Registration failed';
      if (err.response?.status === 409) {
        setMsg('Email already registered!');
      } else if (err.response?.status === 403) {
        setMsg('Invalid secret key!');
      } else {
        setMsg('Error: ' + error);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div style={{ width: '100%', maxWidth: 480, padding: 24 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 56, marginBottom: 12 }}>Admin</div>
          <h1 style={{ color: '#fff', margin: '0 0 8px', fontSize: 28, fontWeight: 700 }}>Admin Registration</h1>
          <p style={{ color: '#94a3b8', margin: 0, fontSize: 15 }}>Create your administrator account</p>
        </div>
        <div style={{ background: '#1e293b', borderRadius: 16, padding: 32, border: '1px solid #334155', boxShadow: '0 25px 50px rgba(0,0,0,0.5)' }}>
          {success ? (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <h3 style={{ color: '#22c55e', margin: '0 0 8px' }}>Account Created!</h3>
              <p style={{ color: '#94a3b8' }}>Redirecting to login...</p>
            </div>
          ) : (
            <>
              {msg && (
                <div style={{ padding: '12px 16px', borderRadius: 10, background: msg.includes('created') ? '#14532d' : '#450a0a', color: msg.includes('created') ? '#86efac' : '#fca5a5', marginBottom: 20, fontWeight: 600, fontSize: 14 }}>
                  {msg}
                </div>
              )}
              <div style={{ marginBottom: 16 }}>
                <label style={lbl}>Full Name</label>
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Enter your full name" style={inp} />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={lbl}>Email Address</label>
                <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="admin@example.com" style={inp} />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={lbl}>Password</label>
                <input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="Min 6 characters" style={inp} />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={lbl}>Confirm Password</label>
                <input type="password" value={form.confirmPassword} onChange={e => setForm({ ...form, confirmPassword: e.target.value })} placeholder="Re-enter password" style={inp} />
                {form.confirmPassword && form.password !== form.confirmPassword && (
                  <p style={{ color: '#ef4444', fontSize: 12, margin: '4px 0 0' }}>Passwords do not match</p>
                )}
              </div>
              <div style={{ marginBottom: 24 }}>
                <label style={lbl}>Admin Secret Key</label>
                <input type="password" value={form.secretKey} onChange={e => setForm({ ...form, secretKey: e.target.value })} placeholder="Enter admin secret key" style={{ ...inp, borderColor: '#7c3aed' }} />
                <p style={{ color: '#64748b', fontSize: 12, margin: '4px 0 0' }}>Contact system administrator for the secret key</p>
              </div>
              <button onClick={handleSubmit} disabled={loading} style={{ width: '100%', padding: '14px', background: loading ? '#334155' : 'linear-gradient(90deg, #7c3aed, #6d28d9)', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', fontSize: 16 }}>
                {loading ? 'Creating Account...' : 'Create Admin Account'}
              </button>
              <div style={{ marginTop: 20, textAlign: 'center' }}>
                <p style={{ color: '#64748b', fontSize: 14, margin: 0 }}>
                  Already have an account? <Link to="/login" style={{ color: '#3b82f6', fontWeight: 600, textDecoration: 'none' }}>Login here</Link>
                </p>
              </div>
            </>
          )}
        </div>
        <p style={{ textAlign: 'center', color: '#475569', fontSize: 13, marginTop: 20 }}>Admin registration requires a valid secret key</p>
      </div>
    </div>
  );
}

const lbl = { display: 'block', color: '#94a3b8', fontSize: 13, fontWeight: 600, marginBottom: 6 };
const inp = { width: '100%', padding: '12px 14px', background: '#0f172a', border: '1px solid #334155', borderRadius: 10, color: '#fff', fontSize: 14, outline: 'none', boxSizing: 'border-box' };