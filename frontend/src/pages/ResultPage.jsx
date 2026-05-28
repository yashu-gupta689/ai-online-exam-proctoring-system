import { useNavigate } from 'react-router-dom';

export default function ResultPage({ result }) {
  const navigate = useNavigate();

  if (!result) return null;

  const { score, total, grade, cheatingScore, passed } = result;
  const percent = total > 0 ? Math.round((score / total) * 100) : 0;

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      minHeight: '80vh',
      padding: '20px',
      fontFamily: 'Inter, system-ui, sans-serif'
    }}>
      <div style={{ 
        background: '#fff', 
        padding: '40px', 
        borderRadius: '24px', 
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
        maxWidth: '500px',
        width: '100%',
        textAlign: 'center',
        border: '1px solid #e2e8f0'
      }}>
        <div style={{ fontSize: '64px', marginBottom: '16px' }}>
          {passed ? '🎉' : '📚'}
        </div>
        
        <h1 style={{ margin: '0 0 8px', color: '#0f172a' }}>Exam Submitted!</h1>
        <p style={{ color: '#64748b', marginBottom: '32px' }}>Your responses have been recorded successfully.</p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '32px' }}>
          <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px' }}>
            <div style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>Score</div>
            <div style={{ fontSize: '24px', fontWeight: '800', color: '#1e293b' }}>{score}/{total}</div>
            <div style={{ fontSize: '14px', color: '#64748b' }}>({percent}%)</div>
          </div>
          <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px' }}>
            <div style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>Grade</div>
            <div style={{ fontSize: '24px', fontWeight: '800', color: passed ? '#16a34a' : '#dc2626' }}>{grade}</div>
            <div style={{ fontSize: '14px', color: '#64748b' }}>{passed ? 'PASSED' : 'FAILED'}</div>
          </div>
        </div>

        <div style={{ background: '#fff7ed', padding: '16px', borderRadius: '12px', marginBottom: '32px', border: '1px solid #ffedd5' }}>
          <div style={{ fontSize: '12px', color: '#9a3412', textTransform: 'uppercase', marginBottom: '4px', fontWeight: '700' }}>Proctoring Summary</div>
          <div style={{ fontSize: '16px', color: '#c2410c' }}>
            Cheating Score: <strong>{cheatingScore} pts</strong>
          </div>
          <p style={{ fontSize: '12px', color: '#9a3412', margin: '4px 0 0' }}>
            {cheatingScore < 20 ? '✅ Low suspicion' : '⚠️ Moderate/High suspicion'}
          </p>
        </div>

        <button 
          onClick={() => navigate('/dashboard')}
          style={{ 
            width: '100%', 
            padding: '14px', 
            background: '#0f172a', 
            color: '#fff', 
            border: 'none', 
            borderRadius: '12px', 
            fontWeight: '700', 
            cursor: 'pointer',
            fontSize: '16px',
            boxShadow: '0 4px 12px rgba(15, 23, 42, 0.2)',
            transition: 'transform 0.2s'
          }}
          onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
          onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
        >
          Go to Dashboard
        </button>
      </div>
    </div>
  );
}
