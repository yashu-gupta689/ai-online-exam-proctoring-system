import { useEffect, useState } from 'react';
import api from '../services/api';

export default function Results() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all'); // all, pass, fail

  useEffect(() => {
    const fetchResults = async () => {
      try {
        const res = await api.get('/results');
        if (Array.isArray(res.data)) setResults(res.data);
      } catch (err) {
        console.error('Failed to fetch results:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchResults();
  }, []);

  const filteredResults = results.filter(r => {
    const matchesSearch = r.studentId.toLowerCase().includes(search.toLowerCase());
    const percent = Math.round((r.score / r.total) * 100);
    const isPass = percent >= (r.examId?.passingScore || 50);
    
    if (filter === 'pass') return matchesSearch && isPass;
    if (filter === 'fail') return matchesSearch && !isPass;
    return matchesSearch;
  });

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>⏳ Loading Results...</div>;

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <h1 style={{ marginBottom: '24px', color: '#0f172a' }}>Exam Results (Admin)</h1>

      {/* Filters & Search */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <input 
          type="text" 
          placeholder="Search by student email..." 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ 
            flex: 1, 
            minWidth: '250px', 
            padding: '12px 16px', 
            borderRadius: '10px', 
            border: '1px solid #e2e8f0',
            fontSize: '14px'
          }}
        />
        <select 
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={{ 
            padding: '12px 16px', 
            borderRadius: '10px', 
            border: '1px solid #e2e8f0',
            background: '#fff',
            fontSize: '14px'
          }}
        >
          <option value="all">All Results</option>
          <option value="pass">Passed Only</option>
          <option value="fail">Failed Only</option>
        </select>
      </div>

      <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead style={{ background: '#f8fafc', color: '#64748b', fontSize: '12px', textTransform: 'uppercase' }}>
              <tr>
                <th style={{ padding: '16px' }}>Student</th>
                <th style={{ padding: '16px' }}>Exam</th>
                <th style={{ padding: '16px' }}>Score</th>
                <th style={{ padding: '16px' }}>Grade</th>
                <th style={{ padding: '16px' }}>Violations</th>
                <th style={{ padding: '16px' }}>Date</th>
                <th style={{ padding: '16px' }}>Status</th>
              </tr>
            </thead>
            <tbody style={{ color: '#475569', fontSize: '14px' }}>
              {filteredResults.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>No matching results found.</td>
                </tr>
              ) : (
                filteredResults.map((r, i) => {
                  const percent = Math.round((r.score / r.total) * 100);
                  const isPass = percent >= (r.examId?.passingScore || 50);
                  return (
                    <tr key={r._id} style={{ borderBottom: i === filteredResults.length - 1 ? 'none' : '1px solid #f1f5f9' }}>
                      <td style={{ padding: '16px', fontWeight: '600', color: '#1e293b' }}>{r.studentId}</td>
                      <td style={{ padding: '16px' }}>{r.examId?.title || 'Unknown Exam'}</td>
                      <td style={{ padding: '16px' }}>{r.score}/{r.total} ({percent}%)</td>
                      <td style={{ padding: '16px' }}>
                        <span style={{ fontWeight: '800', color: r.grade === 'A' ? '#16a34a' : '#2563eb' }}>{r.grade || '-'}</span>
                      </td>
                      <td style={{ padding: '16px' }}>
                        <span style={{ color: r.cheatingScore > 20 ? '#dc2626' : '#64748b' }}>
                          {r.cheatingScore || 0} pts
                        </span>
                      </td>
                      <td style={{ padding: '16px' }}>{new Date(r.createdAt).toLocaleDateString()}</td>
                      <td style={{ padding: '16px' }}>
                        <span style={{ 
                          padding: '4px 10px', 
                          borderRadius: '20px', 
                          fontSize: '12px', 
                          fontWeight: '700',
                          background: isPass ? '#dcfce7' : '#fef2f2',
                          color: isPass ? '#166534' : '#991b1b'
                        }}>
                          {isPass ? 'PASS' : 'FAIL'}
                        </span>
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
