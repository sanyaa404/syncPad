import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav style={{ background: '#242424', borderBottom: '1px solid #333' }} className="px-6 py-3">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        <span
          onClick={() => navigate('/dashboard')}
          className="cursor-pointer font-bold text-lg tracking-tight"
          style={{ color: '#BE5103' }}
        >
          Syncpad
        </span>
        {user && (
          <div className="flex items-center gap-4">
            <span style={{ color: '#888', fontSize: '13px' }}>{user.username}</span>
            <button
              onClick={handleLogout}
              style={{
                background: 'transparent',
                border: '1px solid #333',
                color: '#888',
                fontSize: '12px',
                padding: '4px 12px',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
              onMouseEnter={e => e.target.style.borderColor = '#BE5103'}
              onMouseLeave={e => e.target.style.borderColor = '#333'}
            >
              Logout
            </button>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;