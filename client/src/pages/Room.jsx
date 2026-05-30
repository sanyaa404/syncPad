import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { io } from 'socket.io-client';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import { getUserColor } from '../utils/colors';
import { CursorManager } from '../utils/cursorManager';

const LANGUAGES = ['javascript', 'python', 'cpp', 'java', 'typescript'];

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
  const [typingUsers, setTypingUsers] = useState(new Set());
  const [saved, setSaved] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showUserPanel, setShowUserPanel] = useState(false);

  const socketRef = useRef(null);
  const editorRef = useRef(null);
  const isRemoteChange = useRef(false);
  const typingTimeoutsRef = useRef({});
  const cursorManagerRef = useRef(null);
  const remoteCursorsRef = useRef({});

  useEffect(() => {
    if (!user) return;

    const initRoom = async () => {
      try {
        const res = await api.rooms.getRoom(roomId);
        setRoom(res.data.room);
        setLanguage(res.data.room.language);

        socketRef.current = io('http://localhost:5000', {
          transports: ['websocket']
        });

        const socket = socketRef.current;

        socket.emit('join-room', {
          roomId,
          userId: user._id,
          username: user.username
        });

        socket.on('load-code', ({ code, language }) => {
          isRemoteChange.current = true;
          setCode(code);
          setLanguage(language);
          isRemoteChange.current = false;
          setLoading(false);
        });

        socket.on('code-change', ({ code }) => {
          isRemoteChange.current = true;
          setCode(code);
          isRemoteChange.current = false;
        });

        socket.on('language-change', ({ language }) => {
          setLanguage(language);
          // Clear all cursors on language change
          cursorManagerRef.current?.removeAll();
        });

        socket.on('room-users', (users) => {
          setConnectedUsers(users);
          const activeUserIds = new Set(users.map(u => u.userId));
          Object.keys(remoteCursorsRef.current).forEach(userId => {
            if (!activeUserIds.has(userId)) {
              cursorManagerRef.current?.removeCursor(userId);
              delete remoteCursorsRef.current[userId];
            }
          });
        });

        // Typing indicator — per user
        socket.on('typing', ({ username }) => {
          setTypingUsers(prev => new Set([...prev, username]));

          // Clear this specific user's typing state after 2s
          if (typingTimeoutsRef.current[username]) {
            clearTimeout(typingTimeoutsRef.current[username]);
          }
          typingTimeoutsRef.current[username] = setTimeout(() => {
            setTypingUsers(prev => {
              const next = new Set(prev);
              next.delete(username);
              return next;
            });
          }, 2000);
        });

        // Remote cursor position
        socket.on('cursor-move', ({ userId, username, line, column }) => {
          remoteCursorsRef.current[userId] = { username, line, column };
          if (cursorManagerRef.current) {
            const color = getUserColor(username);
            cursorManagerRef.current.updateCursor(userId, username, color, line, column);
          }
        });

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

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
      cursorManagerRef.current?.removeAll();
      Object.values(typingTimeoutsRef.current).forEach(clearTimeout);
    };
  }, [roomId, user]);

  const debouncedSave = useCallback(
    debounce((roomId, code) => {
      socketRef.current?.emit('save-code', { roomId, code });
    }, 2000),
    []
  );

  const handleEditorChange = (value) => {
    if (isRemoteChange.current) return;
    const newCode = value || '';
    setCode(newCode);
    setSaved(false);
    socketRef.current?.emit('code-change', { roomId, code: newCode });
    socketRef.current?.emit('typing', { roomId, username: user.username });
    debouncedSave(roomId, newCode);
  };

  const handleEditorMount = (editor, monaco) => {
    editorRef.current = editor;
    cursorManagerRef.current = new CursorManager(editor, monaco);

    // Emit cursor position on every cursor move
    editor.onDidChangeCursorPosition((e) => {
      socketRef.current?.emit('cursor-move', {
        roomId,
        line: e.position.lineNumber,
        column: e.position.column
      });
    });
  };

  const handleLanguageChange = (e) => {
    const newLanguage = e.target.value;
    setLanguage(newLanguage);
    socketRef.current?.emit('language-change', { roomId, language: newLanguage });
  };

  // Format typing indicator text
  const getTypingText = () => {
    const users = [...typingUsers];
    if (users.length === 0) return '';
    if (users.length === 1) return `${users[0]} is typing...`;
    if (users.length === 2) return `${users[0]} and ${users[1]} are typing...`;
    return `${users.length} people are typing...`;
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
      <div className="bg-gray-800 border-b border-gray-700 px-6 py-3 flex-shrink-0">
        <div className="flex items-center justify-between">

          {/* Left */}
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

          {/* Right */}
          <div className="flex items-center gap-4">
            {getTypingText() && (
              <span className="text-gray-400 text-xs italic">
                {getTypingText()}
              </span>
            )}
            <span className={`text-xs ${saved ? 'text-green-400' : 'text-yellow-400'}`}>
              {saved ? '✓ Saved' : 'Saving...'}
            </span>

            {/* User avatars — click to toggle panel */}
            <div
              className="flex items-center gap-1 cursor-pointer"
              onClick={() => setShowUserPanel(!showUserPanel)}
            >
              {connectedUsers.slice(0, 4).map((u) => (
                <div
                  key={u.socketId}
                  title={u.username}
                  className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold border-2 border-gray-900"
                  style={{ backgroundColor: getUserColor(u.username) }}
                >
                  {u.username[0].toUpperCase()}
                </div>
              ))}
              {connectedUsers.length > 4 && (
                <div className="w-7 h-7 rounded-full bg-gray-600 flex items-center justify-center text-white text-xs">
                  +{connectedUsers.length - 4}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main area */}
      <div className="flex-1 flex overflow-hidden">

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

        {/* User Panel — slides in from right */}
        {showUserPanel && (
          <div className="w-56 bg-gray-800 border-l border-gray-700 flex flex-col flex-shrink-0">
            <div className="px-4 py-3 border-b border-gray-700 flex items-center justify-between">
              <span className="text-white text-xs font-medium">
                In this room ({connectedUsers.length})
              </span>
              <button
                onClick={() => setShowUserPanel(false)}
                className="text-gray-500 hover:text-white text-xs"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {connectedUsers.map((u) => (
                <div key={u.socketId} className="flex items-center gap-2">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                    style={{ backgroundColor: getUserColor(u.username) }}
                  >
                    {u.username[0].toUpperCase()}
                  </div>
                  <span className="text-gray-300 text-sm truncate">
                    {u.username}
                  </span>
                  {u.userId === user?.id && (
                    <span className="text-gray-500 text-xs ml-auto">you</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Room;