import { useEffect, useRef, useState, useCallback } from 'react';
import { io as ioClient } from 'socket.io-client';
import api from '../services/api.js';
import Timer from './Timer.jsx';
import QuestionCard from './QuestionCard.jsx';
import NavPanel from './NavPanel.jsx';

export default function Exam() {
  const videoRef = useRef(null);
  const [status, setStatus] = useState('Ready');
  const [started, setStarted] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [remainingSec, setRemainingSec] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [violations, setViolations] = useState([]);
  const [warning, setWarning] = useState('');
  const socketRef = useRef(null);
  const studentIdRef = useRef(null);
  const frameTimerRef = useRef(null);
  const listenersRef = useRef({ onVis: null, onBlur: null, onFs: null, onBeforeUnload: null, screenPatch: false, origGetDisplay: null, origMediaRecorder: null });
  const BASE_API = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000/api';
  const [blocked, setBlocked] = useState(false);
  const audioCtxRef = useRef(null);
  const audioAnalyserRef = useRef(null);
  const audioStreamRef = useRef(null);
  const audioIntervalRef = useRef(null);
  const voiceStartRef = useRef(null);
  const lastVoiceEmitRef = useRef(0);
  const netIntervalRef = useRef(null);

  const showWarning = (msg) => {
    setWarning(msg);
    setTimeout(() => setWarning(''), 4000);
  };

  const postViolation = async (type) => {
    try {
      if (!studentIdRef.current) {
        const me = await api.get('/auth/me');
        studentIdRef.current = me.data?.user?.email || 'anonymous';
      }
      await api.post('/violation', { studentId: studentIdRef.current, type, timestamp: Date.now() });
    } catch {}
  };

  const enterFullscreen = async () => {
    const el = document.documentElement;
    const req = el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen || el.mozRequestFullScreen;
    if (req) {
      try { await req.call(el); } catch {}
    }
  };

  const exitFullscreen = async () => {
    const exit = document.exitFullscreen || document.webkitExitFullscreen || document.msExitFullscreen || document.mozCancelFullScreen;
    if (exit) {
      try { await exit.call(document); } catch {}
    }
  };

  const preventOps = useCallback((e) => {
    if (e.type === 'contextmenu') e.preventDefault();
    if (e.type === 'copy' || e.type === 'paste' || e.type === 'cut') e.preventDefault();
    if (e.type === 'keydown') {
      const k = e.key;
      const kl = k.toLowerCase();
      if (e.ctrlKey && kl === 'c') {
        showWarning('Copy blocked (Ctrl+C)');
        postViolation('key_ctrl_c');
        e.preventDefault();
      } else if (e.ctrlKey && kl === 'v') {
        showWarning('Paste blocked (Ctrl+V)');
        postViolation('key_ctrl_v');
        e.preventDefault();
      } else if (e.ctrlKey && kl === 'tab') {
        showWarning('Tab switch attempt (Ctrl+Tab)');
        postViolation('key_ctrl_tab');
        e.preventDefault();
      } else if (e.altKey && kl === 'tab') {
        showWarning('Tab switch attempt (Alt+Tab)');
        postViolation('key_alt_tab');
        e.preventDefault();
      } else if (e.ctrlKey && ['x', 's', 'a'].includes(kl)) {
        e.preventDefault();
      }
    }
  }, []);

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(t => t.stop());
    }
  };

  const stopMicMonitor = () => {
    if (audioIntervalRef.current) {
      clearInterval(audioIntervalRef.current);
      audioIntervalRef.current = null;
    }
    if (audioCtxRef.current) {
      try { audioCtxRef.current.close(); } catch {}
      audioCtxRef.current = null;
    }
    if (audioStreamRef.current) {
      try {
        audioStreamRef.current.getTracks().forEach(t => t.stop());
      } catch {}
      audioStreamRef.current = null;
    }
    audioAnalyserRef.current = null;
    voiceStartRef.current = null;
  };

  const startMicMonitor = async () => {
    try {
      const mic = await navigator.mediaDevices.getUserMedia({ audio: { noiseSuppression: true, echoCancellation: true }, video: false });
      audioStreamRef.current = mic;
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      audioCtxRef.current = ctx;
      const source = ctx.createMediaStreamSource(mic);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);
      audioAnalyserRef.current = analyser;
      const data = new Float32Array(analyser.fftSize);
      const THRESH = 0.02;
      const DURATION_MS = 1500;
      const COOLDOWN_MS = 20000;
      audioIntervalRef.current = setInterval(async () => {
        if (!audioAnalyserRef.current) return;
        analyser.getFloatTimeDomainData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i++) sum += data[i] * data[i];
        const rms = Math.sqrt(sum / data.length);
        const now = Date.now();
        if (rms > THRESH) {
          if (!voiceStartRef.current) voiceStartRef.current = now;
          if ((now - voiceStartRef.current) >= DURATION_MS && now - lastVoiceEmitRef.current > COOLDOWN_MS) {
            lastVoiceEmitRef.current = now;
            showWarning('Background speech detected');
            postViolation('background_speech');
            if (socketRef.current) {
              socketRef.current.emit('activity', { activity: 'speech_detected', studentId: studentIdRef.current || 'anonymous' });
            }
            voiceStartRef.current = null;
          }
        } else {
          voiceStartRef.current = null;
        }
      }, 150);
    } catch {
      // Mic permission denied or unavailable; skip monitoring
    }
  };

  const stopNetMonitor = () => {
    if (netIntervalRef.current) {
      clearInterval(netIntervalRef.current);
      netIntervalRef.current = null;
    }
    window.removeEventListener('offline', onOffline);
    window.removeEventListener('online', onOnline);
  };

  const onOffline = async () => {
    showWarning('Network offline detected');
    await postViolation('net_offline');
    if (socketRef.current) {
      socketRef.current.emit('activity', { activity: 'net_offline', studentId: studentIdRef.current || 'anonymous' });
    }
  };
  const onOnline = async () => {
    showWarning('Network online');
    if (socketRef.current) {
      socketRef.current.emit('activity', { activity: 'net_online', studentId: studentIdRef.current || 'anonymous' });
    }
  };

  const startNetMonitor = async () => {
    window.addEventListener('offline', onOffline);
    window.addEventListener('online', onOnline);
    netIntervalRef.current = setInterval(async () => {
      if (!socketRef.current) return;
      try {
        const t0 = performance.now();
        const res = await api.get('/health', { headers: { 'Cache-Control': 'no-cache' }, params: { t: Date.now() } });
        const t1 = performance.now();
        const latencyMs = Math.max(0, Math.round(t1 - t0));
        const payloadSize = JSON.stringify(res.data || {}).length; // bytes approx
        const speedKbps = Math.round(((payloadSize * 8) / Math.max(1, latencyMs / 1000)) / 1000);
        socketRef.current.emit('activity', {
          activity: 'net_update',
          studentId: studentIdRef.current || 'anonymous',
          latencyMs,
          speedKbps,
          online: navigator.onLine
        });
      } catch {
        // Treat as high latency/offline event
        socketRef.current.emit('activity', {
          activity: 'net_update',
          studentId: studentIdRef.current || 'anonymous',
          latencyMs: -1,
          speedKbps: 0,
          online: navigator.onLine
        });
      }
    }, 5000);
  };

  const triggerScreenBlock = async () => {
    showWarning('Screen capture/recording detected');
    try {
      await postViolation('screen_capture_detected');
    } catch {}
    setStatus('Screen capture detected. Exam blocked.');
    if (started) {
      setStarted(false);
      setRemainingSec(0);
      stopCamera();
      await exitFullscreen();
      if (frameTimerRef.current) { clearInterval(frameTimerRef.current); frameTimerRef.current = null; }
      if (socketRef.current) { socketRef.current.disconnect(); socketRef.current = null; }
      stopMicMonitor();
      stopNetMonitor();
      if (listenersRef.current.onVis) document.removeEventListener('visibilitychange', listenersRef.current.onVis);
      if (listenersRef.current.onBlur) window.removeEventListener('blur', listenersRef.current.onBlur);
      if (listenersRef.current.onFs) document.removeEventListener('fullscreenchange', listenersRef.current.onFs);
      if (listenersRef.current.onBeforeUnload) window.removeEventListener('beforeunload', listenersRef.current.onBeforeUnload);
    }
    setBlocked(true);
  };

  const installScreenCaptureDetection = () => {
    if (listenersRef.current.screenPatch) return;
    const md = navigator.mediaDevices;
    if (md && md.getDisplayMedia) {
      const orig = md.getDisplayMedia.bind(md);
      listenersRef.current.origGetDisplay = orig;
      md.getDisplayMedia = async function(...args) {
        await triggerScreenBlock();
        return orig(...args);
      };
    }
    if (window.MediaRecorder) {
      const OrigMR = window.MediaRecorder;
      const PatchedMR = function(stream, options) {
        try {
          const tracks = stream && stream.getVideoTracks ? stream.getVideoTracks() : [];
          const hasDisplay = tracks.some(t => {
            const s = t.getSettings ? t.getSettings() : {};
            return !!s.displaySurface;
          });
          if (hasDisplay) {
            triggerScreenBlock();
          }
        } catch {}
        return new OrigMR(stream, options);
      };
      PatchedMR.prototype = OrigMR.prototype;
      window.MediaRecorder = PatchedMR;
      listenersRef.current.origMediaRecorder = OrigMR;
    }
    listenersRef.current.screenPatch = true;
  };

  const startExam = async () => {
    try {
      setStatus('Checking liveness status...');
      try {
        const me = await api.get('/auth/me');
        studentIdRef.current = me.data?.user?.email || 'anonymous';
      } catch {}
      if (blocked) {
        setStatus('Exam blocked due to screen capture.');
        return;
      }
      let liveOk = false;
      try {
        await api.post('/verify/liveness-start', {});
      } catch {}
      const checkLive = async () => {
        try {
          const s = await api.get('/verify/liveness-status');
          const last = s.data?.last;
          if (last && last.success) {
            liveOk = true;
          }
        } catch {}
      };
      await checkLive();
      if (!liveOk) {
        setStatus('Waiting for liveness check...');
        let tries = 0;
        while (!liveOk && tries < 40) {
          await new Promise(r => setTimeout(r, 3000));
          await checkLive();
          tries += 1;
        }
      }
      if (!liveOk) {
        setStatus('Liveness check failed. Cannot start exam.');
        await postViolation('liveness_failed');
        return;
      }
      setStatus('Starting exam...');
      installScreenCaptureDetection();
      await enterFullscreen();
      document.addEventListener('contextmenu', preventOps);
      document.addEventListener('copy', preventOps);
      document.addEventListener('paste', preventOps);
      document.addEventListener('cut', preventOps);
      document.addEventListener('keydown', preventOps);
      const onVis = async () => {
        if (document.hidden) {
          showWarning('Tab switch or minimize detected');
          await postViolation('tab_switch');
        }
      };
      const onBlur = async () => {
        if (document.hidden) {
          showWarning('Window minimized or unfocused');
          await postViolation('window_minimize');
        } else {
          showWarning('Tab switch detected');
          await postViolation('tab_switch');
        }
      };
      const onFs = async () => {
        if (!document.fullscreenElement) {
          showWarning('Fullscreen exit detected');
          await postViolation('fullscreen_exit');
        }
      };
      const onBeforeUnload = (e) => {
        try {
          const payload = {
            studentId: studentIdRef.current || 'anonymous',
            type: 'page_refresh',
            timestamp: Date.now()
          };
          const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
          navigator.sendBeacon(`${BASE_API}/violation`, blob);
        } catch {}
        e.preventDefault();
      };
      listenersRef.current = { onVis, onBlur, onFs, onBeforeUnload };
      document.addEventListener('visibilitychange', onVis);
      window.addEventListener('blur', onBlur);
      document.addEventListener('fullscreenchange', onFs);
      window.addEventListener('beforeunload', onBeforeUnload);
      setStatus('Requesting camera');
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      startMicMonitor();
      startNetMonitor();
      setStatus('Fetching questions');
      const res = await api.get('/exams/questions');
      const qs = res.data?.questions || [];
      const dur = res.data?.durationSec || 600;
      setQuestions(qs);
      setRemainingSec(dur);
      await api.post('/exams/start', { startedAt: new Date().toISOString() });
      setStarted(true);
      setStatus('Exam started');
      try {
        const me = await api.get('/auth/me');
        studentIdRef.current = me.data?.user?.email || 'anonymous';
      } catch {}
      const socket = ioClient(import.meta.env.VITE_SOCKET_URL || 'http://localhost:4000');
      socketRef.current = socket;
      socket.emit('identify', { role: 'student', studentId: studentIdRef.current });
      socket.emit('activity', { activity: 'exam_started', studentId: studentIdRef.current });
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      frameTimerRef.current = setInterval(() => {
        const video = videoRef.current;
        if (!video || video.readyState < 2) return;
        canvas.width = 320; canvas.height = 240;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
        socket.emit('frame', { imageBase64: dataUrl, studentId: studentIdRef.current });
      }, 1000);
    } catch (e) {
      setStatus('Unable to start exam');
    }
  };

  const onTick = useCallback(() => {
    setRemainingSec((s) => s - 1);
  }, []);

  const submitExam = useCallback(async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const res = await api.post('/exams/submit', { answers });
      const score = res.data?.score;
      const total = res.data?.total;
      const cheatingScore = res.data?.cheatingScore ?? 0;
      setStatus(`Submitted. Score ${score}/${total}. Cheating score ${cheatingScore}`);
    } catch (e) {
      setStatus('Submit failed');
    } finally {
      setStarted(false);
      setRemainingSec(0);
      stopCamera();
      await exitFullscreen();
      if (frameTimerRef.current) { clearInterval(frameTimerRef.current); frameTimerRef.current = null; }
      if (socketRef.current) { socketRef.current.disconnect(); socketRef.current = null; }
      if (listenersRef.current.onVis) document.removeEventListener('visibilitychange', listenersRef.current.onVis);
      if (listenersRef.current.onBlur) window.removeEventListener('blur', listenersRef.current.onBlur);
      if (listenersRef.current.onFs) document.removeEventListener('fullscreenchange', listenersRef.current.onFs);
      if (listenersRef.current.onBeforeUnload) window.removeEventListener('beforeunload', listenersRef.current.onBeforeUnload);
      stopMicMonitor();
      stopNetMonitor();
      setSubmitting(false);
    }
  }, [answers, submitting]);

  useEffect(() => {
    if (started && remainingSec <= 0) {
      submitExam();
    }
  }, [started, remainingSec, submitExam]);

  useEffect(() => {
    let t;
    const poll = async () => {
      try {
        const res = await api.get('/violations');
        const list = res.data || [];
        // Show warning for new gaze/background violations
        const latest = list[0];
        if (latest && (!violations[0] || new Date(latest.timestamp).getTime() > new Date(violations[0].timestamp).getTime())) {
          const t = latest.type;
          if (['looking_away', 'gaze_left', 'gaze_right', 'looking_down'].includes(t)) showWarning('Eyes away from screen detected');
          if (t === 'background_blur') showWarning('Blurred background detected');
          if (t === 'greenscreen_detected') showWarning('Green screen detected');
          if (t === 'virtual_background_detected') showWarning('Virtual background detected');
          if (t === 'low_light') showWarning('Lighting is too low. Please improve lighting');
        }
        setViolations(list);
      } catch {}
      t = setTimeout(poll, 5000);
    };
    if (started) {
      poll();
    }
    return () => {
      if (t) clearTimeout(t);
    };
  }, [started]);

  return (
    <div style={{ padding: 16 }}>
      <div style={{ background: '#fee2e2', color: '#991b1b', padding: 12, borderRadius: 8, marginBottom: 12, fontWeight: 600 }}>
        🔴 You are being monitored by AI proctoring
      </div>
      <div style={{ marginBottom: 8, color: '#475569' }}>{status}</div>
      {warning && (
        <div style={{ background: '#fdecea', color: '#611a15', padding: 8, border: '1px solid #f5c6cb', borderRadius: 6, marginBottom: 8 }}>
          Warning: {warning}
        </div>
      )}
      {!started && (
        <button onClick={startExam} style={{ background: 'linear-gradient(90deg, #1d4ed8, #2563eb)', color: '#fff', padding: '10px 14px' }}>Start Exam</button>
      )}
      {started && (
        <div style={{ display: 'grid', gridTemplateColumns: '65% 35%', gap: 16, alignItems: 'start' }}>
          <div className="card" style={{ padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ fontWeight: 700 }}>Question {currentIndex + 1} / {questions.length}</div>
              <div style={{ color: '#ef4444', fontWeight: 800 }}>
                <Timer seconds={remainingSec} onTick={onTick} onEnd={submitExam} />
              </div>
            </div>
            <QuestionCard
              question={questions[currentIndex]}
              value={answers[questions[currentIndex]?.id]}
              onChange={(idx) => {
                const qid = questions[currentIndex]?.id;
                if (!qid) return;
                setAnswers((a) => ({ ...a, [qid]: idx }));
              }}
            />
            <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
              <button
                onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
                disabled={currentIndex === 0}
                style={{ background: '#e5e7eb' }}
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentIndex((i) => Math.min(questions.length - 1, i + 1))}
                disabled={currentIndex >= questions.length - 1}
                style={{ background: '#e5e7eb' }}
              >
                Next
              </button>
              <div style={{ flex: 1 }} />
              {(() => {
                const answeredCount = Object.keys(answers).length;
                const canSubmit = answeredCount === questions.length && !submitting;
                return (
                  <button
                    onClick={submitExam}
                    disabled={!canSubmit}
                    style={{ background: 'linear-gradient(90deg, #16a34a, #22c55e)', color: '#fff', padding: '10px 14px' }}
                  >
                    Submit
                  </button>
                );
              })()}
            </div>
            <div style={{ marginTop: 12 }}>
              {(() => {
                const answeredCount = Object.keys(answers).length;
                const total = questions.length || 1;
                const w = Math.round((answeredCount / total) * 100);
                return (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ background: '#e5e7eb', height: 10, borderRadius: 6, width: '100%' }}>
                      <div style={{ width: `${w}%`, height: '100%', background: '#1d4ed8', borderRadius: 6 }} />
                    </div>
                    <div style={{ fontSize: 12, color: '#334155' }}>{answeredCount}/{total}</div>
                  </div>
                );
              })()}
            </div>
            <div style={{ marginTop: 12 }}>
              <NavPanel
                questions={questions}
                answers={answers}
                currentIndex={currentIndex}
                onJump={(i) => setCurrentIndex(i)}
              />
            </div>
          </div>
          <div style={{ display: 'grid', gap: 12 }}>
            <div className="card" style={{ padding: 12 }}>
              <video ref={videoRef} width="100%" height="240" style={{ border: '1px solid #e5e7eb', borderRadius: 8 }} />
            </div>
            <div className="card" style={{ background: '#fff', padding: 12 }}>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>Recent Violations</div>
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {violations.slice(0, 5).map(v => (
                  <li key={v._id || v.timestamp}>{v.type} @ {new Date(v.timestamp).toLocaleTimeString()}</li>
                ))}
                {violations.length === 0 && <li>No violations</li>}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
