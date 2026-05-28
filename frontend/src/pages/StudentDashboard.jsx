import { useEffect, useState } from 'react';
import api from '../services/api';

export default function StudentDashboard() {
  const [stats, setStats] = useState(null);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, resultsRes] = await Promise.all([
          api.get('/results/stats'),
          api.get('/results')
        ]);
        if (statsRes.data.ok) setStats(statsRes.data.stats);
        if (Array.isArray(resultsRes.data)) setResults(resultsRes.data);
      } catch (err) {
        console.error('Failed to fetch dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
      <div className="spinner" style={{ borderTopColor: 'var(--primary)' }}></div>
    </div>
  );

  const totalViolations = results.reduce((acc, r) => acc + (r.cheatingScore || 0), 0);

  return (
    <div style={{ padding: '40px 24px', maxWidth: '1280px', margin: '0 auto' }}>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '800', color: 'var(--text-main)', marginBottom: '8px' }}>
          Welcome back, {stats?.name || 'Student'}!
        </h1>
        <p style={{ color: 'var(--text-muted)' }}>
          Here's an overview of your academic performance and exam history.
        </p>
      </div>

      {/* Stats Summary Cards */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', 
        gap: '20px', 
        marginBottom: '40px' 
      }}>
        <div className="card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(37, 99, 235, 0.1)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>
              📝
            </div>
            <div>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Exams</div>
              <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-main)' }}>{stats?.totalExams || 0}</div>
            </div>
          </div>
        </div>
        
        <div className="card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(22, 163, 74, 0.1)', color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>
              📊
            </div>
            <div>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Avg. Score</div>
              <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-main)' }}>{stats?.avgScore || 0}%</div>
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(147, 51, 234, 0.1)', color: '#9333ea', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>
              🏆
            </div>
            <div>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Best Grade</div>
              <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-main)' }}>{stats?.bestGrade || 'N/A'}</div>
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(220, 38, 38, 0.1)', color: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>
              🚨
            </div>
            <div>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Violations</div>
              <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-main)' }}>{totalViolations}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Exam Results Table */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <div style={{ padding: '24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-main)' }}>Past Exam Results</h2>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'var(--background)', color: 'var(--text-muted)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <th style={{ padding: '16px 24px', fontWeight: '700' }}>Exam Title</th>
                <th style={{ padding: '16px 24px', fontWeight: '700' }}>Score</th>
                <th style={{ padding: '16px 24px', fontWeight: '700' }}>Grade</th>
                <th style={{ padding: '16px 24px', fontWeight: '700' }}>Violations</th>
                <th style={{ padding: '16px 24px', fontWeight: '700' }}>Date</th>
                <th style={{ padding: '16px 24px', fontWeight: '700' }}>Status</th>
              </tr>
            </thead>
            <tbody style={{ fontSize: '14px', color: 'var(--text-main)' }}>
              {results.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No exam attempts found. Start your first exam from the Exams page.
                  </td>
                </tr>
              ) : (
                results.map((r, i) => {
                  const percent = Math.round((r.score / r.total) * 100);
                  const isPass = percent >= (r.examId?.passingScore || 50);
                  
                  const getGradeColor = (g) => {
                    if (g === 'A') return 'var(--success)';
                    if (g === 'B') return 'var(--primary)';
                    if (g === 'C') return 'var(--warning)';
                    return 'var(--danger)';
                  };

                  return (
                    <tr key={r._id} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.2s' }}>
                      <td style={{ padding: '16px 24px', fontWeight: '600' }}>{r.examId?.title || 'Exam'}</td>
                      <td style={{ padding: '16px 24px' }}>
                        <div style={{ fontWeight: '700' }}>{r.score}/{r.total}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{percent}%</div>
                      </td>
                      <td style={{ padding: '16px 24px' }}>
                        <span style={{ 
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '32px',
                          height: '32px',
                          borderRadius: '8px',
                          background: `${getGradeColor(r.grade)}15`,
                          color: getGradeColor(r.grade),
                          fontWeight: '800'
                        }}>
                          {r.grade || '-'}
                        </span>
                      </td>
                      <td style={{ padding: '16px 24px' }}>
                        <span style={{ 
                          color: r.cheatingScore > 20 ? 'var(--danger)' : 'var(--text-muted)',
                          fontWeight: r.cheatingScore > 20 ? '700' : '400'
                        }}>
                          {r.cheatingScore || 0} pts
                        </span>
                      </td>
                      <td style={{ padding: '16px 24px', color: 'var(--text-muted)' }}>
                        {new Date(r.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                      </td>
                      <td style={{ padding: '16px 24px' }}>
                        <span style={{ 
                          padding: '6px 12px', 
                          borderRadius: '20px', 
                          fontSize: '11px', 
                          fontWeight: '700',
                          textTransform: 'uppercase',
                          background: isPass ? 'rgba(22, 163, 74, 0.1)' : 'rgba(220, 38, 38, 0.1)',
                          color: isPass ? 'var(--success)' : 'var(--danger)'
                        }}>
                          {isPass ? 'Pass' : 'Fail'}
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

      <style>{`
        .spinner {
          width: 40px;
          height: 40px;
          border: 3px solid #e2e8f0;
          border-radius: 50%;
          border-top-color: var(--primary);
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
