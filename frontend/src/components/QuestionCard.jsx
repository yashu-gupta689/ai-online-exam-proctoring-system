export default function QuestionCard({ question, value, onChange }) {
  if (!question) return (
    <div style={{ padding: 20, textAlign: 'center', color: '#64748b' }}>
      No question data available.
    </div>
  );

  const options = Array.isArray(question.options) ? question.options : [];

  return (
    <div style={{ 
      background: '#fff', 
      padding: '24px', 
      borderRadius: '12px', 
      border: '1px solid #e2e8f0',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
    }}>
      <h4 style={{ 
        margin: '0 0 20px', 
        fontSize: '18px', 
        color: '#1e293b', 
        lineHeight: '1.5',
        fontWeight: '600'
      }}>
        {question.text || 'Loading question text...'}
      </h4>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {options.map((opt, idx) => {
          const isSelected = value === idx;
          return (
            <label 
              key={idx} 
              style={{ 
                display: 'flex', 
                gap: '12px', 
                alignItems: 'center', 
                padding: '14px 16px',
                borderRadius: '8px',
                border: `2px solid ${isSelected ? '#1d4ed8' : '#e2e8f0'}`,
                background: isSelected ? '#eff6ff' : '#f8fafc',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              <input
                type="radio"
                name={`q-${question.id}`}
                checked={isSelected}
                onChange={() => onChange(idx)}
                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
              />
              <span style={{ 
                fontSize: '16px', 
                color: isSelected ? '#1d4ed8' : '#475569',
                fontWeight: isSelected ? '600' : '400'
              }}>
                {opt}
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
}
