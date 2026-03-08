export default function QuestionCard({ question, value, onChange }) {
  if (!question) return null;
  return (
    <div style={{ border: '1px solid #ddd', padding: 12, borderRadius: 8 }}>
      <div style={{ marginBottom: 8 }}>{question.text}</div>
      <div style={{ display: 'grid', gap: 6 }}>
        {question.options.map((opt, idx) => (
          <label key={idx} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              type="radio"
              name={`q-${question.id}`}
              checked={value === idx}
              onChange={() => onChange(idx)}
            />
            <span>{opt}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
