import { useEffect, useRef, useState, useCallback } from 'react';
import { io as ioClient } from 'socket.io-client';
import api from '../services/api.js';
import Timer from './Timer.jsx';
import QuestionCard from './QuestionCard.jsx';
import NavPanel from './NavPanel.jsx';

import ResultPage from '../pages/ResultPage.jsx';

// Global variables for CDN-loaded models
const tf = window.tf;
const cocoSsd = window.cocoSsd;
const FaceMesh = window.FaceMesh;

export default function Exam() {
  const [examResult, setExamResult] = useState(null);
  const query = new URLSearchParams(window.location.search);
  const examId = query.get('examId');

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const detectionIntervalRef = useRef(null);
  const faceMeshRef = useRef(null);
  const cocoModelRef = useRef(null);
  const renderLoopRef = useRef(null);
  const boundingBoxesRef = useRef([]); // { type: 'face'|'object', bbox, label }

  const [status, setStatus] = useState('Ready');
  const [started, setStarted] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [error, setError] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [remainingSec, setRemainingSec] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [violations, setViolations] = useState([]);
  const [warning, setWarning] = useState('');
  const [aiStatus, setAiStatus] = useState('⏳ Loading AI...');
  const [detectionStats, setDetectionStats] = useState({ faces: 0, objects: [], gazeWarning: false });

  const socketRef = useRef(null);
  const studentIdRef = useRef(null);
  const frameTimerRef = useRef(null);
  const listenersRef = useRef({ onVis: null, onBlur: null, onFs: null, onBeforeUnload: null });
  const BASE_API = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000/api';

  const audioCtxRef = useRef(null);
  const audioAnalyserRef = useRef(null);
  const audioStreamRef = useRef(null);
  const audioIntervalRef = useRef(null);
  const voiceStartRef = useRef(null);
  const lastVoiceEmitRef = useRef(0);

  // Gaze tracking state
  const gazeAwayStartRef = useRef(null);

  // Violation cooldowns
  const lastViolationRef = useRef({});
  const canEmitViolation = (type, cooldownMs = 8000) => {
    const now = Date.now();
    if (!lastViolationRef.current[type] || now - lastViolationRef.current[type] > cooldownMs) {
      lastViolationRef.current[type] = now;
      return true;
    }
    return false;
  };

  const showWarning = useCallback((msg) => {
    setWarning(msg);
    setTimeout(() => setWarning(''), 4000);
  }, []);

  const captureScreenshot = () => {
    const video = videoRef.current;
    if (!video) return null;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 320;
    canvas.height = video.videoHeight || 240;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.7);
  };

  const postViolation = useCallback(async (type) => {
    try {
      if (!studentIdRef.current) {
        const me = await api.get('/auth/me');
        studentIdRef.current = me.data?.user?.email || 'anonymous';
      }
      const imageBase64 = captureScreenshot();
      await api.post('/violations/violation', { 
        studentId: studentIdRef.current, 
        type, 
        timestamp: Date.now(),
        imageBase64 
      });
    } catch (e) {
      console.error('Failed to post violation:', e);
    }
  }, []);

  const enterFullscreen = async () => {
    const el = document.documentElement;
    const req = el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen;
    if (req) { try { await req.call(el); } catch {} }
  };

  const exitFullscreen = async () => {
    const exit = document.exitFullscreen || document.webkitExitFullscreen || document.msExitFullscreen;
    if (exit) { try { await exit.call(document); } catch {} }
  };

  const preventOps = useCallback((e) => {
    if (e.type === 'contextmenu') { e.preventDefault(); return; }
    if (['copy', 'paste', 'cut'].includes(e.type)) { e.preventDefault(); return; }
    if (e.type === 'keydown') {
      const k = (e.key || '').toLowerCase();
      if (e.ctrlKey && k === 'c') { showWarning('🚫 Copy blocked!'); postViolation('key_ctrl_c'); e.preventDefault(); }
      else if (e.ctrlKey && k === 'v') { showWarning('🚫 Paste blocked!'); postViolation('key_ctrl_v'); e.preventDefault(); }
      else if (e.ctrlKey && k === 'tab') { showWarning('🚫 Tab switch blocked!'); postViolation('key_ctrl_tab'); e.preventDefault(); }
      else if (e.altKey && k === 'tab') { showWarning('🚫 Alt+Tab blocked!'); postViolation('key_alt_tab'); e.preventDefault(); }
      else if (e.ctrlKey && ['x', 's', 'a'].includes(k)) { e.preventDefault(); }
    }
  }, [showWarning, postViolation]);

  const stopCamera = () => {
    if (detectionIntervalRef.current) { clearInterval(detectionIntervalRef.current); detectionIntervalRef.current = null; }
    if (streamRef.current) { 
      console.log('Stopping camera tracks...');
      streamRef.current.getTracks().forEach(t => {
        t.stop();
        console.log(`Track ${t.kind} stopped`);
      }); 
      streamRef.current = null; 
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
      videoRef.current.load(); // Force clear
    }
  };

  // ===== AI DETECTION =====
  const loadModels = async () => {
    try {
      setAiStatus('⏳ Loading AI models...');
      
      // 1. Load COCO-SSD from global window object
      if (window.cocoSsd) {
        cocoModelRef.current = await window.cocoSsd.load();
      }

      // 2. Load MediaPipe FaceMesh from global window object
      if (window.FaceMesh) {
        const faceMesh = new window.FaceMesh({
          locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
        });
        faceMesh.setOptions({
          maxNumFaces: 2,
          refineLandmarks: true,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });
        faceMesh.onResults(onFaceMeshResults);
        faceMeshRef.current = faceMesh;
      }

      setAiStatus('✅ AI Ready');
      console.log('✅ AI Models loaded from CDN!');
    } catch (e) {
      setAiStatus('⚠️ AI load failed');
      console.error('Model load error:', e);
    }
  };

  const onFaceMeshResults = (results) => {
    const video = videoRef.current;
    if (!video) return;

    const faceCount = results.multiFaceLandmarks ? results.multiFaceLandmarks.length : 0;
    
    // Update face bounding boxes for rendering
    const faceBoxes = (results.multiFaceLandmarks || []).map(landmarks => {
      let minX = 1, minY = 1, maxX = 0, maxY = 0;
      landmarks.forEach(lm => {
        if (lm.x < minX) minX = lm.x;
        if (lm.y < minY) minY = lm.y;
        if (lm.x > maxX) maxX = lm.x;
        if (lm.y > maxY) maxY = lm.y;
      });
      const w = video.videoWidth || 320;
      const h = video.videoHeight || 240;
      return {
        type: 'face',
        bbox: [minX * w, minY * h, (maxX - minX) * w, (maxY - minY) * h],
        label: 'Person',
        color: faceCount > 1 ? '#ef4444' : '#22c55e'
      };
    });

    // Update global boxes ref
    boundingBoxesRef.current = [
      ...boundingBoxesRef.current.filter(b => b.type !== 'face'),
      ...faceBoxes
    ];

    // 1. Multiple Faces Detection - IMMEDIATELY FLAG
    if (faceCount > 1 && canEmitViolation('multiple_faces', 3000)) {
      showWarning('👥 MULTIPLE FACES DETECTED! Immediately flagging violation.');
      postViolation('multiple_faces');
      if (socketRef.current) socketRef.current.emit('activity', { activity: 'multiple_faces', studentId: studentIdRef.current });
    } else if (faceCount === 0 && canEmitViolation('face_absent', 10000)) {
      showWarning('😶 Face not detected! Please stay in view.');
      postViolation('face_absent');
      if (socketRef.current) socketRef.current.emit('activity', { activity: 'face_absent', studentId: studentIdRef.current });
    }

    // 2. Advanced Gaze Tracking Logic (using iris landmarks)
    if (faceCount === 1) {
      const fl = results.multiFaceLandmarks[0];
      const w = video.videoWidth || 320;
      const h = video.videoHeight || 240;

      // Helper for iris ratio
      const getIrisRatio = (idxCenter, idxLeft, idxRight) => {
        const cx = fl[idxCenter].x * w;
        const lx = fl[idxLeft].x * w;
        const rx = fl[idxRight].x * w;
        const width = rx - lx || 1;
        return (cx - lx) / width;
      };

      // Helper for vertical ratio
      const getVerticalRatio = (idxCenter, idxTop, idxBottom) => {
        const cy = fl[idxCenter].y * h;
        const ty = fl[idxTop].y * h;
        const by = fl[idxBottom].y * h;
        const height = by - ty || 1;
        return (cy - ty) / height;
      };

      const leftRatioH = getIrisRatio(468, 33, 133);
      const rightRatioH = getIrisRatio(473, 362, 263);
      const leftRatioV = getVerticalRatio(468, 159, 145);
      const rightRatioV = getVerticalRatio(473, 386, 374);

      // Gaze direction thresholds
      let direction = 'center';
      if (leftRatioH < 0.35 && rightRatioH < 0.35) direction = 'right';
      else if (leftRatioH > 0.65 && rightRatioH > 0.65) direction = 'left';
      else if (leftRatioV < 0.3) direction = 'up';
      else if (leftRatioV > 0.8) direction = 'down';

      if (direction !== 'center') {
        if (!gazeAwayStartRef.current) {
          gazeAwayStartRef.current = Date.now();
        } else {
          const duration = (Date.now() - gazeAwayStartRef.current) / 1000;
          if (duration >= 3) {
            if (canEmitViolation(`gaze_${direction}`, 10000)) {
              showWarning(`🚨 VIOLATION: Looking ${direction} for too long!`);
              postViolation(`gaze_${direction}`);
              gazeAwayStartRef.current = null; // Reset
            }
          } else if (duration >= 1) {
            showWarning(`👀 Warning: Please look at the screen (Looking ${direction})`);
          }
        }
      } else {
        gazeAwayStartRef.current = null;
      }
    }

    setDetectionStats(s => ({ ...s, faces: faceCount }));
  };

  const runAdvancedDetection = useCallback(async () => {
    const video = videoRef.current;
    if (!video || video.readyState < 2) return;

    try {
      // 1. Run MediaPipe FaceMesh
      if (faceMeshRef.current) {
        await faceMeshRef.current.send({ image: video });
      }

      // 2. Run COCO-SSD Object Detection
      if (cocoModelRef.current) {
        const predictions = await cocoModelRef.current.detect(video);
        const prohibitedItems = ['cell phone', 'book', 'laptop'];
        const detected = predictions.filter(p => prohibitedItems.includes(p.class) && p.score > 0.5);

        const objBoxes = detected.map(p => ({
          type: 'object',
          bbox: p.bbox,
          label: `⚠️ ${p.class}`,
          color: '#f59e0b'
        }));

        // Update global boxes ref
        boundingBoxesRef.current = [
          ...boundingBoxesRef.current.filter(b => b.type !== 'object'),
          ...objBoxes
        ];

        const objectClasses = detected.map(d => d.class);
        if (objectClasses.includes('cell phone') && canEmitViolation('phone_detected', 10000)) {
          showWarning('📱 PHONE DETECTED! Put it away immediately!');
          postViolation('phone_detected');
          if (socketRef.current) socketRef.current.emit('activity', { activity: 'phone_detected', studentId: studentIdRef.current });
        } else if (objectClasses.some(c => ['book', 'laptop'].includes(c)) && canEmitViolation('prohibited_item', 15000)) {
          const item = objectClasses.find(c => ['book', 'laptop'].includes(c));
          showWarning(`🚫 Prohibited item detected: ${item}!`);
          postViolation(`prohibited_${item}`);
        }
        
        setDetectionStats(s => ({ ...s, objects: objectClasses }));
      }
    } catch (e) {
      console.error('Detection error:', e);
    }
  }, [showWarning, postViolation]);

  const renderFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2) {
      renderLoopRef.current = requestAnimationFrame(renderFrame);
      return;
    }

    const ctx = canvas.getContext('2d');
    canvas.width = video.videoWidth || 320;
    canvas.height = video.videoHeight || 240;

    // 1. Draw video frame
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // 2. Draw bounding boxes from Ref (to avoid React re-renders)
    const boxes = boundingBoxesRef.current || [];
    boxes.forEach(box => {
      const [x, y, w, h] = box.bbox;
      ctx.strokeStyle = box.color || '#22c55e';
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, w, h);

      // Label background
      ctx.fillStyle = box.color || '#22c55e';
      const labelWidth = ctx.measureText(box.label).width;
      ctx.fillRect(x, y - 20, labelWidth + 10, 20);

      // Label text
      ctx.fillStyle = '#fff';
      ctx.font = '12px Inter, sans-serif';
      ctx.fillText(box.label, x + 5, y - 5);
    });

    renderLoopRef.current = requestAnimationFrame(renderFrame);
  }, []);

  const attachCamera = useCallback((stream) => {
    streamRef.current = stream;
    const tryAttach = () => {
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().then(() => {
          console.log('✅ Camera attached!');
          // Start consolidated detection loop every 2500ms (2.5s)
          detectionIntervalRef.current = setInterval(runAdvancedDetection, 2500);
          renderFrame();
        }).catch(console.error);
      } else {
        setTimeout(tryAttach, 200);
      }
    };
    tryAttach();
  }, [runAdvancedDetection, renderFrame]);

  const stopMicMonitor = () => {
    if (audioIntervalRef.current) { clearInterval(audioIntervalRef.current); audioIntervalRef.current = null; }
    if (audioCtxRef.current) { 
      try { 
        if (audioCtxRef.current.state !== 'closed') {
          audioCtxRef.current.close(); 
        }
      } catch (e) {
        console.error('Error closing AudioContext:', e);
      }
      audioCtxRef.current = null; 
    }
    if (audioStreamRef.current) { 
      console.log('Stopping mic tracks...');
      audioStreamRef.current.getTracks().forEach(t => {
        t.stop();
        console.log(`Mic track ${t.kind} stopped`);
      }); 
      audioStreamRef.current = null; 
    }
    voiceStartRef.current = null;
  };

  const startMicMonitor = async () => {
    try {
      const mic = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      audioStreamRef.current = mic;
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      audioCtxRef.current = ctx;
      const source = ctx.createMediaStreamSource(mic);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);
      audioAnalyserRef.current = analyser;
      const data = new Float32Array(analyser.fftSize);
      audioIntervalRef.current = setInterval(async () => {
        if (!audioAnalyserRef.current) return;
        analyser.getFloatTimeDomainData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i++) sum += data[i] * data[i];
        const rms = Math.sqrt(sum / data.length);
        const now = Date.now();
        if (rms > 0.02) {
          if (!voiceStartRef.current) voiceStartRef.current = now;
          if ((now - voiceStartRef.current) >= 1500 && now - lastVoiceEmitRef.current > 20000) {
            lastVoiceEmitRef.current = now;
            showWarning('🎤 Background speech detected!');
            postViolation('background_speech');
            voiceStartRef.current = null;
          }
        } else { voiceStartRef.current = null; }
      }, 150);
    } catch {}
  };

  const onOffline = useCallback(async () => { showWarning('📡 Network offline!'); await postViolation('net_offline'); }, [showWarning, postViolation]);
  const onOnline = useCallback(() => { showWarning('📡 Network restored'); }, [showWarning]);

  const stopNetMonitor = useCallback(() => {
    window.removeEventListener('offline', onOffline);
    window.removeEventListener('online', onOnline);
  }, [onOffline, onOnline]);

  const startNetMonitor = useCallback(() => {
    window.addEventListener('offline', onOffline);
    window.addEventListener('online', onOnline);
  }, [onOffline, onOnline]);

  const startExam = async () => {
    try {
      setStatus('Starting exam...');
      try {
        const me = await api.get('/auth/me');
        studentIdRef.current = me.data?.user?.email || 'anonymous';
      } catch {}

      await enterFullscreen();
      document.addEventListener('contextmenu', preventOps);
      document.addEventListener('copy', preventOps);
      document.addEventListener('paste', preventOps);
      document.addEventListener('cut', preventOps);
      document.addEventListener('keydown', preventOps);

      const onVis = async () => {
        if (document.hidden) { showWarning('⚠️ Tab switch detected!'); await postViolation('tab_switch'); }
      };
      const onBlur = async () => { showWarning('⚠️ Window focus lost!'); await postViolation('tab_switch'); };
      const onFs = async () => {
        if (!document.fullscreenElement) { showWarning('⚠️ Fullscreen exit!'); await postViolation('fullscreen_exit'); }
      };
      const onBeforeUnload = (e) => {
        cleanup(); // Attempt manual cleanup
        try { navigator.sendBeacon(`${BASE_API}/violation`, new Blob([JSON.stringify({ studentId: studentIdRef.current || 'anonymous', type: 'page_refresh', timestamp: Date.now() })], { type: 'application/json' })); } catch {}
        e.preventDefault();
        e.returnValue = ''; // Required for modern browsers
      };

      listenersRef.current = { onVis, onBlur, onFs, onBeforeUnload };
      document.addEventListener('visibilitychange', onVis);
      window.addEventListener('blur', onBlur);
      document.addEventListener('fullscreenchange', onFs);
      window.addEventListener('beforeunload', onBeforeUnload);

      setStatus('Starting camera...');
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 320, height: 240, frameRate: { max: 15 }, facingMode: 'user' }, 
        audio: false 
      });

      setStatus('Fetching questions...');
      setLoadingQuestions(true);
      setError('');
      const res = await api.get(`/exams/questions?examId=${examId}`);
      
      if (!res.data || !res.data.questions || res.data.questions.length === 0) {
        throw new Error('No questions found for this exam. Please check Question Bank.');
      }

      setQuestions(res.data.questions);
      setRemainingSec(res.data.durationSec || 600);
      setLoadingQuestions(false);

      const qIds = res.data.questions.map(q => q.id);
      await api.post('/exams/start', { examId, startedAt: new Date().toISOString(), questions: qIds });
      setStarted(true);
      setStatus('Exam started ✅');

      setTimeout(() => attachCamera(stream), 300);
      startMicMonitor();
      startNetMonitor();

      const socket = ioClient(import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000');
      socketRef.current = socket;
      socket.emit('identify', { role: 'student', studentId: studentIdRef.current });
      socket.emit('activity', { activity: 'exam_started', studentId: studentIdRef.current });

      const canvas2 = document.createElement('canvas');
      const ctx2 = canvas2.getContext('2d');
      frameTimerRef.current = setInterval(() => {
        const video = videoRef.current;
        if (!video || video.readyState < 2) return;
        canvas2.width = 320; canvas2.height = 240;
        ctx2.drawImage(video, 0, 0, 320, 240);
        socket.emit('frame', { imageBase64: canvas2.toDataURL('image/jpeg', 0.6), studentId: studentIdRef.current });
      }, 1000);

    } catch (e) {
      setLoadingQuestions(false);
      setError(e.response?.data?.error || e.message);
      setStatus('Error: ' + (e.response?.data?.error || e.message));
    }
  };

  const onTick = useCallback(() => { setRemainingSec(s => s - 1); }, []);

  const cleanup = useCallback(() => {
    stopCamera();
    exitFullscreen();
    if (frameTimerRef.current) { clearInterval(frameTimerRef.current); frameTimerRef.current = null; }
    if (renderLoopRef.current) { cancelAnimationFrame(renderLoopRef.current); renderLoopRef.current = null; }
    if (socketRef.current) { socketRef.current.disconnect(); socketRef.current = null; }
    const { onVis, onBlur, onFs, onBeforeUnload } = listenersRef.current;
    if (onVis) document.removeEventListener('visibilitychange', onVis);
    if (onBlur) window.removeEventListener('blur', onBlur);
    if (onFs) document.removeEventListener('fullscreenchange', onFs);
    if (onBeforeUnload) window.removeEventListener('beforeunload', onBeforeUnload);
    document.removeEventListener('contextmenu', preventOps);
    document.removeEventListener('copy', preventOps);
    document.removeEventListener('paste', preventOps);
    document.removeEventListener('cut', preventOps);
    document.removeEventListener('keydown', preventOps);
    stopMicMonitor();
    stopNetMonitor();
  }, [preventOps, stopNetMonitor]);

  const submitExam = useCallback(async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const res = await api.post('/exams/submit', { examId, answers });
      if (res.data.ok) {
        setExamResult(res.data);
      }
      setStatus(`✅ Score: ${res.data?.score}/${res.data?.total} | Cheat Score: ${res.data?.cheatingScore ?? 0}`);
    } catch { setStatus('Submit failed'); }
    finally {
      setStarted(false);
      setRemainingSec(0);
      cleanup();
      setSubmitting(false);
    }
  }, [answers, submitting, cleanup, examId]);

  useEffect(() => { loadModels(); }, []);

  useEffect(() => {
    return () => cleanup();
  }, [cleanup]);

  useEffect(() => {
    if (started && remainingSec <= 0) submitExam();
  }, [started, remainingSec, submitExam]);

  useEffect(() => {
    let t;
    const poll = async () => {
      try {
        const res = await api.get('/violations');
        setViolations(res.data || []);
      } catch {}
      t = setTimeout(poll, 5000);
    };
    if (started) poll();
    return () => { if (t) clearTimeout(t); };
  }, [started]);

  const faceColor = detectionStats.faces === 0 ? '#ef4444' : detectionStats.faces === 1 ? '#22c55e' : '#f59e0b';

  if (examResult) {
    return <ResultPage result={examResult} />;
  }

  return (
    <div style={{ padding: 16, fontFamily: 'Inter, system-ui, sans-serif' }}>

      <div style={{ background: 'linear-gradient(90deg, #dc2626, #ef4444)', color: '#fff', padding: '12px 16px', borderRadius: 10, marginBottom: 12, fontWeight: 600, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>🔴 AI Proctoring Active — All violations recorded</span>
        <span style={{ fontSize: 12, background: 'rgba(255,255,255,0.2)', padding: '4px 10px', borderRadius: 20 }}>{aiStatus}</span>
      </div>

      <div style={{ marginBottom: 8, color: '#475569', fontSize: 14, fontWeight: 500 }}>Status: {status}</div>

      {error && (
        <div style={{ background: '#fef2f2', color: '#dc2626', padding: '12px 16px', borderRadius: 8, marginBottom: 12, fontWeight: 600, border: '1px solid #fecaca' }}>
          ❌ Error: {error}
        </div>
      )}

      {warning && (
        <div style={{ background: '#fef3c7', color: '#92400e', padding: '10px 16px', border: '2px solid #f59e0b', borderRadius: 8, marginBottom: 12, fontWeight: 700, fontSize: 15 }}>
          ⚠️ {warning}
        </div>
      )}

      {loadingQuestions && (
        <div style={{ padding: '40px 0', textAlign: 'center' }}>
          <div style={{ fontSize: 24, marginBottom: 8 }}>⏳</div>
          <p style={{ color: '#64748b' }}>Loading questions, please wait...</p>
        </div>
      )}

      {!started && !loadingQuestions && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 0', gap: 16 }}>
          <div style={{ fontSize: 64 }}>📝</div>
          <h3 style={{ margin: 0, color: '#0f172a' }}>Ready to Start Exam?</h3>
          <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 10, padding: 16, maxWidth: 420, width: '100%' }}>
            <p style={{ margin: '0 0 8px', fontWeight: 700, color: '#166534' }}>🤖 AI Detection Active:</p>
            <p style={{ margin: '4px 0', color: '#374151', fontSize: 14 }}>✅ Face detection — no face = violation</p>
            <p style={{ margin: '4px 0', color: '#374151', fontSize: 14 }}>✅ Multiple faces — cheating attempt</p>
            <p style={{ margin: '4px 0', color: '#374151', fontSize: 14 }}>✅ Phone/book/laptop detection</p>
            <p style={{ margin: '4px 0', color: '#374151', fontSize: 14 }}>✅ Gaze tracking — looking away</p>
            <p style={{ margin: '4px 0', color: '#374151', fontSize: 14 }}>✅ Tab switch, fullscreen exit</p>
            <p style={{ margin: '4px 0', color: '#374151', fontSize: 14 }}>✅ Background speech detection</p>
          </div>
          <button onClick={startExam} style={{ background: 'linear-gradient(90deg, #1d4ed8, #2563eb)', color: '#fff', padding: '14px 40px', border: 'none', borderRadius: 10, fontWeight: 700, cursor: 'pointer', fontSize: 18, boxShadow: '0 4px 12px rgba(29,78,216,0.3)' }}>
            🚀 Start Exam
          </button>
        </div>
      )}

      {started && (
        <div style={{ display: 'grid', gridTemplateColumns: '65% 35%', gap: 16, alignItems: 'start' }}>

          {/* Questions Panel */}
          <div style={{ background: '#fff', padding: 20, borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ fontWeight: 700, color: '#0f172a', fontSize: 16 }}>Question {currentIndex + 1} of {questions.length}</div>
              <div style={{ color: '#ef4444', fontWeight: 800, fontSize: 18, background: '#fef2f2', padding: '6px 12px', borderRadius: 8 }}>
                ⏱ <Timer seconds={remainingSec} onTick={onTick} onEnd={submitExam} />
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 12, color: '#64748b' }}>Progress</span>
                <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>{Object.keys(answers).length}/{questions.length} answered</span>
              </div>
              <div style={{ background: '#e5e7eb', height: 8, borderRadius: 4 }}>
                <div style={{ width: `${Math.round((Object.keys(answers).length / (questions.length || 1)) * 100)}%`, height: '100%', background: 'linear-gradient(90deg, #1d4ed8, #2563eb)', borderRadius: 4, transition: 'width 0.3s' }} />
              </div>
            </div>

            <QuestionCard
              question={questions[currentIndex]}
              value={answers[questions[currentIndex]?.id]}
              onChange={(idx) => {
                const qid = questions[currentIndex]?.id;
                if (!qid) return;
                setAnswers(a => ({ ...a, [qid]: idx }));
              }}
            />

            <div style={{ marginTop: 16, display: 'flex', gap: 8, alignItems: 'center' }}>
              <button onClick={() => setCurrentIndex(i => Math.max(0, i - 1))} disabled={currentIndex === 0}
                style={{ padding: '8px 16px', background: '#e5e7eb', border: 'none', borderRadius: 8, cursor: currentIndex === 0 ? 'not-allowed' : 'pointer', fontWeight: 600, opacity: currentIndex === 0 ? 0.5 : 1 }}>
                ← Previous
              </button>
              <button onClick={() => setCurrentIndex(i => Math.min(questions.length - 1, i + 1))} disabled={currentIndex >= questions.length - 1}
                style={{ padding: '8px 16px', background: '#e5e7eb', border: 'none', borderRadius: 8, cursor: currentIndex >= questions.length - 1 ? 'not-allowed' : 'pointer', fontWeight: 600, opacity: currentIndex >= questions.length - 1 ? 0.5 : 1 }}>
                Next →
              </button>
              <div style={{ flex: 1 }} />
              <button onClick={submitExam}
                disabled={Object.keys(answers).length !== questions.length || submitting}
                style={{
                  padding: '10px 24px', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 15,
                  background: Object.keys(answers).length === questions.length ? 'linear-gradient(90deg, #16a34a, #22c55e)' : '#e5e7eb',
                  color: Object.keys(answers).length === questions.length ? '#fff' : '#94a3b8',
                  opacity: submitting ? 0.7 : 1,
                }}>
                {submitting ? '⏳ Submitting...' : '✅ Submit Exam'}
              </button>
            </div>

            <div style={{ marginTop: 12 }}>
              <NavPanel questions={questions} answers={answers} currentIndex={currentIndex} onJump={i => setCurrentIndex(i)} />
            </div>
          </div>

          {/* Right Panel */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

            {/* Camera + Detection Canvas */}
            <div style={{ background: '#0f172a', padding: 12, borderRadius: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ color: '#94a3b8', fontSize: 13, fontWeight: 600 }}>📹 AI Camera</span>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <span style={{ background: faceColor, color: '#fff', fontSize: 11, padding: '2px 8px', borderRadius: 20, fontWeight: 600 }}>
                    👤 {detectionStats.faces} face{detectionStats.faces !== 1 ? 's' : ''}
                  </span>
                  <span style={{ background: '#dc2626', color: '#fff', fontSize: 11, padding: '2px 8px', borderRadius: 20, fontWeight: 600 }}>● LIVE</span>
                </div>
              </div>

              {/* Hidden video + visible canvas with detection overlay */}
              <div style={{ position: 'relative' }}>
                <video ref={videoRef} autoPlay muted playsInline style={{ position: 'absolute', opacity: 0, width: 1, height: 1 }} />
                <canvas ref={canvasRef} style={{ width: '100%', height: '220px', borderRadius: 8, display: 'block', objectFit: 'cover', background: '#1e293b' }} />
              </div>

              {/* Detection Stats */}
              <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: detectionStats.faces === 1 ? '#dcfce7' : '#fef2f2', color: detectionStats.faces === 1 ? '#16a34a' : '#dc2626', fontWeight: 600 }}>
                  {detectionStats.faces === 1 ? '✅ Face OK' : detectionStats.faces === 0 ? '❌ No Face' : '⚠️ Multi Face'}
                </span>
                {detectionStats.objects.map(obj => (
                  <span key={obj} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: '#fef3c7', color: '#92400e', fontWeight: 600 }}>
                    ⚠️ {obj}
                  </span>
                ))}
              </div>
            </div>

            {/* Violations */}
            <div style={{ background: '#fff', padding: 12, borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
              <div style={{ fontWeight: 700, marginBottom: 8, color: '#0f172a', fontSize: 14 }}>⚠️ Recent Violations</div>
              {violations.length === 0 ? (
                <div style={{ color: '#16a34a', fontSize: 13, fontWeight: 600 }}>✅ No violations</div>
              ) : (
                <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                  {violations.slice(0, 6).map((v, i) => (
                    <li key={i} style={{ fontSize: 12, color: '#dc2626', padding: '4px 0', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between' }}>
                      <span>🚨 {v.type?.replace(/_/g, ' ')}</span>
                      <span style={{ color: '#94a3b8' }}>{new Date(v.timestamp).toLocaleTimeString()}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

          </div>
        </div>
      )}
    </div>
  );
}