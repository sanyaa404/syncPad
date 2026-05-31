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

  useEffect(() => { fetchRooms(); }, []);

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

  const inputStyle = {
    background: '#1c1c1c',
    border: '1px solid #333',
    borderRadius: '8px',
    padding: '10px 14px',
    color: '#e5e5e5',
    fontSize: '13px',
    outline: 'none',
  };

  return (
    <div style={{ background: '#1c1c1c', minHeight: '100vh' }}>
      <Navbar />

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '40px 24px' }}>

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 style={{ color: '#e5e5e5', fontSize: '20px', fontWeight: '600', margin: 0 }}>
              Good to see you, {user?.username}
            </h1>
            <p style={{ color: '#555', fontSize: '13px', marginTop: '4px' }}>
              Your collaborative sessions
            </p>
          </div>
          <button
            onClick={() => setCreateModal(true)}
            style={{
              background: '#BE5103',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              padding: '9px 16px',
              fontSize: '13px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
            onMouseEnter={e => e.target.style.background = '#A34502'}
            onMouseLeave={e => e.target.style.background = '#BE5103'}
          >
            + New Room
          </button>
        </div>

        {error && (
          <div style={{ background: '#BE510315', border: '1px solid #BE510340', color: '#BE5103', fontSize: '13px', padding: '10px 14px', borderRadius: '8px', marginBottom: '20px' }}>
            {error}
          </div>
        )}

        {/* Join Room */}
        <div style={{ background: '#242424', border: '1px solid #333', borderRadius: '10px', padding: '20px', marginBottom: '32px' }}>
          <p style={{ color: '#888', fontSize: '12px', marginBottom: '10px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Join a room
          </p>
          <form onSubmit={handleJoin} style={{ display: 'flex', gap: '10px' }}>
            <input
              type="text"
              value={joinInput}
              onChange={(e) => setJoinInput(e.target.value)}
              placeholder="Enter room code  —  e.g. xK9mP2"
              style={{ ...inputStyle, flex: 1 }}
              onFocus={e => e.target.style.borderColor = '#BE5103'}
              onBlur={e => e.target.style.borderColor = '#333'}
            />
            <button
              type="submit"
              style={{
                background: '#2a2a2a',
                border: '1px solid #333',
                color: '#e5e5e5',
                borderRadius: '8px',
                padding: '10px 18px',
                fontSize: '13px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
              onMouseEnter={e => e.target.style.borderColor = '#BE5103'}
              onMouseLeave={e => e.target.style.borderColor = '#333'}
            >
              Join
            </button>
          </form>
        </div>

        {/* Rooms */}
        <p style={{ color: '#888', fontSize: '12px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '14px' }}>
          Your rooms
        </p>

        {loading ? (
          <p style={{ color: '#555', fontSize: '13px' }}>Loading...</p>
        ) : rooms.length === 0 ? (
          <div style={{ background: '#242424', border: '1px solid #333', borderRadius: '10px', padding: '40px', textAlign: 'center' }}>
            <p style={{ color: '#555', fontSize: '14px' }}>No rooms yet.</p>
            <p style={{ color: '#444', fontSize: '13px', marginTop: '4px' }}>Create one to get started.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '12px' }}>
            {rooms.map((room) => (
              <div
                key={room._id}
                onClick={() => navigate(`/room/${room.roomId}`)}
                style={{
                  background: '#242424',
                  border: '1px solid #333',
                  borderRadius: '10px',
                  padding: '18px',
                  cursor: 'pointer',
                  transition: 'border-color 0.15s'
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = '#BE5103'}
                onMouseLeave={e => e.currentTarget.style.borderColor = '#333'}
              >
                <div className="flex items-center justify-between mb-3">
                  <span style={{ color: '#e5e5e5', fontSize: '14px', fontWeight: '500' }}>
                    {room.name}
                  </span>
                  <span style={{ background: '#2a2a2a', color: '#888', fontSize: '11px', padding: '2px 8px', borderRadius: '4px', border: '1px solid #333' }}>
                    {room.language}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span style={{ color: '#555', fontSize: '11px', fontFamily: 'monospace' }}>
                    {room.roomId}
                  </span>
                  <span style={{ color: '#555', fontSize: '11px' }}>
                    {room.members.length} member{room.members.length !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {createModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', zIndex: 50 }}>
          <div style={{ background: '#242424', border: '1px solid #333', borderRadius: '12px', padding: '28px', width: '100%', maxWidth: '380px' }}>
            <h2 style={{ color: '#e5e5e5', fontSize: '16px', fontWeight: '600', marginBottom: '20px' }}>
              Create new room
            </h2>
            <form onSubmit={handleCreate}>
              <div className="mb-4">
                <label style={{ color: '#888', fontSize: '12px', display: 'block', marginBottom: '6px' }}>Room name</label>
                <input
                  type="text"
                  value={newRoom.name}
                  onChange={(e) => setNewRoom({ ...newRoom, name: e.target.value })}
                  placeholder="Interview Prep, Bug Fix #234..."
                  required
                  style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }}
                  onFocus={e => e.target.style.borderColor = '#BE5103'}
                  onBlur={e => e.target.style.borderColor = '#333'}
                />
              </div>
              <div className="mb-6">
                <label style={{ color: '#888', fontSize: '12px', display: 'block', marginBottom: '6px' }}>Language</label>
                <select
                  value={newRoom.language}
                  onChange={(e) => setNewRoom({ ...newRoom, language: e.target.value })}
                  style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }}
                >
                  {languages.map(lang => (
                    <option key={lang} value={lang}>{lang}</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setCreateModal(false)}
                  style={{ flex: 1, background: '#2a2a2a', border: '1px solid #333', color: '#888', borderRadius: '8px', padding: '10px', fontSize: '13px', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ flex: 1, background: '#BE5103', border: 'none', color: '#fff', borderRadius: '8px', padding: '10px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}
                  onMouseEnter={e => e.target.style.background = '#A34502'}
                  onMouseLeave={e => e.target.style.background = '#BE5103'}
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