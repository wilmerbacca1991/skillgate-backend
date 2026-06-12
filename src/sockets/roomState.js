const rooms = new Map();

const ensureRoom = (roomId, initialCode = '', language = 'javascript') => {
if (!rooms.has(roomId)) {
rooms.set(roomId, {
code: initialCode,
language,
participants: new Map()
});
}

return rooms.get(roomId);
};

const addParticipant = (roomId, socketId, user) => {
const room = ensureRoom(roomId);
room.participants.set(socketId, user);
return room;
};

const removeParticipant = (roomId, socketId) => {
const room = rooms.get(roomId);
if (!room) {
return null;
}

room.participants.delete(socketId);

if (room.participants.size === 0) {
rooms.delete(roomId);
return null;
}

return room;
};

const updateRoomCode = (roomId, code) => {
const room = rooms.get(roomId);
if (!room) {
return null;
}

room.code = code;
return room;
};

const getRoom = (roomId) => rooms.get(roomId);

const getParticipantsArray = (roomId) => {
const room = rooms.get(roomId);
if (!room) {
return [];
}

return Array.from(room.participants.values());
};

module.exports = {
ensureRoom,
addParticipant,
removeParticipant,
updateRoomCode,
getRoom,
getParticipantsArray
};
