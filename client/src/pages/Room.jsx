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
  const [output, setOutput] = useState(null);
  const [running, setRunning] = useState(false);
  const [showOutput, setShowOutput] = useState(false);

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

        socketRef.current = io(import.meta.env.VITE_API_URL || 'http://localhost:5000', {
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

  const handleRunCode = async () => {
    setRunning(true);
    setShowOutput(true);
    setOutput(null);

    try {
      const res = await api.execute.run({ code, language });
      setOutput(res.data);
    } catch (err) {
      setOutput({
        stderr: 'Execution service unavailable. Try again.',
        stdout: '',
        compile_output: '',
        status: 'Error'
      });
    } finally {
      setRunning(false);
    }
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
      <div style={{ background: '#1c1c1c', minHeight: '100vh' }} className="flex items-center justify-center">
        <div className="text-center">
          <p style={{ color: '#BE5103', marginBottom: '12px', fontSize: '14px' }}>{error}</p>
          <button
            onClick={() => navigate('/dashboard')}
            style={{ color: '#888', fontSize: '13px', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            ← Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ height: '100vh', background: '#1c1c1c', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Navbar />

      {/* Room Header */}
      <div style={{ background: '#242424', borderBottom: '1px solid #333', padding: '8px 16px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>

          {/* Left */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ color: '#e5e5e5', fontSize: '13px', fontWeight: '500' }}>
              {room?.name || 'Loading...'}
            </span>
            <span style={{ color: '#555', fontSize: '11px', fontFamily: 'monospace', background: '#2a2a2a', border: '1px solid #333', padding: '2px 8px', borderRadius: '4px' }}>
              {roomId}
            </span>
            <select
              value={language}
              onChange={handleLanguageChange}
              style={{ background: '#2a2a2a', border: '1px solid #333', color: '#888', fontSize: '11px', borderRadius: '4px', padding: '3px 6px', outline: 'none' }}
            >
              {LANGUAGES.map(lang => (
                <option key={lang} value={lang}>{lang}</option>
              ))}
            </select>
            <button
              onClick={handleRunCode}
              disabled={running}
              style={{
                background: running ? '#7a3402' : '#BE5103',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                padding: '4px 12px',
                fontSize: '11px',
                fontWeight: '600',
                cursor: running ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              {running ? '⟳ Running...' : '▶ Run'}
            </button>
          </div>

          {/* Right */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {getTypingText() && (
              <span style={{ color: '#555', fontSize: '11px', fontStyle: 'italic' }}>
                {getTypingText()}
              </span>
            )}
            <span style={{ fontSize: '11px', color: saved ? '#22c55e' : '#BE5103' }}>
              {saved ? '✓ Saved' : 'Saving...'}
            </span>
            <div
              style={{ display: 'flex', alignItems: 'center', gap: '3px', cursor: 'pointer' }}
              onClick={() => setShowUserPanel(!showUserPanel)}
            >
              {connectedUsers.slice(0, 4).map((u) => (
                <div
                  key={u.socketId}
                  title={u.username}
                  style={{
                    width: '26px', height: '26px', borderRadius: '50%',
                    background: getUserColor(u.username),
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontSize: '10px', fontWeight: '700',
                    border: '2px solid #1c1c1c'
                  }}
                >
                  {u.username[0].toUpperCase()}
                </div>
              ))}
              {connectedUsers.length > 4 && (
                <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: '#2a2a2a', border: '1px solid #333', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888', fontSize: '10px' }}>
                  +{connectedUsers.length - 4}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main area */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* Editor + Output */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* Editor */}
          <div style={{ flex: showOutput ? '0 0 60%' : '1', overflow: 'hidden' }}>
            {loading ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                <span style={{ color: '#555', fontSize: '13px' }}>Loading editor...</span>
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

          {/* Output Panel */}
          {showOutput && (
            <div style={{ flex: '0 0 40%', background: '#141414', borderTop: '1px solid #333', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 16px', borderBottom: '1px solid #333', flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ color: '#e5e5e5', fontSize: '12px', fontWeight: '500' }}>Output</span>
                  {output?.status && (
                    <span style={{
                      fontSize: '10px', padding: '2px 8px', borderRadius: '4px', fontWeight: '600',
                      background: output.status === 'Accepted' ? '#15803d20' : '#BE510320',
                      color: output.status === 'Accepted' ? '#22c55e' : '#BE5103',
                      border: `1px solid ${output.status === 'Accepted' ? '#15803d40' : '#BE510340'}`
                    }}>
                      {output.status}
                    </span>
                  )}
                  {output?.time && (
                    <span style={{ color: '#555', fontSize: '11px' }}>{output.time}s</span>
                  )}
                </div>
                <button
                  onClick={() => setShowOutput(false)}
                  style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: '14px' }}
                  onMouseEnter={e => e.target.style.color = '#e5e5e5'}
                  onMouseLeave={e => e.target.style.color = '#555'}
                >
                  ✕
                </button>
              </div>
              <div style={{ flex: 1, overflowY: 'auto', padding: '16px', fontFamily: 'JetBrains Mono, Fira Code, monospace' }}>
                {running ? (
                  <span style={{ color: '#555', fontSize: '12px' }}>Running...</span>
                ) : output ? (
                  <>
                    {output.compile_output && (
                      <div style={{ marginBottom: '12px' }}>
                        <div style={{ color: '#BE5103', fontSize: '11px', marginBottom: '6px', fontWeight: '600' }}>COMPILATION ERROR</div>
                        <pre style={{ color: '#BE5103', fontSize: '12px', whiteSpace: 'pre-wrap', margin: 0 }}>{output.compile_output}</pre>
                      </div>
                    )}
                    {output.stderr && (
                      <div style={{ marginBottom: '12px' }}>
                        <div style={{ color: '#ef4444', fontSize: '11px', marginBottom: '6px', fontWeight: '600' }}>STDERR</div>
                        <pre style={{ color: '#ef4444', fontSize: '12px', whiteSpace: 'pre-wrap', margin: 0 }}>{output.stderr}</pre>
                      </div>
                    )}
                    {output.stdout && (
                      <div>
                        <div style={{ color: '#22c55e', fontSize: '11px', marginBottom: '6px', fontWeight: '600' }}>OUTPUT</div>
                        <pre style={{ color: '#e5e5e5', fontSize: '12px', whiteSpace: 'pre-wrap', margin: 0 }}>{output.stdout}</pre>
                      </div>
                    )}
                    {!output.stdout && !output.stderr && !output.compile_output && (
                      <span style={{ color: '#555', fontSize: '12px' }}>No output</span>
                    )}
                  </>
                ) : null}
              </div>
            </div>
          )}
        </div>

        {/* User Panel */}
        {showUserPanel && (
          <div style={{ width: '200px', background: '#242424', borderLeft: '1px solid #333', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
            <div style={{ padding: '12px 14px', borderBottom: '1px solid #333', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ color: '#888', fontSize: '11px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Online ({connectedUsers.length})
              </span>
              <button
                onClick={() => setShowUserPanel(false)}
                style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: '14px' }}
              >
                ✕
              </button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '10px' }}>
              {connectedUsers.map((u) => (
                <div key={u.socketId} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 4px' }}>
                  <div style={{
                    width: '26px', height: '26px', borderRadius: '50%',
                    background: getUserColor(u.username),
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontSize: '10px', fontWeight: '700', flexShrink: 0
                  }}>
                    {u.username[0].toUpperCase()}
                  </div>
                  <span style={{ color: '#aaa', fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {u.username}
                  </span>
                  {u.userId === user?._id && (
                    <span style={{ color: '#555', fontSize: '10px', marginLeft: 'auto' }}>you</span>
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