import { Server } from 'socket.io';

let ioRef = null;

export function init(server) {
  ioRef = new Server(server, {
    cors: { origin: '*', methods: ['GET', 'POST'] }
  });
  ioRef.on('connection', (socket) => {
    socket.on('identify', (payload = {}) => {
      socket.data.role = payload.role;
      socket.data.studentId = payload.studentId;
      if (payload.role === 'admin') {
        socket.join('admins');
      }
    });
    socket.on('frame', (payload = {}) => {
      const studentId = payload.studentId || socket.data.studentId;
      if (!studentId || !payload.imageBase64) return;
      ioRef.to('admins').emit('frame', { studentId, imageBase64: payload.imageBase64, ts: Date.now() });
    });
    socket.on('activity', (payload = {}) => {
      const studentId = payload.studentId || socket.data.studentId;
      if (!studentId || !payload.activity) return;
      ioRef.to('admins').emit('activity', { studentId, activity: payload.activity, ts: Date.now() });
    });
  });
  return ioRef;
}

export function io() {
  return ioRef;
}
