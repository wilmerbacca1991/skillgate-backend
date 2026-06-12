const {
ensureRoom,
addParticipant,
removeParticipant,
updateRoomCode,
getRoom,
getParticipantsArray
} = require('./roomState');

const registerCollabHandlers = (io, socket) => {
socket.on('room:join', ({ roomId, initialCode = '', language = 'javascript' }) => {
if (!roomId) {
return;
}

socket.join(roomId);

const room = ensureRoom(roomId, initialCode, language);
addParticipant(roomId, socket.id, {
socketId: socket.id,
userId: socket.user.userId,
role: socket.user.role
});

socket.data.roomId = roomId;

socket.emit('room:state', {
roomId,
code: room.code,
language: room.language
});

io.to(roomId).emit('room:participants', {
roomId,
participants: getParticipantsArray(roomId)
});
});

socket.on('code:change', ({ roomId, code, cursor }) => {
if (!roomId || typeof code !== 'string') {
return;
}

updateRoomCode(roomId, code);

socket.to(roomId).emit('code:update', {
roomId,
code,
cursor,
by: socket.user.userId
});
});

socket.on('cursor:move', ({ roomId, cursor }) => {
if (!roomId) {
return;
}

socket.to(roomId).emit('cursor:update', {
roomId,
cursor,
by: socket.user.userId
});
});

socket.on('run:request', ({ roomId, language = 'javascript', code = '' }) => {
if (!roomId) {
return;
}

socket.to(roomId).emit('run:request', {
roomId,
language,
code,
by: socket.user.userId,
requestedAt: new Date().toISOString()
});
});

socket.on('run:result', ({ roomId, success = true, output = '', error = '' }) => {
if (!roomId) {
return;
}

socket.to(roomId).emit('run:result', {
roomId,
success,
output,
error,
by: socket.user.userId,
completedAt: new Date().toISOString()
});
});

socket.on('room:leave', ({ roomId }) => {
if (!roomId) {
return;
}

socket.leave(roomId);
removeParticipant(roomId, socket.id);

io.to(roomId).emit('room:participants', {
roomId,
participants: getParticipantsArray(roomId)
});
});

socket.on('disconnect', () => {
const roomId = socket.data.roomId;
if (!roomId) {
return;
}

removeParticipant(roomId, socket.id);

const room = getRoom(roomId);
if (room) {
io.to(roomId).emit('room:participants', {
roomId,
participants: getParticipantsArray(roomId)
});
}
});
};

module.exports = registerCollabHandlers;
