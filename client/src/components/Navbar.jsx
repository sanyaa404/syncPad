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
    <nav className="bg-gray-900 border-b border-gray-700 px-6 py-4">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        <span
          className="text-white text-xl font-bold cursor-pointer"
          onClick={() => navigate('/dashboard')}
        >
          Syncpad
        </span>
        {user && (
          <div className="flex items-center gap-4">
            <span className="text-gray-400 text-sm">{user.username}</span>
            <button
              onClick={handleLogout}
              className="text-sm bg-gray-700 hover:bg-gray-600 text-white px-3 py-1.5 rounded transition"
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