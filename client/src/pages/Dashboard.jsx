import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';

const Dashboard = () => {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createModal, setCreateModal] = useState(false);
  const [joinInput, setJoinInput] = useState('');
  const [newRoom, setNewRoom] = useState({ name: '', language: 'javascript' });
  const [error, setError] = useState('');
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchRooms();
  }, []);

  const fetchRooms = async () => {
    try {
      const res = await api.rooms.getMyRooms();
      setRooms(res.data.rooms);
    } catch {
      setError('Failed to load rooms');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const res = await api.rooms.create(newRoom);
      navigate(`/room/${res.data.room.roomId}`);
    } catch {
      setError('Failed to create room');
    }
  };

  const handleJoin = async (e) => {
    e.preventDefault();
    if (!joinInput.trim()) return;
    try {
      await api.rooms.join(joinInput.trim());
      navigate(`/room/${joinInput.trim()}`);
    } catch {
      setError('Room not found');
    }
  };

  const languages = ['javascript', 'python', 'cpp', 'java', 'typescript'];

  return (
    <div className="min-h-screen bg-gray-900">
      <Navbar />
      <div className="max-w-6xl mx-auto px-6 py-10">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-white text-2xl font-bold">
              Welcome, {user?.username}
            </h1>
            <p className="text-gray-400 text-sm mt-1">
              Your collaborative coding sessions
            </p>
          </div>
          <button
            onClick={() => setCreateModal(true)}
            className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
          >
            + New Room
          </button>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-400 text-sm px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Join Room */}
        <div className="bg-gray-800 rounded-xl p-6 mb-8">
          <h2 className="text-white font-medium mb-3">Join a Room</h2>
          <form onSubmit={handleJoin} className="flex gap-3">
            <input
              type="text"
              value={joinInput}
              onChange={(e) => setJoinInput(e.target.value)}
              placeholder="Enter room code (e.g. xK9mP2)"
              className="flex-1 bg-gray-700 text-white rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              className="bg-gray-600 hover:bg-gray-500 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition"
            >
              Join
            </button>
          </form>
        </div>

        {/* Rooms List */}
        <h2 className="text-white font-medium mb-4">Your Rooms</h2>
        {loading ? (
          <div className="text-gray-400 text-sm">Loading rooms...</div>
        ) : rooms.length === 0 ? (
          <div className="text-gray-500 text-sm">
            No rooms yet. Create one to get started.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rooms.map((room) => (
              <div
                key={room._id}
                onClick={() => navigate(`/room/${room.roomId}`)}
                className="bg-gray-800 hover:bg-gray-750 border border-gray-700 hover:border-gray-500 rounded-xl p-5 cursor-pointer transition"
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-white font-medium">{room.name}</h3>
                  <span className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded">
                    {room.language}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 text-xs font-mono">
                    {room.roomId}
                  </span>
                  <span className="text-gray-500 text-xs">
                    {room.members.length} member{room.members.length !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Room Modal */}
      {createModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center px-4 z-50">
          <div className="bg-gray-800 rounded-xl p-6 w-full max-w-md">
            <h2 className="text-white font-bold text-lg mb-4">Create New Room</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="text-gray-400 text-sm block mb-1">Room Name</label>
                <input
                  type="text"
                  value={newRoom.name}
                  onChange={(e) => setNewRoom({ ...newRoom, name: e.target.value })}
                  className="w-full bg-gray-700 text-white rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Interview Prep, Bug Fix #234..."
                  required
                />
              </div>
              <div>
                <label className="text-gray-400 text-sm block mb-1">Language</label>
                <select
                  value={newRoom.language}
                  onChange={(e) => setNewRoom({ ...newRoom, language: e.target.value })}
                  className="w-full bg-gray-700 text-white rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {languages.map(lang => (
                    <option key={lang} value={lang}>{lang}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setCreateModal(false)}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium py-2.5 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium py-2.5 rounded-lg transition"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;