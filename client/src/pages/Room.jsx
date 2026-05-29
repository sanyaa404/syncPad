import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { io } from 'socket.io-client';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';

const LANGUAGES = ['javascript', 'python', 'cpp', 'java', 'typescript'];

// Debounce helper — waits until user stops typing for `delay`ms before saving
const debounce = (fn, delay) => {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
};

const Room = () => {
  const { roomId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [room, setRoom] = useState(null);
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('javascript');
  const [connectedUsers, setConnectedUsers] = useState([]);
  const [typingUser, setTypingUser] = useState('');
  const [saved, setSaved] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const socketRef = useRef(null);
  const editorRef = useRef(null);
  const isRemoteChange = useRef(false);
  const typingTimeoutRef = useRef(null);

  // Fetch room data and set up socket
  useEffect(() => {
    if (!user) return;

    const initRoom = async () => {
      try {
        // Fetch room from REST API first
        const res = await api.rooms.getRoom(roomId);
        setRoom(res.data.room);
        setLanguage(res.data.room.language);

        // Connect socket
        socketRef.current = io('http://localhost:5000', {
          transports: ['websocket']
        });

        const socket = socketRef.current;

        // Tell server we're joining this room
        socket.emit('join-room', {
          roomId,
          userId: user.id,
          username: user.username
        });

        // Server sends us the current code state
        socket.on('load-code', ({ code, language }) => {
          isRemoteChange.current = true;
          setCode(code);
          setLanguage(language);
          isRemoteChange.current = false;
          setLoading(false);
        });

        // Someone else changed the code
        socket.on('code-change', ({ code }) => {
          isRemoteChange.current = true;
          setCode(code);
          isRemoteChange.current = false;
        });

        // Someone changed the language
        socket.on('language-change', ({ language }) => {
          setLanguage(language);
        });

        // Updated list of who's in the room
        socket.on('room-users', (users) => {
          setConnectedUsers(users);
        });

        // Typing indicator
        socket.on('typing', ({ username }) => {
          setTypingUser(username);
          clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = setTimeout(() => {
            setTypingUser('');
          }, 2000);
        });

        // Code was saved to DB
        socket.on('code-saved', () => {
          setSaved(true);
        });
        setTimeout(() => setLoading(false), 3000);
      } catch (err) {
        setError('Room not found or access denied');
        setLoading(false);
      }
    };

    initRoom();

    // Cleanup on unmount — disconnect socket
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
      clearTimeout(typingTimeoutRef.current);
    };
  }, [roomId, user]);

  // Debounced save to MongoDB via socket
  const debouncedSave = useCallback(
    debounce((roomId, code) => {
      if (socketRef.current) {
        socketRef.current.emit('save-code', { roomId, code });
      }
    }, 2000),
    []
  );

  // Called every time the editor content changes
  const handleEditorChange = (value) => {
    if (isRemoteChange.current) return;

    const newCode = value || '';
    setCode(newCode);
    setSaved(false);

    // Broadcast to other users in real time
    socketRef.current?.emit('code-change', { roomId, code: newCode });

    // Emit typing indicator
    socketRef.current?.emit('typing', { roomId, username: user.username });

    // Save to MongoDB after 2 seconds of inactivity
    debouncedSave(roomId, newCode);
  };

  const handleLanguageChange = (e) => {
    const newLanguage = e.target.value;
    setLanguage(newLanguage);
    socketRef.current?.emit('language-change', { roomId, language: newLanguage });
  };

  const handleEditorMount = (editor) => {
    editorRef.current = editor;
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="text-blue-400 hover:text-blue-300 text-sm"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-900 flex flex-col overflow-hidden">
      <Navbar />

      {/* Room Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-6 py-3">
        <div className="max-w-full flex items-center justify-between">

          {/* Left — room info */}
          <div className="flex items-center gap-4">
            <h1 className="text-white font-medium text-sm">
              {room?.name || 'Loading...'}
            </h1>
            <span className="text-gray-500 text-xs font-mono bg-gray-700 px-2 py-1 rounded">
              {roomId}
            </span>
            <select
              value={language}
              onChange={handleLanguageChange}
              className="bg-gray-700 text-gray-300 text-xs rounded px-2 py-1 outline-none"
            >
              {LANGUAGES.map(lang => (
                <option key={lang} value={lang}>{lang}</option>
              ))}
            </select>
          </div>

          {/* Right — presence and save status */}
          <div className="flex items-center gap-4">
            {typingUser && (
              <span className="text-gray-400 text-xs italic">
                {typingUser} is typing...
              </span>
            )}
            <span className={`text-xs ${saved ? 'text-green-400' : 'text-yellow-400'}`}>
              {saved ? '✓ Saved' : 'Saving...'}
            </span>
            <div className="flex items-center gap-1">
              {connectedUsers.map((u) => (
                <div
                  key={u.socketId}
                  title={u.username}
                  className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-medium"
                >
                  {u.username[0].toUpperCase()}
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-gray-400 text-sm">Loading editor...</div>
          </div>
        ) : (
          <Editor
            height="100%"
            language={language === 'cpp' ? 'cpp' : language}
            value={code}
            onChange={handleEditorChange}
            onMount={handleEditorMount}
            theme="vs-dark"
            options={{
              fontSize: 14,
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              wordWrap: 'on',
              padding: { top: 16 },
              fontFamily: 'JetBrains Mono, Fira Code, monospace',
            }}
          />
        )}
      </div>
    </div>
  );
};

export default Room;