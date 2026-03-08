import { useEffect, useState } from 'react';
import api from '../services/api.js';

export default function Violations() {
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');
  useEffect(() => {
    let t;
    const load = async () => {
      try {
        const res = await api.get('/violations');
        setItems(res.data || []);
        setError('');
      } catch (e) {
        setError('Failed to load violations');
      }
      t = setTimeout(load, 5000);
    };
    load();
    return () => {
      if (t) clearTimeout(t);
    };
  }, []);
  return (
    <div style={{ padding: 16 }}>
      <div style={{ fontSize: 24, fontWeight: 800, color: '#ef4444', marginBottom: 12 }}>⚠️ Violations Report</div>
      {error && <div style={{ color: '#ef4444', marginBottom: 10 }}>{error}</div>}
      <div className="card" style={{ padding: 12, marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <select style={{ minWidth: 160 }}>
            <option>All Students</option>
          </select>
          <select style={{ minWidth: 160 }}>
            <option>All Types</option>
          </select>
          <input type="date" />
          <input type="date" />
        </div>
      </div>
      {items.length === 0 && (
        <div className="card" style={{ padding: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ fontSize: 24 }}>✅</div>
          <div>No violations found</div>
        </div>
      )}
      {items.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
          {items.map((v) => {
            const severity = v.type?.includes('screen') || v.type?.includes('phone') ? 'High' : v.type?.includes('tab') ? 'Medium' : 'Low';
            const sevColor = severity === 'High' ? '#ef4444' : severity === 'Medium' ? '#f59e0b' : '#22c55e';
            const initials = (v.studentId || 'NA').slice(0, 2).toUpperCase();
            return (
              <div key={v._id || v.timestamp} className="card" style={{ padding: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 999, background: '#c7d2fe', color: '#1d4ed8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                    {initials}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700 }}>{v.studentId}</div>
                    <div style={{ fontSize: 12, color: '#64748b' }}>{new Date(v.timestamp).toLocaleString()}</div>
                  </div>
                  <div style={{ padding: '4px 8px', borderRadius: 999, background: sevColor, color: '#fff', fontSize: 12 }}>{severity}</div>
                </div>
                <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ padding: '4px 8px', borderRadius: 999, background: '#e5e7eb', fontSize: 12 }}>{v.type}</div>
                  {v.screenshotPath && (
                    <a href={v.screenshotPath} target="_blank" rel="noreferrer" style={{ color: '#1d4ed8', fontSize: 12 }}>screenshot</a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
