import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';

const Register = () => {
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.auth.register(form);
      login(res.data.token, res.data.user);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: '100%',
    background: '#1c1c1c',
    border: '1px solid #333',
    borderRadius: '8px',
    padding: '10px 14px',
    color: '#e5e5e5',
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box'
  };

  return (
    <div style={{ background: '#1c1c1c', minHeight: '100vh' }} className="flex items-center justify-center px-4">
      <div style={{ background: '#242424', border: '1px solid #333', borderRadius: '12px', width: '100%', maxWidth: '400px', padding: '36px' }}>

        <div className="mb-8">
          <span style={{ color: '#BE5103', fontSize: '22px', fontWeight: '700', letterSpacing: '-0.5px' }}>
            Syncpad
          </span>
          <p style={{ color: '#888', fontSize: '13px', marginTop: '6px' }}>
            Create your account
          </p>
        </div>

        {error && (
          <div style={{ background: '#BE510315', border: '1px solid #BE510340', color: '#BE5103', fontSize: '13px', padding: '10px 14px', borderRadius: '8px', marginBottom: '16px' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {[
            { label: 'Username', key: 'username', type: 'text', placeholder: 'cooldev' },
            { label: 'Email', key: 'email', type: 'email', placeholder: 'you@example.com' },
            { label: 'Password', key: 'password', type: 'password', placeholder: '••••••••' },
          ].map(({ label, key, type, placeholder }) => (
            <div key={key} className="mb-4">
              <label style={{ color: '#888', fontSize: '12px', display: 'block', marginBottom: '6px' }}>
                {label}
              </label>
              <input
                type={type}
                value={form[key]}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                placeholder={placeholder}
                required
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = '#BE5103'}
                onBlur={e => e.target.style.borderColor = '#333'}
              />
            </div>
          ))}

          <div style={{ marginTop: '8px' }}>
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                background: loading ? '#7a3402' : '#BE5103',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                padding: '11px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer'
              }}
              onMouseEnter={e => { if (!loading) e.target.style.background = '#A34502' }}
              onMouseLeave={e => { if (!loading) e.target.style.background = '#BE5103' }}
            >
              {loading ? 'Creating account...' : 'Create account'}
            </button>
          </div>
        </form>

        <p style={{ color: '#555', fontSize: '13px', textAlign: 'center', marginTop: '24px' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: '#BE5103', textDecoration: 'none' }}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Register;