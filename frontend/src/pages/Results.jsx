import { useEffect, useState } from 'react';
import api from '../services/api.js';

export default function Results() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get('/results/me');
        setData(res.data);
        setError('');
      } catch (e) {
        setError('Failed to load results');
      }
    };
    load();
  }, []);

  const session = data?.session;
  const violations = data?.violations || [];
  const prob = data?.cheatingProbability || 0;

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ fontSize: 24, fontWeight: 800 }}>Results</div>
        <button style={{ background: '#1d4ed8', color: '#fff', padding: '8px 12px', borderRadius: 8 }} onClick={() => {
          const rows = [['Time', 'Type', 'Screenshot']].concat(violations.map(v => [new Date(v.timestamp).toLocaleString(), v.type, v.screenshotPath || '']));
          const csv = rows.map(r => r.map(x => `"${String(x).replace(/"/g, '""')}"`).join(',')).join('\n');
          const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'results.csv';
          document.body.appendChild(a);
          a.click();
          a.remove();
          URL.revokeObjectURL(url);
        }}>Export CSV</button>
      </div>
      {error && <div style={{ color: '#ef4444', marginBottom: 10 }}>{error}</div>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
        <div className="card" style={{ padding: 16 }}>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#1d4ed8' }}>{session?.score ?? '-'}</div>
          <div>Average Score</div>
        </div>
        <div className="card" style={{ padding: 16 }}>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#22c55e' }}>{session?.score && session?.total ? Math.round((session.score / session.total) * 100) + '%' : '-'}</div>
          <div>Pass Rate</div>
        </div>
        <div className="card" style={{ padding: 16 }}>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#f59e0b' }}>{data?.totalExams ?? 1}</div>
          <div>Total Exams</div>
        </div>
      </div>
      <div className="card" style={{ padding: 12, marginBottom: 12 }}>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by student name" />
      </div>
      <div className="card" style={{ padding: 12 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #eee', padding: 8 }}>Student</th>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #eee', padding: 8 }}>Exam</th>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #eee', padding: 8 }}>Score</th>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #eee', padding: 8 }}>Grade</th>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #eee', padding: 8 }}>Date</th>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #eee', padding: 8 }}>Status</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ borderBottom: '1px solid #f3f3f3', padding: 8 }}>{data?.user?.name || 'You'}</td>
              <td style={{ borderBottom: '1px solid #f3f3f3', padding: 8 }}>{session ? 'Final Exam' : '-'}</td>
              <td style={{ borderBottom: '1px solid #f3f3f3', padding: 8 }}>{session?.score ?? '-'}</td>
              <td style={{ borderBottom: '1px solid #f3f3f3', padding: 8 }}>
                {(() => {
                  const s = session?.score ?? 0;
                  const t = session?.total ?? 100;
                  const pct = t ? s / t : 0;
                  const grade = pct >= 0.9 ? 'A' : pct >= 0.8 ? 'B' : pct >= 0.7 ? 'C' : pct >= 0.6 ? 'D' : 'F';
                  const color = grade === 'A' ? '#22c55e' : grade === 'B' ? '#1d4ed8' : grade === 'C' ? '#f59e0b' : grade === 'D' ? '#f97316' : '#ef4444';
                  return <span style={{ color }}>{grade}</span>;
                })()}
              </td>
              <td style={{ borderBottom: '1px solid #f3f3f3', padding: 8 }}>{session ? new Date(session.endedAt).toLocaleString() : '-'}</td>
              <td style={{ borderBottom: '1px solid #f3f3f3', padding: 8 }}>
                {(() => {
                  const pass = session && session.score >= Math.round((session.total || 100) * 0.6);
                  const bg = pass ? '#22c55e' : '#ef4444';
                  return <span style={{ background: bg, color: '#fff', padding: '4px 8px', borderRadius: 999 }}>{pass ? 'Pass' : 'Fail'}</span>;
                })()}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div style={{ marginTop: 16 }}>
        <div style={{ fontWeight: 700, marginBottom: 6 }}>Violations</div>
        {violations.length === 0 && <div className="card" style={{ padding: 12 }}>No violations during this exam.</div>}
        {violations.length > 0 && (
          <ul style={{ paddingLeft: 18, margin: 0 }}>
            {violations.map((v) => (
              <li key={v._id || v.timestamp}>
                [{new Date(v.timestamp).toLocaleString()}] {v.type} {v.screenshotPath && (<a href={v.screenshotPath} target="_blank" rel="noreferrer" style={{ color: '#1d4ed8' }}>screenshot</a>)}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
