const { io } = require('socket.io-client');

const token = process.argv[2];
if (!token) {
  console.error('Missing token argument');
  process.exit(1);
}

const roomId = 'room-step5-test';
const a = io('http://localhost:5000', { auth: { token } });
const b = io('http://localhost:5000', { auth: { token } });

let gotUpdate = false;

const done = (code, msg) => {
  try {
    a.disconnect();
    b.disconnect();
  } catch {}

  console.log(msg);
  process.exit(code);
};

a.on('connect', () => {
  a.emit('room:join', { roomId, initialCode: '// init' });

  setTimeout(() => {
    a.emit('code:change', { roomId, code: 'const x = 42;' });
  }, 500);
});

b.on('connect', () => {
  b.emit('room:join', { roomId });
});

b.on('code:update', (payload) => {
  if (payload && payload.code === 'const x = 42;') {
    gotUpdate = true;
    done(0, 'SOCKET_TEST_PASS');
  }
});

setTimeout(() => {
  if (!gotUpdate) {
    done(1, 'SOCKET_TEST_FAIL_NO_UPDATE');
  }
}, 6000);
