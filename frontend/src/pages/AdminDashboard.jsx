import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api.js';

export default function AdminDashboard() {
  const [active, setActive] = useState('dashboard');
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');
    if (!token || role !== 'admin') { navigate('/login'); return; }
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    try {
      const res = await api.get('/admin/metrics');
      setMetrics(res.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    navigate('/login');
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'students', label: 'Students', icon: '👥' },
    { id: 'questions', label: 'Question Bank', icon: '❓' },
    { id: 'violations', label: 'Violations', icon: '⚠️' },
    { id: 'results', label: 'Results', icon: '📈' },
  ];

  const stats = [
    { label: 'Total Students', value: metrics?.totalStudents ?? 0, icon: '👥', color: '#1d4ed8' },
    { label: 'Active Exams', value: metrics?.activeExams ?? 0, icon: '📝', color: '#16a34a' },
    { label: 'Violations Today', value: metrics?.suspiciousActivities ?? 0, icon: '⚠️', color: '#dc2626' },
    { label: 'Completed Exams', value: metrics?.completedExams ?? 0, icon: '📈', color: '#ea580c' },
  ];

  return (
    <div style={{ display: 'flex', minHeight: '90vh', background: '#f1f5f9' }}>
      <div style={{ width: 240, background: '#0f172a', display: 'flex', flexDirection: 'column', position: 'fixed', height: '100vh' }}>
        <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid #1e293b' }}>
          <div style={{ color: '#fff', fontWeight: 700, fontSize: 15 }}>🛡️ Admin Panel</div>
          <div style={{ color: '#64748b', fontSize: 12, marginTop: 4 }}>AI Exam Proctoring</div>
        </div>
        {navItems.map(item => (
          <button key={item.id} onClick={() => setActive(item.id)} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '13px 20px', border: 'none', cursor: 'pointer',
            background: active === item.id ? '#1d4ed8' : 'transparent',
            color: active === item.id ? '#fff' : '#94a3b8',
            fontSize: 14, fontWeight: 500, textAlign: 'left',
            borderLeft: active === item.id ? '3px solid #60a5fa' : '3px solid transparent',
          }}>
            <span style={{ fontSize: 18 }}>{item.icon}</span>{item.label}
          </button>
        ))}
        <div style={{ marginTop: 'auto', padding: 20, borderTop: '1px solid #1e293b' }}>
          <button onClick={handleLogout} style={{ width: '100%', padding: 10, background: '#ef4444', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>
            🚪 Logout
          </button>
        </div>
      </div>

      <div style={{ flex: 1, marginLeft: 240, display: 'flex', flexDirection: 'column' }}>
        <div style={{ background: '#fff', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', position: 'sticky', top: 0, zIndex: 10 }}>
          <h2 style={{ margin: 0, fontSize: 20, color: '#0f172a' }}>Welcome, Admin 👋</h2>
          <button onClick={fetchMetrics} style={{ padding: '8px 16px', background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>🔄 Refresh</button>
        </div>
        <div style={{ padding: 24 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
            {stats.map(stat => (
              <div key={stat.label} style={{ background: '#fff', borderRadius: 12, padding: 20, borderLeft: `4px solid ${stat.color}`, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                <div style={{ fontSize: 28 }}>{stat.icon}</div>
                <div style={{ fontSize: 32, fontWeight: 700, color: '#0f172a', margin: '8px 0 4px' }}>{loading ? '...' : stat.value}</div>
                <div style={{ fontSize: 13, color: '#64748b' }}>{stat.label}</div>
              </div>
            ))}
          </div>
          <div style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
            {active === 'dashboard' && <DashboardTab metrics={metrics} loading={loading} />}
            {active === 'students' && <StudentsTab metrics={metrics} loading={loading} />}
            {active === 'questions' && <QuestionBankTab />}
            {active === 'violations' && <ViolationsTab />}
            {active === 'results' && <ResultsTab />}
          </div>
        </div>
      </div>
    </div>
  );
}

function DashboardTab({ metrics, loading }) {
  return (
    <div>
      <h3 style={{ margin: '0 0 20px', color: '#0f172a' }}>📊 Overview</h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div style={{ background: '#f8fafc', borderRadius: 10, padding: 20 }}>
          <h4 style={{ margin: '0 0 12px', color: '#374151' }}>📈 Statistics</h4>
          {[
            { label: 'Total Students', value: metrics?.totalStudents ?? 0, color: '#1d4ed8' },
            { label: 'Active Exams', value: metrics?.activeExams ?? 0, color: '#16a34a' },
            { label: 'Completed Exams', value: metrics?.completedExams ?? 0, color: '#ea580c' },
            { label: 'Total Violations', value: metrics?.suspiciousActivities ?? 0, color: '#dc2626' },
          ].map(item => (
            <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#fff', borderRadius: 8, borderLeft: `3px solid ${item.color}`, marginBottom: 8 }}>
              <span style={{ color: '#64748b', fontSize: 14 }}>{item.label}</span>
              <span style={{ fontWeight: 700, color: item.color, fontSize: 18 }}>{loading ? '...' : item.value}</span>
            </div>
          ))}
        </div>
        <div style={{ background: '#f8fafc', borderRadius: 10, padding: 20 }}>
          <h4 style={{ margin: '0 0 12px', color: '#374151' }}>🎯 System Status</h4>
          {[
            { label: '✅ AI Face Detection', status: 'Active' },
            { label: '✅ Violation Tracking', status: 'Active' },
            { label: '✅ Question Bank', status: 'Active' },
            { label: '✅ Result System', status: 'Active' },
          ].map(item => (
            <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#fff', borderRadius: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 14 }}>{item.label}</span>
              <span style={{ fontSize: 12, padding: '2px 8px', background: '#dcfce7', color: '#16a34a', borderRadius: 20, fontWeight: 600 }}>Active</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StudentsTab({ metrics, loading }) {
  const [search, setSearch] = useState('');
  const filtered = (metrics?.students || []).filter(s =>
    s.name?.toLowerCase().includes(search.toLowerCase()) ||
    s.studentId?.toLowerCase().includes(search.toLowerCase())
  );
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ margin: 0, color: '#0f172a' }}>👥 Students List</h3>
        <input placeholder="🔍 Search..." value={search} onChange={e => setSearch(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, width: 250 }} />
      </div>
      {loading ? <p>Loading...</p> : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8fafc' }}>
              {['#', 'Name', 'Email', 'Status', 'Violations', 'Cheat Score', 'Risk'].map(h => <th key={h} style={th}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && <tr><td colSpan={7} style={{ textAlign: 'center', padding: 30, color: '#94a3b8' }}>No students found</td></tr>}
            {filtered.map((s, i) => {
              const risk = s.cheatingScore > 20 ? 'High' : s.cheatingScore > 10 ? 'Medium' : 'Low';
              const rc = { High: '#dc2626', Medium: '#ea580c', Low: '#16a34a' };
              return (
                <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={td}>{i + 1}</td>
                  <td style={{ ...td, fontWeight: 600 }}>{s.name}</td>
                  <td style={td}>{s.studentId}</td>
                  <td style={td}><span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: s.status === 'active' ? '#dcfce7' : '#f1f5f9', color: s.status === 'active' ? '#16a34a' : '#64748b' }}>{s.status || 'none'}</span></td>
                  <td style={td}>{s.violations}</td>
                  <td style={{ ...td, fontWeight: 700, color: rc[risk] }}>{s.cheatingScore}</td>
                  <td style={td}><span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: rc[risk] + '20', color: rc[risk] }}>{risk}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

function QuestionBankTab() {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ text: '', options: ['', '', '', ''], correctIndex: 0, category: 'General', difficulty: 'Medium' });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [examConfig, setExamConfig] = useState({ title: 'Final Exam', subject: 'General Knowledge', durationSec: 600, totalQuestions: 10, category: 'All', passingScore: 50 });
  const [aiForm, setAiForm] = useState({ topic: '', content: '', count: 5, difficulty: 'Medium', category: 'General' });
  const [aiLoading, setAiLoading] = useState(false);
  const [aiMsg, setAiMsg] = useState('');
  const [showAiForm, setShowAiForm] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);

  const categories = ['General', 'Mathematics', 'Science', 'Computer Science', 'English', 'History'];
  const difficulties = ['Easy', 'Medium', 'Hard'];

  useEffect(() => { fetchQuestions(); fetchConfig(); }, []);

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/questions');
      setQuestions(res.data);
    } catch { setQuestions([]); }
    finally { setLoading(false); }
  };

  const fetchConfig = async () => {
    try {
      const res = await api.get('/admin/exam-config');
      if (res.data) setExamConfig(res.data);
    } catch {}
  };

  const handleSave = async () => {
    if (!form.text || form.options.some(o => !o)) { setMsg('Please fill all fields!'); return; }
    setSaving(true);
    try {
      await api.post('/admin/questions', form);
      setMsg('Question saved!');
      setShowForm(false);
      setForm({ text: '', options: ['', '', '', ''], correctIndex: 0, category: 'General', difficulty: 'Medium' });
      fetchQuestions();
    } catch { setMsg('Failed to save'); }
    finally { setSaving(false); setTimeout(() => setMsg(''), 3000); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this question?')) return;
    try {
      await api.delete('/admin/questions/' + id);
      setMsg('Deleted!');
      fetchQuestions();
    } catch { setMsg('Delete failed'); }
    setTimeout(() => setMsg(''), 3000);
  };

  const handleSaveConfig = async () => {
    setSavingConfig(true);
    try {
      await api.post('/admin/exam-config', examConfig);
      setMsg('Exam settings saved!');
    } catch { setMsg('Save failed'); }
    finally { setSavingConfig(false); setTimeout(() => setMsg(''), 3000); }
  };

  const handleAiGenerate = async () => {
    if (!aiForm.topic) { setAiMsg('Topic daalo!'); return; }
    setAiLoading(true);
    setAiMsg('✨ AI is generating questions... Please wait.');
    console.log('Starting AI Question Generation for:', aiForm.topic);
    try {
      const res = await api.post('/ai/generate-questions', {
        topic: aiForm.topic,
        content: aiForm.content,
        count: aiForm.count,
        difficulty: aiForm.difficulty,
        category: aiForm.category,
      });
      console.log('AI Response:', res.data);
      const qs = res.data.questions;
      if (!qs || !qs.length) throw new Error('No questions generated by AI');
      
      // Save all at once using the bulk insert route
      console.log('Saving generated questions to DB...');
      const saveRes = await api.post('/admin/questions', { questions: qs });
      console.log('Save result:', saveRes.data);
      
      setAiMsg(qs.length + ' questions generated and saved successfully!');
      setShowAiForm(false);
      fetchQuestions();
    } catch (e) {
      console.error('AI Generation/Save Error:', e);
      setAiMsg('❌ Error: ' + (e.response?.data?.error || e.message));
    } finally {
      setAiLoading(false);
      setTimeout(() => setAiMsg(''), 5000);
    }
  };

  return (
    <div>
      {msg && <div style={{ padding: '10px 16px', borderRadius: 8, background: msg.includes('saved') || msg.includes('Deleted') ? '#f0fdf4' : '#fef2f2', color: msg.includes('saved') || msg.includes('Deleted') ? '#16a34a' : '#dc2626', marginBottom: 16, fontWeight: 600 }}>{msg}</div>}

      <div style={{ background: '#f0f9ff', borderRadius: 12, padding: 20, marginBottom: 24, border: '1px solid #bae6fd' }}>
        <h4 style={{ margin: '0 0 16px', color: '#0369a1' }}>⚙️ Exam Settings</h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 16 }}>
          <div>
            <label style={lbl}>Exam Title</label>
            <input value={examConfig.title} onChange={e => setExamConfig({ ...examConfig, title: e.target.value })} style={inp} placeholder="e.g. Final Exam" />
          </div>
          <div>
            <label style={lbl}>Subject</label>
            <input value={examConfig.subject} onChange={e => setExamConfig({ ...examConfig, subject: e.target.value })} style={inp} placeholder="e.g. Mathematics" />
          </div>
          <div>
            <label style={lbl}>Duration (seconds)</label>
            <input type="number" value={examConfig.durationSec} onChange={e => setExamConfig({ ...examConfig, durationSec: Number(e.target.value) })} style={inp} />
            <span style={{ fontSize: 11, color: '#64748b' }}>= {Math.floor(examConfig.durationSec / 60)} min {examConfig.durationSec % 60} sec</span>
          </div>
          <div>
            <label style={lbl}>Total Questions</label>
            <input type="number" value={examConfig.totalQuestions} onChange={e => setExamConfig({ ...examConfig, totalQuestions: Number(e.target.value) })} style={inp} />
          </div>
          <div>
            <label style={lbl}>Category Filter</label>
            <select value={examConfig.category} onChange={e => setExamConfig({ ...examConfig, category: e.target.value })} style={inp}>
              <option value="All">All Categories</option>
              {categories.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label style={lbl}>Passing Score (%)</label>
            <input type="number" value={examConfig.passingScore} onChange={e => setExamConfig({ ...examConfig, passingScore: Number(e.target.value) })} style={inp} />
          </div>
        </div>
        <button onClick={handleSaveConfig} disabled={savingConfig} style={{ padding: '10px 24px', background: '#0369a1', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>
          {savingConfig ? 'Saving...' : '💾 Save Exam Settings'}
        </button>
      </div>

      <div style={{ background: 'linear-gradient(135deg, #1e1b4b, #312e81)', borderRadius: 12, padding: 20, marginBottom: 24, border: '1px solid #4338ca' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: showAiForm ? 16 : 0 }}>
          <div>
            <h4 style={{ margin: 0, color: '#fff', fontSize: 16 }}>🤖 AI Question Generator</h4>
            <p style={{ margin: '4px 0 0', color: '#a5b4fc', fontSize: 13 }}>Topic ya content do — AI automatically questions banayega</p>
          </div>
          <button onClick={() => setShowAiForm(!showAiForm)} style={{ padding: '8px 16px', background: showAiForm ? '#4338ca' : 'linear-gradient(90deg, #7c3aed, #4338ca)', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>
            {showAiForm ? '✕ Close' : '✨ Generate with AI'}
          </button>
        </div>
        {showAiForm && (
          <div style={{ marginTop: 16 }}>
            {aiMsg && (
              <div style={{ padding: '10px 16px', borderRadius: 8, background: aiMsg.includes('saved') ? '#14532d' : '#450a0a', color: aiMsg.includes('saved') ? '#86efac' : '#fca5a5', marginBottom: 16, fontWeight: 600 }}>
                {aiMsg}
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ ...lbl, color: '#a5b4fc' }}>Topic Name *</label>
                <input value={aiForm.topic} onChange={e => setAiForm({ ...aiForm, topic: e.target.value })} placeholder="e.g. React Hooks, World War 2, Photosynthesis..." style={{ ...inp, background: '#1e1b4b', border: '1px solid #4338ca', color: '#fff' }} />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ ...lbl, color: '#a5b4fc' }}>Topic Content (optional)</label>
                <textarea value={aiForm.content} onChange={e => setAiForm({ ...aiForm, content: e.target.value })} placeholder="Paste notes ya content yahan..." rows={4} style={{ ...inp, background: '#1e1b4b', border: '1px solid #4338ca', color: '#fff', resize: 'vertical' }} />
              </div>
              <div>
                <label style={{ ...lbl, color: '#a5b4fc' }}>Questions Count</label>
                <select value={aiForm.count} onChange={e => setAiForm({ ...aiForm, count: Number(e.target.value) })} style={{ ...inp, background: '#1e1b4b', border: '1px solid #4338ca', color: '#fff' }}>
                  {[3, 5, 10, 15, 20].map(n => <option key={n} value={n}>{n} Questions</option>)}
                </select>
              </div>
              <div>
                <label style={{ ...lbl, color: '#a5b4fc' }}>Difficulty</label>
                <select value={aiForm.difficulty} onChange={e => setAiForm({ ...aiForm, difficulty: e.target.value })} style={{ ...inp, background: '#1e1b4b', border: '1px solid #4338ca', color: '#fff' }}>
                  {['Easy', 'Medium', 'Hard'].map(d => <option key={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label style={{ ...lbl, color: '#a5b4fc' }}>Category</label>
                <select value={aiForm.category} onChange={e => setAiForm({ ...aiForm, category: e.target.value })} style={{ ...inp, background: '#1e1b4b', border: '1px solid #4338ca', color: '#fff' }}>
                  {categories.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <button onClick={handleAiGenerate} disabled={aiLoading} style={{ width: '100%', padding: '14px', background: aiLoading ? '#312e81' : 'linear-gradient(90deg, #7c3aed, #2563eb)', color: '#fff', border: 'none', borderRadius: 10, cursor: aiLoading ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: 16 }}>
              {aiLoading ? '⏳ AI generating questions...' : '🚀 Generate Questions'}
            </button>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ margin: 0, color: '#0f172a' }}>❓ Question Bank ({questions.length} questions)</h3>
        <button onClick={() => setShowForm(!showForm)} style={{ padding: '10px 20px', background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>
          {showForm ? '✕ Cancel' : '➕ Add Question'}
        </button>
      </div>

      {showForm && (
        <div style={{ background: '#f8fafc', borderRadius: 12, padding: 24, marginBottom: 24, border: '1px solid #e2e8f0' }}>
          <h4 style={{ margin: '0 0 16px' }}>➕ New Question</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div>
              <label style={lbl}>Category</label>
              <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} style={inp}>
                {categories.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>Difficulty</label>
              <select value={form.difficulty} onChange={e => setForm({ ...form, difficulty: e.target.value })} style={inp}>
                {difficulties.map(d => <option key={d}>{d}</option>)}
              </select>
            </div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={lbl}>Question Text</label>
            <textarea value={form.text} onChange={e => setForm({ ...form, text: e.target.value })} placeholder="Enter your question here..." rows={3} style={{ ...inp, resize: 'vertical' }} />
          </div>
          <label style={lbl}>Options (select correct answer)</label>
          {form.options.map((opt, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 8 }}>
              <input type="radio" name="correct" checked={form.correctIndex === i} onChange={() => setForm({ ...form, correctIndex: i })} style={{ width: 18, height: 18, accentColor: '#16a34a' }} />
              <input type="text" value={opt} onChange={e => { const opts = [...form.options]; opts[i] = e.target.value; setForm({ ...form, options: opts }); }} placeholder={"Option " + (i+1) + (form.correctIndex === i ? ' - Correct' : '')} style={{ ...inp, flex: 1, border: form.correctIndex === i ? '2px solid #16a34a' : '1px solid #e2e8f0' }} />
            </div>
          ))}
          <button onClick={handleSave} disabled={saving} style={{ marginTop: 12, padding: '12px 24px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 15 }}>
            {saving ? 'Saving...' : '💾 Save Question'}
          </button>
        </div>
      )}

      {loading ? <p>Loading...</p> : questions.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>
          <div style={{ fontSize: 48 }}>❓</div>
          <p>No questions yet. Add using the form above!</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {questions.map((q, i) => (
            <div key={q._id} style={{ background: '#f8fafc', borderRadius: 10, padding: 16, border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                    <span style={{ fontSize: 12, padding: '2px 8px', background: '#dbeafe', color: '#1d4ed8', borderRadius: 20, fontWeight: 600 }}>{q.category}</span>
                    <span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 20, fontWeight: 600, background: q.difficulty === 'Easy' ? '#dcfce7' : q.difficulty === 'Hard' ? '#fef2f2' : '#fef3c7', color: q.difficulty === 'Easy' ? '#16a34a' : q.difficulty === 'Hard' ? '#dc2626' : '#92400e' }}>{q.difficulty}</span>
                    <span style={{ fontSize: 12, color: '#94a3b8' }}>#{i + 1}</span>
                  </div>
                  <p style={{ margin: '0 0 10px', fontWeight: 600, color: '#0f172a', fontSize: 15 }}>{q.text}</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                    {q.options.map((opt, j) => (
                      <div key={j} style={{ fontSize: 13, padding: '6px 10px', borderRadius: 6, background: j === q.correctIndex ? '#dcfce7' : '#fff', color: j === q.correctIndex ? '#16a34a' : '#374151', border: "1px solid " + (j === q.correctIndex ? '#86efac' : '#e2e8f0'), fontWeight: j === q.correctIndex ? 700 : 400 }}>
                        {j === q.correctIndex ? '✅ ' : ['A','B','C','D'][j] + '. '}{opt}
                      </div>
                    ))}
                  </div>
                </div>
                <button onClick={() => handleDelete(q._id)} style={{ marginLeft: 12, padding: '6px 12px', background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>🗑️</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ViolationsTab() {
  const [violations, setViolations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [selectedImg, setSelectedImg] = useState(null);

  useEffect(() => {
    api.get('/admin/violations').then(res => setViolations(res.data)).catch(console.error).finally(() => setLoading(false));
  }, []);

  const sevMap = { phone_detected: 'High', multiple_faces: 'High', face_absent: 'Medium', tab_switch: 'Medium', background_speech: 'Low', gaze_left: 'Low', gaze_right: 'Low' };
  const sevColor = { High: '#dc2626', Medium: '#ea580c', Low: '#16a34a' };
  const filtered = filter === 'all' ? violations : violations.filter(v => (sevMap[v.type] || 'Low') === filter);

  const BASE_URL = import.meta.env.VITE_BACKEND_URL?.replace('/api', '') || 'http://localhost:5000';

  if (loading) return <p>Loading...</p>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ margin: 0, color: '#0f172a' }}>⚠️ Violations Report</h3>
        <div style={{ display: 'flex', gap: 8 }}>
          {['all', 'High', 'Medium', 'Low'].map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{ padding: '6px 14px', border: 'none', borderRadius: 20, cursor: 'pointer', fontWeight: 600, fontSize: 13, background: filter === f ? '#0f172a' : '#f1f5f9', color: filter === f ? '#fff' : '#64748b' }}>
              {f === 'all' ? 'All' : f}
            </button>
          ))}
        </div>
      </div>
      
      {selectedImg && (
        <div onClick={() => setSelectedImg(null)} style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
          <div style={{ position: 'relative', maxWidth: '90%', maxHeight: '90%' }}>
            <img src={BASE_URL + selectedImg} alt="Evidence" style={{ width: '100%', borderRadius: 8, boxShadow: '0 0 30px rgba(0,0,0,0.5)' }} />
            <button style={{ position: 'absolute', top: -40, right: 0, background: '#fff', border: 'none', borderRadius: 20, width: 30, height: 30, cursor: 'pointer', fontWeight: 700 }}>✕</button>
          </div>
        </div>
      )}

      {filtered.length === 0 ? <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>✅ No violations found</div> : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8fafc' }}>
              {['#', 'Student', 'Type', 'Time', 'Severity', 'Evidence'].map(h => <th key={h} style={th}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {filtered.map((v, i) => {
              const sev = sevMap[v.type] || 'Low';
              return (
                <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={td}>{i + 1}</td>
                  <td style={{ ...td, fontWeight: 600 }}>{v.studentId}</td>
                  <td style={td}>{v.type?.replace(/_/g, ' ')}</td>
                  <td style={td}>{new Date(v.timestamp).toLocaleString()}</td>
                  <td style={td}><span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: sevColor[sev] + '20', color: sevColor[sev] }}>{sev}</span></td>
                  <td style={td}>
                    {v.screenshotPath ? (
                      <button onClick={() => setSelectedImg(v.screenshotPath)} style={{ padding: '4px 8px', background: '#f0f9ff', color: '#0369a1', border: '1px solid #bae6fd', borderRadius: 6, fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>🖼️ View</button>
                    ) : <span style={{ color: '#94a3b8', fontSize: 12 }}>No image</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

function ResultsTab() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    api.get('/results').then(res => setResults(res.data)).catch(console.error).finally(() => setLoading(false));
  }, []);

  const filtered = results.filter(r => r.studentId?.toLowerCase().includes(search.toLowerCase()));
  if (loading) return <p>Loading...</p>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <h3 style={{ margin: 0 }}>📈 Results</h3>
        <input placeholder="🔍 Search student..." value={search} onChange={e => setSearch(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, width: 250 }} />
      </div>
      {filtered.length === 0 ? <p style={{ color: '#94a3b8', textAlign: 'center', padding: 30 }}>No results yet</p> : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8fafc' }}>
              {['#', 'Student', 'Score', '%', 'Grade', 'Status', 'Date'].map(h => <th key={h} style={th}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {filtered.map((r, i) => {
              const pct = r.total ? Math.round((r.score / r.total) * 100) : 0;
              const grade = pct >= 90 ? 'A' : pct >= 75 ? 'B' : pct >= 60 ? 'C' : pct >= 50 ? 'D' : 'F';
              const gc = { A: '#16a34a', B: '#1d4ed8', C: '#ca8a04', D: '#ea580c', F: '#dc2626' };
              return (
                <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={td}>{i + 1}</td>
                  <td style={{ ...td, fontWeight: 600 }}>{r.studentId}</td>
                  <td style={td}>{r.score}/{r.total}</td>
                  <td style={td}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ background: '#e5e7eb', height: 6, borderRadius: 3, width: 60 }}>
                        <div style={{ width: pct + '%', height: '100%', background: gc[grade], borderRadius: 3 }} />
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 600 }}>{pct}%</span>
                    </div>
                  </td>
                  <td style={td}><span style={{ fontWeight: 700, color: gc[grade], fontSize: 16 }}>{grade}</span></td>
                  <td style={td}><span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: pct >= 50 ? '#dcfce7' : '#fef2f2', color: pct >= 50 ? '#16a34a' : '#dc2626' }}>{pct >= 50 ? '✅ Pass' : '❌ Fail'}</span></td>
                  <td style={{ ...td, fontSize: 12, color: '#94a3b8' }}>{r.endedAt ? new Date(r.endedAt).toLocaleString() : '-'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

const th = { padding: '10px 12px', textAlign: 'left', fontSize: 13, fontWeight: 600, color: '#374151', borderBottom: '1px solid #e2e8f0' };
const td = { padding: '10px 12px', fontSize: 14, color: '#374151' };
const lbl = { display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 };
const inp = { width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, outline: 'none', boxSizing: 'border-box' };

 