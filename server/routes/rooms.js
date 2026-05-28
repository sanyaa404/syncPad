const express = require('express');
const router = express.Router();
const { nanoid } = require('nanoid');
const { body, validationResult } = require('express-validator');
const Room = require('../models/Room');
const auth = require('../middleware/auth');

// POST /api/rooms/create
router.post('/create', auth, [
  body('name').trim().notEmpty().withMessage('Room name is required'),
  body('language').optional().isIn(['javascript', 'python', 'cpp', 'java', 'typescript'])
], async (req, res) => {

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { name, language } = req.body;

  try {
    const roomId = nanoid(6);

    const room = new Room({
      name,
      roomId,
      language: language || 'javascript',
      owner: req.user.userId,
      members: [req.user.userId]
    });

    await room.save();

    res.status(201).json({ room });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/rooms/join/:roomId
router.post('/join/:roomId', auth, async (req, res) => {
  try {
    const room = await Room.findOne({ roomId: req.params.roomId });

    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    // Add to members if not already in
    if (!room.members.includes(req.user.userId)) {
      room.members.push(req.user.userId);
      await room.save();
    }

    res.json({ room });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/rooms/:roomId
router.get('/:roomId', auth, async (req, res) => {
  try {
    const room = await Room.findOne({ roomId: req.params.roomId })
      .populate('owner', 'username email')
      .populate('members', 'username email');

    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    res.json({ room });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/rooms (get all rooms for current user)
router.get('/', auth, async (req, res) => {
  try {
    const rooms = await Room.find({ members: req.user.userId })
      .populate('owner', 'username email')
      .sort({ updatedAt: -1 });

    res.json({ rooms });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;