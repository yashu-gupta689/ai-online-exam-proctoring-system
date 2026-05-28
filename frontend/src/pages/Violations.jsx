import { useEffect, useState } from 'react';
import api from '../services/api';

export default function Violations() {
  const [violations, setViolations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('all');

  useEffect(() => {
    const fetchViolations = async () => {
      try {
        const res = await api.get('/violations');
        // The API returns an array directly based on the read tool output
        setViolations(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        console.error('Failed to fetch violations:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchViolations();
  }, []);

  const getSeverity = (type) => {
    const high = ['phone_detected', 'multiple_faces', 'laptop_detected'];
    const medium = ['face_absent', 'tab_switch', 'background_speech'];
    if (high.includes(type)) return { label: 'High', color: '#dc2626', bg: '#fef2f2' };
    if (medium.includes(type)) return { label: 'Medium', color: '#f59e0b', bg: '#fffbeb' };
    return { label: 'Low', color: '#2563eb', bg: '#eff6ff' };
  };

  const filteredViolations = typeFilter === 'all' 
    ? violations 
    : violations.filter(v => v.type === typeFilter);

  const exportCSV = () => {
    const headers = ['Student', 'Type', 'Severity', 'Timestamp'];
    const rows = filteredViolations.map(v => [
      v.studentId,
      v.type,
      getSeverity(v.type).label,
      new Date(v.timestamp).toLocaleString()
    ]);
    
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `violations_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>⏳ Loading Violations...</div>;

  const uniqueTypes = ['all', ...new Set(violations.map(v => v.type))];

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ margin: 0, color: '#0f172a' }}>Exam Violations</h1>
        <button 
          onClick={exportCSV}
          style={{ 
            padding: '10px 20px', 
            background: '#0f172a', 
            color: '#fff', 
            border: 'none', 
            borderRadius: '8px', 
            fontWeight: '600', 
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          📥 Export as CSV
        </button>
      </div>

      {/* Filters */}
      <div style={{ marginBottom: '24px' }}>
        <label style={{ fontSize: '14px', color: '#64748b', marginRight: '12px', fontWeight: '600' }}>Filter by Type:</label>
        <select 
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          style={{ 
            padding: '10px 16px', 
            borderRadius: '10px', 
            border: '1px solid #e2e8f0',
            background: '#fff',
            fontSize: '14px',
            minWidth: '200px'
          }}
        >
          {uniqueTypes.map(t => (
            <option key={t} value={t}>{t === 'all' ? 'All Types' : t.replace(/_/g, ' ')}</option>
          ))}
        </select>
      </div>

      <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead style={{ background: '#f8fafc', color: '#64748b', fontSize: '12px', textTransform: 'uppercase' }}>
              <tr>
                <th style={{ padding: '16px' }}>Student</th>
                <th style={{ padding: '16px' }}>Violation Type</th>
                <th style={{ padding: '16px' }}>Severity</th>
                <th style={{ padding: '16px' }}>Timestamp</th>
                <th style={{ padding: '16px' }}>Evidence</th>
              </tr>
            </thead>
            <tbody style={{ color: '#475569', fontSize: '14px' }}>
              {filteredViolations.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>No violations recorded.</td>
                </tr>
              ) : (
                filteredViolations.map((v, i) => {
                  const severity = getSeverity(v.type);
                  return (
                    <tr key={v._id} style={{ borderBottom: i === filteredViolations.length - 1 ? 'none' : '1px solid #f1f5f9' }}>
                      <td style={{ padding: '16px', fontWeight: '600', color: '#1e293b' }}>{v.studentId}</td>
                      <td style={{ padding: '16px', textTransform: 'capitalize' }}>{v.type.replace(/_/g, ' ')}</td>
                      <td style={{ padding: '16px' }}>
                        <span style={{ 
                          padding: '4px 10px', 
                          borderRadius: '20px', 
                          fontSize: '12px', 
                          fontWeight: '700',
                          background: severity.bg,
                          color: severity.color
                        }}>
                          {severity.label}
                        </span>
                      </td>
                      <td style={{ padding: '16px' }}>{new Date(v.timestamp).toLocaleString()}</td>
                      <td style={{ padding: '16px' }}>
                        {v.screenshotPath ? (
                          <a href={`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'}${v.screenshotPath}`} target="_blank" rel="noreferrer" style={{ color: '#2563eb', textDecoration: 'none', fontWeight: '600' }}>
                            View Image ↗
                          </a>
                        ) : (
                          <span style={{ color: '#94a3b8' }}>No Image</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
