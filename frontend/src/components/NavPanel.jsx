export default function NavPanel({ questions, answers, currentIndex, onJump }) {
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      {questions.map((q, idx) => {
        const answered = Number.isInteger(answers[q.id]);
        const isCurrent = idx === currentIndex;
        const bg = isCurrent ? '#1976d2' : answered ? '#4caf50' : '#e0e0e0';
        const color = isCurrent ? '#fff' : '#000';
        return (
          <button
            key={q.id}
            onClick={() => onJump(idx)}
            style={{ width: 36, height: 36, background: bg, color, border: 'none', borderRadius: 4 }}
          >
            {idx + 1}
          </button>
        );
      })}
    </div>
  );
}
