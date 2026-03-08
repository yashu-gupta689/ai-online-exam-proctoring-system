import { useEffect } from 'react';

export default function Timer({ seconds, onTick, onEnd }) {
  useEffect(() => {
    if (seconds <= 0) {
      onEnd && onEnd();
      return;
    }
    const t = setInterval(() => {
      onTick && onTick();
    }, 1000);
    return () => clearInterval(t);
  }, [seconds, onTick, onEnd]);
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return <div>Time Left: {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}</div>;
}
