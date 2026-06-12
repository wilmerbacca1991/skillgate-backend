const Interview = require('../models/Interview');
const InterviewSession = require('../models/InterviewSession');

const upsertPresence = (participants, userId, role, isJoining) => {
  const next = [...participants];
  const existingIndex = next.findIndex((item) => String(item.user) === String(userId));

  if (isJoining) {
    if (existingIndex >= 0) {
      next[existingIndex] = {
        ...next[existingIndex],
        role,
        joinedAt: new Date(),
        leftAt: undefined
      };
    } else {
      next.push({
        user: userId,
        role,
        joinedAt: new Date()
      });
    }
  } else if (existingIndex >= 0) {
    next[existingIndex] = {
      ...next[existingIndex],
      leftAt: new Date()
    };
  }

  return next;
};

const registerInterviewHandlers = (io, socket) => {
  const interviewNamespace = io.of('/interview');

  const getAuthorizedInterviewByRoomId = async (roomId) => {
    const interview = await Interview.findOne({ roomId }).select('_id roomId candidate recruiter');

    if (!interview) {
      return null;
    }

    const isAdmin = socket.user.role === 'admin';
    const isCandidate = String(interview.candidate) === String(socket.user.userId);
    const isRecruiter = String(interview.recruiter) === String(socket.user.userId);

    if (!isAdmin && !isCandidate && !isRecruiter) {
      return null;
    }

    return interview;
  };

  const getRoomParticipantPayload = (roomId) => {
    const room = interviewNamespace.adapter.rooms.get(roomId);
    const socketIds = room ? Array.from(room.values()) : [];

    return socketIds.map((socketId) => {
      const participantSocket = interviewNamespace.sockets.get(socketId);
      return {
        socketId,
        userId: participantSocket?.user?.userId || '',
        role: participantSocket?.user?.role || ''
      };
    });
  };

  socket.on('interview:join-room', async ({ roomId }) => {
    if (!roomId) {
      return;
    }

    const interview = await getAuthorizedInterviewByRoomId(roomId);
    if (!interview) {
      socket.emit('interview:error', {
        message: 'Room not found or you are not authorized to join this room.'
      });
      return;
    }

    socket.join(roomId);
    socket.data.interviewRoomId = roomId;
    socket.data.interviewId = String(interview._id);

    let session = await InterviewSession.findOne({ interview: interview._id });

    if (!session) {
      session = await InterviewSession.create({
        interview: interview._id,
        roomId,
        status: 'ready',
        participants: []
      });
    }

    session.participants = upsertPresence(
      session.participants || [],
      socket.user.userId,
      socket.user.role,
      true
    );
    session.status = 'active';
    await session.save();

    const participants = getRoomParticipantPayload(roomId);

    interviewNamespace.to(roomId).emit('interview:presence', {
      roomId,
      interviewId: interview._id,
      userId: socket.user.userId,
      role: socket.user.role,
      state: 'online',
      at: new Date().toISOString(),
      participants
    });

    socket.emit('interview:room-state', {
      roomId,
      interviewId: interview._id,
      status: session.status,
      participants
    });
  });

  socket.on('interview:presence', async ({ roomId, state = 'online' }) => {
    if (!roomId) {
      return;
    }

    interviewNamespace.to(roomId).emit('interview:presence', {
      roomId,
      userId: socket.user.userId,
      role: socket.user.role,
      state,
      at: new Date().toISOString()
    });
  });

  socket.on('interview:note', async ({ roomId, text }) => {
    if (!roomId || !text) {
      return;
    }

    const interview = await getAuthorizedInterviewByRoomId(roomId);
    if (!interview) {
      return;
    }

    const session = await InterviewSession.findOne({ interview: interview._id });
    if (!session) {
      return;
    }

    const note = {
      by: socket.user.userId,
      text: String(text).slice(0, 2000),
      createdAt: new Date()
    };

    session.notes = [...(session.notes || []), note].slice(-200);
    await session.save();

    interviewNamespace.to(session.roomId).emit('interview:note', {
      roomId,
      interviewId: interview._id,
      note
    });
  });

  socket.on('interview:end', async ({ roomId }) => {
    if (!roomId) {
      return;
    }

    const isAdmin = socket.user.role === 'admin';
    const isRecruiter = socket.user.role === 'recruiter';
    if (!isAdmin && !isRecruiter) {
      socket.emit('interview:error', {
        message: 'Only recruiters can end the interview room.'
      });
      return;
    }

    const interview = await getAuthorizedInterviewByRoomId(roomId);
    if (!interview) {
      return;
    }

    const session = await InterviewSession.findOne({ interview: interview._id });
    if (!session) {
      return;
    }

    session.status = 'ended';
    session.endedAt = new Date();
    await session.save();

    interviewNamespace.to(session.roomId).emit('interview:end', {
      roomId,
      interviewId: interview._id,
      endedAt: session.endedAt
    });
  });

  socket.on('interview:webrtc-offer', ({ roomId, targetSocketId, sdp }) => {
    if (!roomId || !targetSocketId || !sdp) {
      return;
    }

    interviewNamespace.to(targetSocketId).emit('interview:webrtc-offer', {
      roomId,
      fromSocketId: socket.id,
      sdp
    });
  });

  socket.on('interview:webrtc-answer', ({ roomId, targetSocketId, sdp }) => {
    if (!roomId || !targetSocketId || !sdp) {
      return;
    }

    interviewNamespace.to(targetSocketId).emit('interview:webrtc-answer', {
      roomId,
      fromSocketId: socket.id,
      sdp
    });
  });

  socket.on('interview:webrtc-ice-candidate', ({ roomId, targetSocketId, candidate }) => {
    if (!roomId || !targetSocketId || !candidate) {
      return;
    }

    interviewNamespace.to(targetSocketId).emit('interview:webrtc-ice-candidate', {
      roomId,
      fromSocketId: socket.id,
      candidate
    });
  });

  socket.on('disconnect', async () => {
    const interviewId = socket.data.interviewId;
    if (!interviewId) {
      return;
    }

    const session = await InterviewSession.findOne({ interview: interviewId });
    if (!session) {
      return;
    }

    session.participants = upsertPresence(
      session.participants || [],
      socket.user.userId,
      socket.user.role,
      false
    );
    await session.save();

    interviewNamespace.to(session.roomId).emit('interview:presence', {
      roomId: session.roomId,
      interviewId,
      userId: socket.user.userId,
      role: socket.user.role,
      state: 'offline',
      at: new Date().toISOString()
    });
  });
};

module.exports = registerInterviewHandlers;
