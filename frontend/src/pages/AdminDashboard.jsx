import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api.js';

export default function AdminDashboard() {
  const [active, setActive] = useState('dashboard');
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');
    if (!token || role !== 'admin') {
      navigate('/login');
      return;
    }
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    try {
      const res = await api.get('/admin/metrics');
      setMetrics(res.data);
    } catch (err) {
      console.error('Metrics fetch failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    navigate('/login');
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'students', label: 'Students', icon: '👥' },
    { id: 'exams', label: 'Exams', icon: '📝' },
    { id: 'violations', label: 'Violations', icon: '⚠️' },
    { id: 'results', label: 'Results', icon: '📈' },
  ];

  const stats = [
    { label: 'Total Students', value: metrics?.totalStudents ?? 0, icon: '👥', color: '#1d4ed8' },
    { label: 'Active Exams', value: metrics?.activeExams ?? 0, icon: '📝', color: '#16a34a' },
    { label: 'Violations Today', value: metrics?.suspiciousActivities ?? 0, icon: '⚠️', color: '#dc2626' },
    { label: 'Completed Exams', value: metrics?.completedExams ?? 0, icon: '📈', color: '#ea580c' },
  ];

  return (
    <div style={{ display: 'flex', minHeight: '90vh', background: '#f1f5f9' }}>

      {/* Sidebar */}
      <div style={{ width: 240, background: '#0f172a', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid #1e293b' }}>
          <p style={{ color: '#94a3b8', fontSize: 11, margin: 0, letterSpacing: 1 }}>ADMIN PANEL</p>
        </div>
        {navItems.map(item => (
          <button
            key={item.id}
            onClick={() => setActive(item.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '13px 20px', border: 'none', cursor: 'pointer',
              background: active === item.id ? '#1d4ed8' : 'transparent',
              color: active === item.id ? '#fff' : '#94a3b8',
              fontSize: 14, fontWeight: 500, textAlign: 'left',
            }}
          >
            <span>{item.icon}</span>{item.label}
          </button>
        ))}
      </div>

      {/* Main */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>

        {/* Top Bar */}
        <div style={{ background: '#fff', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0' }}>
          <h2 style={{ margin: 0, fontSize: 20, color: '#0f172a' }}>Welcome, Admin 👋</h2>
          <button onClick={handleLogout} style={{ padding: '8px 16px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>
            Logout
          </button>
        </div>

        <div style={{ padding: 24 }}>

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
            {stats.map(stat => (
              <div key={stat.label} style={{ background: '#fff', borderRadius: 12, padding: 20, borderLeft: `4px solid ${stat.color}`, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                <div style={{ fontSize: 28 }}>{stat.icon}</div>
                <div style={{ fontSize: 32, fontWeight: 700, color: '#0f172a', margin: '8px 0 4px' }}>
                  {loading ? '...' : stat.value}
                </div>
                <div style={{ fontSize: 13, color: '#64748b' }}>{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Content Area */}
          <div style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>

            {/* Dashboard Tab */}
            {active === 'dashboard' && (
              <div>
                <h3 style={{ margin: '0 0 16px', color: '#0f172a' }}>📊 Overview</h3>
                <p style={{ color: '#64748b' }}>Total Students: <b>{metrics?.totalStudents ?? 0}</b></p>
                <p style={{ color: '#64748b' }}>Active Exams: <b>{metrics?.activeExams ?? 0}</b></p>
                <p style={{ color: '#64748b' }}>Completed Exams: <b>{metrics?.completedExams ?? 0}</b></p>
                <p style={{ color: '#64748b' }}>Total Violations: <b>{metrics?.suspiciousActivities ?? 0}</b></p>
              </div>
            )}

            {/* Students Tab */}
            {active === 'students' && (
              <div>
                <h3 style={{ margin: '0 0 16px', color: '#0f172a' }}>👥 Students List</h3>
                {loading ? <p>Loading...</p> : (
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc' }}>
                        <th style={th}>Name</th>
                        <th style={th}>Email</th>
                        <th style={th}>Status</th>
                        <th style={th}>Violations</th>
                        <th style={th}>Cheat Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {metrics?.students?.length === 0 && (
                        <tr><td colSpan={5} style={{ textAlign: 'center', padding: 20, color: '#94a3b8' }}>No students yet</td></tr>
                      )}
                      {metrics?.students?.map((s, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={td}>{s.name}</td>
                          <td style={td}>{s.studentId}</td>
                          <td style={td}>
                            <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: s.status === 'active' ? '#dcfce7' : '#f1f5f9', color: s.status === 'active' ? '#16a34a' : '#64748b' }}>
                              {s.status || 'none'}
                            </span>
                          </td>
                          <td style={td}>{s.violations}</td>
                          <td style={td}>
                            <span style={{ color: s.cheatingScore > 20 ? '#dc2626' : s.cheatingScore > 10 ? '#ea580c' : '#16a34a', fontWeight: 600 }}>
                              {s.cheatingScore}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* Violations Tab */}
            {active === 'violations' && (
              <div>
                <h3 style={{ margin: '0 0 16px', color: '#0f172a' }}>⚠️ Violations</h3>
                <ViolationsTab />
              </div>
            )}

            {/* Results Tab */}
            {active === 'results' && (
              <div>
                <h3 style={{ margin: '0 0 16px', color: '#0f172a' }}>📈 Results</h3>
                <ResultsTab />
              </div>
            )}

            {/* Exams Tab */}
            {active === 'exams' && (
              <div>
                <h3 style={{ margin: '0 0 16px', color: '#0f172a' }}>📝 Exams</h3>
                <p style={{ color: '#64748b' }}>Exam management coming soon.</p>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}

function ViolationsTab() {
  const [violations, setViolations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/admin/violations').then(res => setViolations(res.data)).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <p>Loading...</p>;
  if (violations.length === 0) return <p style={{ color: '#94a3b8' }}>✅ No violations found</p>;

  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr style={{ background: '#f8fafc' }}>
          <th style={th}>Student</th>
          <th style={th}>Type</th>
          <th style={th}>Time</th>
          <th style={th}>Severity</th>
        </tr>
      </thead>
      <tbody>
        {violations.map((v, i) => (
          <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
            <td style={td}>{v.studentId}</td>
            <td style={td}>{v.type}</td>
            <td style={td}>{new Date(v.timestamp).toLocaleString()}</td>
            <td style={td}>
              <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: v.type === 'phone_detected' ? '#fef2f2' : v.type === 'multiple_faces' ? '#fff7ed' : '#f0fdf4', color: v.type === 'phone_detected' ? '#dc2626' : v.type === 'multiple_faces' ? '#ea580c' : '#16a34a' }}>
                {v.type === 'phone_detected' ? 'High' : v.type === 'multiple_faces' ? 'Medium' : 'Low'}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ResultsTab() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/results').then(res => setResults(res.data)).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <p>Loading...</p>;
  if (results.length === 0) return <p style={{ color: '#94a3b8' }}>No results yet</p>;

  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr style={{ background: '#f8fafc' }}>
          <th style={th}>Student</th>
          <th style={th}>Score</th>
          <th style={th}>Total</th>
          <th style={th}>Grade</th>
          <th style={th}>Status</th>
        </tr>
      </thead>
      <tbody>
        {results.map((r, i) => {
          const pct = r.total ? Math.round((r.score / r.total) * 100) : 0;
          const grade = pct >= 90 ? 'A' : pct >= 75 ? 'B' : pct >= 60 ? 'C' : pct >= 50 ? 'D' : 'F';
          const gradeColor = { A: '#16a34a', B: '#1d4ed8', C: '#ca8a04', D: '#ea580c', F: '#dc2626' };
          return (
            <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
              <td style={td}>{r.studentId}</td>
              <td style={td}>{r.score}</td>
              <td style={td}>{r.total}</td>
              <td style={td}><span style={{ fontWeight: 700, color: gradeColor[grade] }}>{grade}</span></td>
              <td style={td}>
                <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: pct >= 50 ? '#dcfce7' : '#fef2f2', color: pct >= 50 ? '#16a34a' : '#dc2626' }}>
                  {pct >= 50 ? 'Pass' : 'Fail'}
                </span>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

const th = { padding: '10px 12px', textAlign: 'left', fontSize: 13, fontWeight: 600, color: '#374151', borderBottom: '1px solid #e2e8f0' };
const td = { padding: '10px 12px', fontSize: 14, color: '#374151' };