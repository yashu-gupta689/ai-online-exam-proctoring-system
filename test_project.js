/**
 * ============================================
 *  AI ONLINE EXAM PROCTORING SYSTEM
 *  AUTOMATIC PROJECT TESTER
 *  Run: node test_project.js
 * ============================================
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

// ─── CONFIG ───────────────────────────────────
const BASE_URL = 'http://localhost:4000';
const RESULTS = [];
let passed = 0;
let failed = 0;
let warned = 0;

// ─── COLORS FOR TERMINAL ──────────────────────
const GREEN  = '\x1b[32m';
const RED    = '\x1b[31m';
const YELLOW = '\x1b[33m';
const BLUE   = '\x1b[34m';
const CYAN   = '\x1b[36m';
const RESET  = '\x1b[0m';
const BOLD   = '\x1b[1m';

// ─── HELPER FUNCTIONS ─────────────────────────
function log(symbol, color, label, message) {
  console.log(`${color}${BOLD}${symbol}${RESET} ${color}[${label}]${RESET} ${message}`);
}

function pass(label, message) {
  passed++;
  log('✅', GREEN, 'PASS', `${label}: ${message}`);
  RESULTS.push({ status: 'PASS', label, message });
}

function fail(label, message) {
  failed++;
  log('❌', RED, 'FAIL', `${label}: ${message}`);
  RESULTS.push({ status: 'FAIL', label, message });
}

function warn(label, message) {
  warned++;
  log('⚠️ ', YELLOW, 'WARN', `${label}: ${message}`);
  RESULTS.push({ status: 'WARN', label, message });
}

function info(message) {
  console.log(`${CYAN}ℹ️  ${message}${RESET}`);
}

function section(title) {
  console.log(`\n${BLUE}${BOLD}${'═'.repeat(50)}${RESET}`);
  console.log(`${BLUE}${BOLD}  ${title}${RESET}`);
  console.log(`${BLUE}${BOLD}${'═'.repeat(50)}${RESET}`);
}

// ─── HTTP REQUEST HELPER ──────────────────────
function makeRequest(options, body = null) {
  return new Promise((resolve) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data), raw: data });
        } catch {
          resolve({ status: res.statusCode, body: null, raw: data });
        }
      });
    });
    req.on('error', (err) => {
      resolve({ status: 0, body: null, error: err.message });
    });
    req.setTimeout(5000, () => {
      req.destroy();
      resolve({ status: 0, body: null, error: 'Timeout - server not responding' });
    });
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

function get(endpoint) {
  const url = new URL(BASE_URL + endpoint);
  return makeRequest({ hostname: url.hostname, port: url.port, path: url.pathname, method: 'GET', headers: { 'Content-Type': 'application/json' } });
}

function post(endpoint, body, token = null) {
  const url = new URL(BASE_URL + endpoint);
  const bodyStr = JSON.stringify(body);
  const headers = { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(bodyStr) };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return makeRequest({ hostname: url.hostname, port: url.port, path: url.pathname, method: 'POST', headers }, bodyStr);
}

function getAuth(endpoint, token) {
  const url = new URL(BASE_URL + endpoint);
  return makeRequest({ hostname: url.hostname, port: url.port, path: url.pathname, method: 'GET', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` } });
}

// ─── TEST STORAGE ─────────────────────────────
let studentToken = null;
let adminToken   = null;
const testEmail  = `test_${Date.now()}@testmail.com`;
const testPass   = 'Test@12345';
const adminEmail = 'admin@test.com';
const adminPass  = 'Admin@12345';

// ══════════════════════════════════════════════
//  TEST 1: FILE STRUCTURE CHECK
// ══════════════════════════════════════════════
function testFileStructure() {
  section('TEST 1: Project File Structure');

  const requiredFiles = [
    // Backend
    'backend/src/server.js',
    'backend/src/config/db.js',
    'backend/src/middleware/auth.js',
    'backend/src/models/User.js',
    'backend/src/models/ExamConfig.js',
    'backend/src/models/ExamSession.js',
    'backend/src/models/Violation.js',
    'backend/src/models/Question.js',
    'backend/src/routes/auth.js',
    'backend/src/routes/exams.js',
    'backend/src/routes/violations.js',
    'backend/src/routes/results.js',
    'backend/src/routes/admin.js',
    'backend/src/routes/ai.js',
    'backend/package.json',
    'backend/.env',
    // Frontend
    'frontend/src/App.jsx',
    'frontend/src/main.jsx',
    'frontend/src/services/api.js',
    'frontend/src/components/Login.jsx',
    'frontend/src/components/Signup.jsx',
    'frontend/src/pages/StudentDashboard.jsx',
    'frontend/src/pages/AdminDashboard.jsx',
    'frontend/src/pages/ExamList.jsx',
    'frontend/src/pages/Results.jsx',
    'frontend/package.json',
    // AI Module
    'ai-module/detector.py',
    'ai-module/main.py',
    'ai-module/liveness_check.py',
    'ai-module/verify_face.py',
    'ai-module/requirements.txt',
    'ai-detection/webcam_monitor.py',
    'ai-detection/requirements.txt',
  ];

  requiredFiles.forEach(file => {
    if (fs.existsSync(file)) {
      pass('File exists', file);
    } else {
      fail('File missing', file);
    }
  });
}

// ══════════════════════════════════════════════
//  TEST 2: ENV FILE CHECK
// ══════════════════════════════════════════════
function testEnvFile() {
  section('TEST 2: Environment Variables (.env)');

  const envPath = 'backend/.env';
  if (!fs.existsSync(envPath)) {
    fail('.env file', 'backend/.env NOT FOUND!');
    return;
  }

  const envContent = fs.readFileSync(envPath, 'utf8');
  const requiredVars = ['MONGODB_URI', 'JWT_SECRET', 'PORT'];
  const optionalVars = ['GROQ_API_KEY', 'EMAIL_USER', 'EMAIL_PASS'];

  requiredVars.forEach(v => {
    if (envContent.includes(v + '=') && !envContent.includes(v + '=\n') && !envContent.includes(v + '=\r')) {
      pass('.env variable', `${v} is set`);
    } else {
      fail('.env variable', `${v} is MISSING or EMPTY`);
    }
  });

  optionalVars.forEach(v => {
    if (envContent.includes(v)) {
      pass('.env optional', `${v} is present`);
    } else {
      warn('.env optional', `${v} not found (needed for some features)`);
    }
  });

  // Check PORT value
  const portMatch = envContent.match(/PORT=(\d+)/);
  if (portMatch) {
    const port = portMatch[1];
    if (port === '4000') {
      pass('PORT config', `PORT=${port} ✓ Correct`);
    } else {
      warn('PORT config', `PORT=${port} — Frontend expects 4000`);
    }
  }
}

// ══════════════════════════════════════════════
//  TEST 3: PACKAGE.JSON CHECK
// ══════════════════════════════════════════════
function testPackageJson() {
  section('TEST 3: Package.json Dependencies');

  // Backend
  if (fs.existsSync('backend/package.json')) {
    const pkg = JSON.parse(fs.readFileSync('backend/package.json', 'utf8'));
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    const required = ['express', 'mongoose', 'jsonwebtoken', 'bcrypt', 'socket.io', 'cors', 'dotenv'];
    const optional = ['nodemailer', 'morgan', 'multer'];

    required.forEach(dep => {
      if (deps[dep]) pass('Backend dep', `${dep} found`);
      else fail('Backend dep', `${dep} MISSING from package.json`);
    });

    optional.forEach(dep => {
      if (deps[dep]) pass('Backend optional dep', `${dep} found`);
      else warn('Backend optional dep', `${dep} not in package.json`);
    });
  }

  // Frontend
  if (fs.existsSync('frontend/package.json')) {
    const pkg = JSON.parse(fs.readFileSync('frontend/package.json', 'utf8'));
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    const required = ['react', 'react-dom', 'axios', 'react-router-dom', 'socket.io-client'];

    required.forEach(dep => {
      if (deps[dep]) pass('Frontend dep', `${dep} found`);
      else fail('Frontend dep', `${dep} MISSING from package.json`);
    });
  }
}

// ══════════════════════════════════════════════
//  TEST 4: CODE BUG CHECK
// ══════════════════════════════════════════════
function testCodeBugs() {
  section('TEST 4: Known Bug Detection in Code');

  // Bug 1: requireAdmin in ai.js
  if (fs.existsSync('backend/src/routes/ai.js')) {
    const code = fs.readFileSync('backend/src/routes/ai.js', 'utf8');
    if (code.includes('requireAdmin')) {
      fail('BUG #1', 'backend/src/routes/ai.js uses requireAdmin (does not exist!) — WILL CRASH SERVER');
    } else {
      pass('BUG #1', 'requireAdmin bug is fixed in ai.js');
    }
  }

  // Bug 2: Port 5000 in frontend api.js
  if (fs.existsSync('frontend/src/services/api.js')) {
    const code = fs.readFileSync('frontend/src/services/api.js', 'utf8');
    if (code.includes('5000')) {
      fail('BUG #2', 'frontend/src/services/api.js uses port 5000 — should be 4000');
    } else {
      pass('BUG #2', 'Frontend API port is correct (not 5000)');
    }
    if (code.includes('4000')) {
      pass('BUG #2 confirm', 'Frontend correctly uses port 4000');
    }
  }

  // Bug 3: Port 5000 in webcam_monitor.py
  if (fs.existsSync('ai-detection/webcam_monitor.py')) {
    const code = fs.readFileSync('ai-detection/webcam_monitor.py', 'utf8');
    if (code.includes('5000')) {
      fail('BUG #3', 'ai-detection/webcam_monitor.py uses port 5000 — should be 4000');
    } else {
      pass('BUG #3', 'webcam_monitor.py port is correct');
    }
  }

  // Bug 4: nodemailer check
  if (fs.existsSync('backend/src/utils/email.js')) {
    const code = fs.readFileSync('backend/src/utils/email.js', 'utf8');
    if (code.includes('nodemailer')) {
      const pkg = JSON.parse(fs.readFileSync('backend/package.json', 'utf8'));
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };
      if (!deps['nodemailer']) {
        fail('BUG #4', 'email.js uses nodemailer but it is NOT in package.json');
      } else {
        pass('BUG #4', 'nodemailer is in package.json');
      }
    }
  }

  // Bug 5: python vs sys.executable in liveness_check.py
  if (fs.existsSync('ai-module/liveness_check.py')) {
    const code = fs.readFileSync('ai-module/liveness_check.py', 'utf8');
    if (code.includes("['python'") || code.includes('["python"')) {
      warn('BUG #5', 'liveness_check.py uses hardcoded python — may fail on Windows. Use sys.executable instead');
    } else {
      pass('BUG #5', 'liveness_check.py does not use hardcoded python command');
    }
  }

  // Check auth middleware has requireRole
  if (fs.existsSync('backend/src/middleware/auth.js')) {
    const code = fs.readFileSync('backend/src/middleware/auth.js', 'utf8');
    if (code.includes('requireRole')) {
      pass('AUTH middleware', 'requireRole function exists in auth.js');
    } else {
      fail('AUTH middleware', 'requireRole function NOT found in auth.js');
    }
    if (code.includes('requireAdmin')) {
      warn('AUTH middleware', 'requireAdmin found — make sure it is exported if used');
    }
  }
}

// ══════════════════════════════════════════════
//  TEST 5: BACKEND SERVER CONNECTION
// ══════════════════════════════════════════════
async function testServerConnection() {
  section('TEST 5: Backend Server Connection');

  info(`Trying to connect to ${BASE_URL} ...`);

  const res = await get('/');
  if (res.status === 0) {
    fail('Server connection', `Cannot connect to ${BASE_URL} — ${res.error}`);
    info('Make sure backend is running: cd backend && npm run dev');
    return false;
  } else {
    pass('Server connection', `Server is running at ${BASE_URL} (status: ${res.status})`);
    return true;
  }
}

// ══════════════════════════════════════════════
//  TEST 6: AUTH API TESTS
// ══════════════════════════════════════════════
async function testAuthAPI() {
  section('TEST 6: Authentication API');

  // Test Signup
  info(`Testing signup with: ${testEmail}`);
  const signupRes = await post('/api/auth/signup', {
    name: 'Test Student',
    email: testEmail,
    password: testPass,
    role: 'student'
  });

  if (signupRes.status === 201 || signupRes.status === 200) {
    pass('POST /api/auth/signup', `Status ${signupRes.status} — User created`);
  } else if (signupRes.status === 400 && signupRes.body?.message?.includes('already')) {
    warn('POST /api/auth/signup', 'User already exists (test ran before)');
  } else {
    fail('POST /api/auth/signup', `Status ${signupRes.status} — ${signupRes.body?.message || signupRes.raw}`);
  }

  // Test Login - Student
  info(`Testing student login...`);
  const loginRes = await post('/api/auth/login', {
    email: testEmail,
    password: testPass
  });

  if (loginRes.status === 200 && loginRes.body?.token) {
    studentToken = loginRes.body.token;
    pass('POST /api/auth/login', `Status 200 — Student token received`);
  } else {
    fail('POST /api/auth/login', `Status ${loginRes.status} — ${loginRes.body?.message || loginRes.raw}`);
  }

  // Test wrong password
  const wrongRes = await post('/api/auth/login', {
    email: testEmail,
    password: 'WrongPassword123'
  });
  if (wrongRes.status === 401 || wrongRes.status === 400) {
    pass('Auth security', `Wrong password correctly rejected (${wrongRes.status})`);
  } else {
    warn('Auth security', `Wrong password returned ${wrongRes.status} — check auth logic`);
  }

  // Test missing fields
  const emptyRes = await post('/api/auth/login', { email: '' });
  if (emptyRes.status === 400 || emptyRes.status === 401) {
    pass('Auth validation', 'Empty login correctly rejected');
  } else {
    warn('Auth validation', `Empty login returned ${emptyRes.status}`);
  }
}

// ══════════════════════════════════════════════
//  TEST 7: PROTECTED ROUTES
// ══════════════════════════════════════════════
async function testProtectedRoutes() {
  section('TEST 7: Protected Routes (Auth Required)');

  // Without token
  const noTokenRes = await get('/api/exams/list');
  if (noTokenRes.status === 401 || noTokenRes.status === 403) {
    pass('Route protection', `/api/exams/list blocked without token (${noTokenRes.status})`);
  } else {
    warn('Route protection', `/api/exams/list returned ${noTokenRes.status} without token`);
  }

  if (!studentToken) {
    warn('Protected routes', 'Skipping — no student token available');
    return;
  }

  // With valid token
  const withTokenRes = await getAuth('/api/exams/list', studentToken);
  if (withTokenRes.status === 200) {
    pass('GET /api/exams/list', `Status 200 — Exam list accessible with token`);
    if (Array.isArray(withTokenRes.body)) {
      info(`Found ${withTokenRes.body.length} exams in database`);
    }
  } else {
    fail('GET /api/exams/list', `Status ${withTokenRes.status} — ${withTokenRes.body?.message || ''}`);
  }

  // Results
  const resultsRes = await getAuth('/api/results', studentToken);
  if (resultsRes.status === 200) {
    pass('GET /api/results', `Status 200 — Results accessible`);
  } else {
    fail('GET /api/results', `Status ${resultsRes.status}`);
  }

  // Violations
  const violationsRes = await getAuth('/api/violations', studentToken);
  if (violationsRes.status === 200) {
    pass('GET /api/violations', `Status 200 — Violations accessible`);
  } else {
    warn('GET /api/violations', `Status ${violationsRes.status}`);
  }
}

// ══════════════════════════════════════════════
//  TEST 8: EXAM FLOW TEST
// ══════════════════════════════════════════════
async function testExamFlow() {
  section('TEST 8: Exam Flow API');

  if (!studentToken) {
    warn('Exam flow', 'Skipping — no student token');
    return;
  }

  // Get exam list
  const listRes = await getAuth('/api/exams/list', studentToken);
  if (listRes.status !== 200 || !Array.isArray(listRes.body) || listRes.body.length === 0) {
    warn('Exam flow', 'No exams in database — create an exam first from admin panel');
    return;
  }

  const firstExam = listRes.body[0];
  info(`Testing with exam: "${firstExam.title}" (ID: ${firstExam._id})`);

  // Start exam
  const startRes = await post('/api/exams/start', { examId: firstExam._id }, studentToken);
  if (startRes.status === 200 || startRes.status === 201) {
    pass('POST /api/exams/start', `Exam started successfully`);
  } else if (startRes.status === 400) {
    warn('POST /api/exams/start', `${startRes.body?.message || 'Bad request'}`);
  } else {
    fail('POST /api/exams/start', `Status ${startRes.status} — ${startRes.body?.message || ''}`);
  }

  // Get questions
  const qRes = await getAuth(`/api/exams/questions?examId=${firstExam._id}`, studentToken);
  if (qRes.status === 200 && Array.isArray(qRes.body)) {
    pass('GET /api/exams/questions', `Got ${qRes.body.length} questions`);

    // Submit exam with first option for all questions
    const answers = {};
    qRes.body.forEach(q => { answers[q._id] = 0; });

    const submitRes = await post('/api/exams/submit', {
      examId: firstExam._id,
      answers
    }, studentToken);

    if (submitRes.status === 200 && submitRes.body?.score !== undefined) {
      pass('POST /api/exams/submit', `Score: ${submitRes.body.score}/${submitRes.body.total} Grade: ${submitRes.body.grade}`);
    } else {
      fail('POST /api/exams/submit', `Status ${submitRes.status} — ${submitRes.body?.message || ''}`);
    }
  } else {
    warn('GET /api/exams/questions', `Status ${qRes.status} — ${qRes.body?.message || ''}`);
  }
}

// ══════════════════════════════════════════════
//  TEST 9: VIOLATION API TEST
// ══════════════════════════════════════════════
async function testViolationAPI() {
  section('TEST 9: Violation API (AI Module)');

  const violationData = {
    studentId: testEmail,
    type: 'face_absent',
    timestamp: new Date().toISOString(),
    screenshotPath: '/test/screenshot.jpg'
  };

  const res = await post('/api/violation', violationData);
  if (res.status === 200 || res.status === 201) {
    pass('POST /api/violation', `Violation logged successfully`);
  } else {
    fail('POST /api/violation', `Status ${res.status} — ${res.body?.message || res.raw}`);
  }

  // Test all violation types
  const types = ['face_absent', 'multiple_faces', 'gaze_left', 'gaze_right', 'phone_detected', 'talking_detected'];
  let typesPassed = 0;
  for (const type of types) {
    const r = await post('/api/violation', { studentId: testEmail, type, timestamp: new Date().toISOString() });
    if (r.status === 200 || r.status === 201) typesPassed++;
  }
  if (typesPassed === types.length) {
    pass('Violation types', `All ${types.length} violation types accepted`);
  } else {
    warn('Violation types', `${typesPassed}/${types.length} types accepted`);
  }
}

// ══════════════════════════════════════════════
//  TEST 10: SOCKET.IO CHECK
// ══════════════════════════════════════════════
async function testSocketIO() {
  section('TEST 10: Socket.io Real-time');

  // Check if socket.io endpoint responds
  const res = await get('/socket.io/?EIO=4&transport=polling');
  if (res.status === 200) {
    pass('Socket.io', 'Socket.io endpoint is reachable');
  } else if (res.status === 0) {
    fail('Socket.io', `Cannot reach socket endpoint — ${res.error}`);
  } else {
    warn('Socket.io', `Socket.io returned status ${res.status}`);
  }
}

// ══════════════════════════════════════════════
//  FINAL REPORT
// ══════════════════════════════════════════════
function printReport() {
  section('FINAL TEST REPORT');

  const total = passed + failed + warned;
  const passPercent = Math.round((passed / total) * 100);

  console.log(`\n${BOLD}Results Summary:${RESET}`);
  console.log(`${GREEN}${BOLD}  ✅ PASSED : ${passed}${RESET}`);
  console.log(`${RED}${BOLD}  ❌ FAILED : ${failed}${RESET}`);
  console.log(`${YELLOW}${BOLD}  ⚠️  WARNED : ${warned}${RESET}`);
  console.log(`${CYAN}${BOLD}  📊 TOTAL  : ${total}${RESET}`);
  console.log(`\n  Health Score: ${passPercent}% ${passPercent >= 80 ? '🟢' : passPercent >= 60 ? '🟡' : '🔴'}`);

  if (failed > 0) {
    console.log(`\n${RED}${BOLD}❌ FAILED TESTS:${RESET}`);
    RESULTS.filter(r => r.status === 'FAIL').forEach(r => {
      console.log(`${RED}   → [${r.label}] ${r.message}${RESET}`);
    });
  }

  if (warned > 0) {
    console.log(`\n${YELLOW}${BOLD}⚠️  WARNINGS:${RESET}`);
    RESULTS.filter(r => r.status === 'WARN').forEach(r => {
      console.log(`${YELLOW}   → [${r.label}] ${r.message}${RESET}`);
    });
  }

  // Save report to file
  const report = {
    timestamp: new Date().toISOString(),
    summary: { passed, failed, warned, total, healthScore: passPercent + '%' },
    results: RESULTS
  };
  fs.writeFileSync('test_report.json', JSON.stringify(report, null, 2));
  console.log(`\n${CYAN}📄 Full report saved to: test_report.json${RESET}`);

  if (passPercent >= 80) {
    console.log(`\n${GREEN}${BOLD}🎉 Project is in GOOD shape! Most things are working.${RESET}`);
  } else if (passPercent >= 60) {
    console.log(`\n${YELLOW}${BOLD}🔧 Project needs some fixes. Check the FAILED tests above.${RESET}`);
  } else {
    console.log(`\n${RED}${BOLD}🚨 Project has serious issues. Fix FAILED tests first!${RESET}`);
  }
}

// ══════════════════════════════════════════════
//  MAIN - RUN ALL TESTS
// ══════════════════════════════════════════════
async function runAllTests() {
  console.clear();
  console.log(`${BLUE}${BOLD}`);
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║    AI ONLINE EXAM PROCTORING SYSTEM              ║');
  console.log('║    AUTOMATIC PROJECT TESTER v1.0                 ║');
  console.log('║    Run from project ROOT folder                  ║');
  console.log('╚══════════════════════════════════════════════════╝');
  console.log(`${RESET}`);

  // Static tests (no server needed)
  testFileStructure();
  testEnvFile();
  testPackageJson();
  testCodeBugs();

  // Server tests
  const serverUp = await testServerConnection();
  if (serverUp) {
    await testAuthAPI();
    await testProtectedRoutes();
    await testExamFlow();
    await testViolationAPI();
    await testSocketIO();
  } else {
    warn('API Tests', 'Skipping all API tests — start backend first');
    info('Run this command: cd backend && npm run dev');
  }

  printReport();
}

runAllTests().catch(err => {
  console.error(`${RED}Fatal error: ${err.message}${RESET}`);
  process.exit(1);
});
