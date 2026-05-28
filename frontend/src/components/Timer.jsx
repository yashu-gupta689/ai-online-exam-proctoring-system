import { useEffect, useState } from 'react';

export default function Timer({ seconds, onTick, onEnd }) {
  const [warning, setWarning] = useState('');

  useEffect(() => {
    if (seconds <= 0) {
      onEnd && onEnd();
      return;
    }

    if (seconds === 300) {
      setWarning('yellow');
      playBeep();
    } else if (seconds === 60) {
      setWarning('red');
      playBeep();
    } else if (seconds > 300) {
      setWarning('');
    }

    const t = setInterval(() => {
      onTick && onTick();
    }, 1000);

    return () => clearInterval(t);
  }, [seconds, onTick, onEnd]);

  const playBeep = () => {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(440, audioContext.currentTime);
    oscillator.connect(audioContext.destination);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.5);
  };

  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;

  const timerStyle = {
    color: warning === 'yellow' ? 'yellow' : warning === 'red' ? 'red' : 'inherit',
    animation: warning === 'red' ? 'blinker 1s linear infinite' : 'none',
  };

  return (
    <div style={timerStyle}>
      Time Left: {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
      <style>{`
        @keyframes blinker {
          50% {
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}