import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

export default function ExamList() {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchExams = async () => {
      try {
        setLoading(true);
        const res = await api.get('/exams/list');
        // Handle direct array response
        setExams(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        setError('Failed to fetch exams. Please try again later.');
        console.error('Fetch exams error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchExams();
  }, []);

  const handleStartExam = (examId) => {
    navigate(`/exam?examId=${examId}`);
  };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
      <div className="spinner" style={{ borderTopColor: 'var(--primary)' }}></div>
    </div>
  );

  if (error) return (
    <div style={{ padding: 40, textAlign: 'center' }}>
      <div style={{ color: 'var(--danger)', marginBottom: '16px' }}>{error}</div>
      <button className="btn btn-primary" onClick={() => window.location.reload()}>Retry</button>
    </div>
  );

  return (
    <div style={{ padding: '40px 24px', maxWidth: '1280px', margin: '0 auto' }}>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '800', color: 'var(--text-main)', marginBottom: '8px' }}>
          Available Exams
        </h1>
        <p style={{ color: 'var(--text-muted)' }}>
          Select an exam to start your proctored session
        </p>
      </div>
      
      {exams.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '60px 24px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📝</div>
          <h3 style={{ color: 'var(--text-main)', marginBottom: '8px' }}>No Exams Available</h3>
          <p style={{ color: 'var(--text-muted)' }}>Check back later for newly scheduled exams.</p>
        </div>
      ) : (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', 
          gap: '24px' 
        }}>
          {exams.map((exam) => (
            <div key={exam._id} className="card" style={{ 
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              transition: 'all 0.3s ease'
            }} onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.boxShadow = 'var(--shadow-lg)';
            }} onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'var(--shadow)';
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                <div style={{ 
                  width: '48px', 
                  height: '48px', 
                  background: 'rgba(29, 78, 216, 0.08)', 
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '24px'
                }}>
                  📚
                </div>
                <span style={{ 
                  background: 'var(--background)', 
                  color: 'var(--text-muted)', 
                  fontSize: '12px', 
                  fontWeight: '700', 
                  padding: '4px 10px', 
                  borderRadius: '20px',
                  textTransform: 'uppercase',
                  border: '1px solid var(--border)'
                }}>
                  {exam.subject || 'General'}
                </span>
              </div>
              
              <h3 style={{ margin: '0 0 8px', fontSize: '20px', color: 'var(--text-main)', fontWeight: '700' }}>
                {exam.title}
              </h3>
              
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '13px' }}>
                  ⏱ {Math.floor(exam.durationSec / 60)} mins
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '13px' }}>
                  ❓ {exam.questions?.length || 0} Questions
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '13px' }}>
                  🎯 {exam.passingScore}% Pass
                </div>
              </div>

              <div style={{ marginTop: 'auto', display: 'flex', gap: '12px', alignItems: 'center' }}>
                <button 
                  onClick={() => handleStartExam(exam._id)}
                  className="btn btn-primary"
                  style={{ flex: 1, height: '44px' }}
                >
                  Start Exam
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      
      <style>{`
        .spinner {
          width: 40px;
          height: 40px;
          border: 3px solid #e2e8f0;
          border-radius: 50%;
          border-top-color: transparent;
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
