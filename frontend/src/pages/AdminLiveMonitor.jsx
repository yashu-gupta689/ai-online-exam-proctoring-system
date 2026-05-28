import { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import api from '../services/api';

export default function AdminLiveMonitor() {
  const [students, setStudents] = useState({});
  const socketRef = useRef(null);

  useEffect(() => {
    // Initial fetch of active sessions if needed
    const fetchActive = async () => {
      try {
        const res = await api.get('/exams/list'); // Just to check connection
      } catch (err) {
        console.error('Monitor init error:', err);
      }
    };
    fetchActive();

    // Connect socket
    const socket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000');
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('identify', { role: 'admin' });
    });

    // Listen for student activity
    socket.on('student_activity', (data) => {
      // data: { studentId, activity, timestamp, violationCount }
      setStudents(prev => ({
        ...prev,
        [data.studentId]: {
          ...prev[data.studentId],
          ...data,
          lastSeen: Date.now()
        }
      }));
    });

    // Handle frame updates for live view if needed
    socket.on('student_frame', (data) => {
      setStudents(prev => ({
        ...prev,
        [data.studentId]: {
          ...prev[data.studentId],
          frame: data.imageBase64,
          lastSeen: Date.now()
        }
      }));
    });

    // Cleanup stale students every 30 seconds
    const interval = setInterval(() => {
      const now = Date.now();
      setStudents(prev => {
        const next = { ...prev };
        Object.keys(next).forEach(sid => {
          if (now - next[sid].lastSeen > 30000) {
            delete next[sid];
          }
        });
        return next;
      });
    }, 5000);

    return () => {
      socket.disconnect();
      clearInterval(interval);
    };
  }, []);

  const getStatusColor = (vCount = 0) => {
    if (vCount === 0) return '#22c55e'; // Green
    if (vCount < 5) return '#f59e0b'; // Yellow
    return '#ef4444'; // Red
  };

  const studentList = Object.values(students);

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ margin: 0, color: '#0f172a' }}>🔴 Live Proctoring Monitor</h1>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <span style={{ fontSize: '14px', color: '#64748b' }}>Active Students: <strong>{studentList.length}</strong></span>
          <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ef4444', animation: 'pulse 2s infinite' }}></div>
        </div>
      </div>

      {studentList.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '100px', background: '#fff', borderRadius: '20px', border: '2px dashed #e2e8f0', color: '#94a3b8' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📡</div>
          <div style={{ fontSize: '18px', fontWeight: '600' }}>Waiting for students to start exams...</div>
          <div style={{ fontSize: '14px' }}>Live updates will appear here automatically.</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
          {studentList.map((student) => (
            <div key={student.studentId} style={{ 
              background: '#fff', 
              borderRadius: '16px', 
              overflow: 'hidden', 
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              border: `2px solid ${getStatusColor(student.violationCount)}`,
              transition: 'transform 0.2s'
            }}>
              {/* Live Preview or Avatar */}
              <div style={{ height: '180px', background: '#0f172a', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {student.frame ? (
                  <img src={student.frame} alt="Live" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ color: '#475569', fontSize: '40px' }}>👤</div>
                )}
                <div style={{ 
                  position: 'absolute', 
                  top: '12px', 
                  right: '12px', 
                  background: 'rgba(0,0,0,0.6)', 
                  color: '#fff', 
                  fontSize: '10px', 
                  padding: '4px 8px', 
                  borderRadius: '4px',
                  backdropFilter: 'blur(4px)'
                }}>
                  LIVE
                </div>
              </div>

              {/* Student Details */}
              <div style={{ padding: '16px' }}>
                <div style={{ fontWeight: '700', color: '#1e293b', marginBottom: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {student.studentId}
                </div>
                <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '12px' }}>
                  Status: <span style={{ color: '#2563eb', fontWeight: '600' }}>{student.activity?.replace(/_/g, ' ') || 'Active'}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '10px', borderRadius: '8px' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase' }}>Violations</div>
                    <div style={{ fontSize: '18px', fontWeight: '800', color: getStatusColor(student.violationCount) }}>
                      {student.violationCount || 0}
                    </div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase' }}>Last Seen</div>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: '#1e293b' }}>
                      {new Date(student.lastSeen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.2); }
          100% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
