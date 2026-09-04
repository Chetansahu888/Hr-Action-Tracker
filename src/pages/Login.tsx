import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { AppLogo } from '../components/common/AppLogo';
import {
  User as UserIcon, ArrowRight,
  Lock, Eye, EyeOff
} from 'lucide-react';
import { toast } from 'sonner';

export const Login: React.FC = () => {
  const { loginWithCredentials } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const res = loginWithCredentials(username, password);
    setLoading(false);

    if (res.success && res.user) {
      toast.success(`Welcome ${res.user.name}!`);
      navigate('/tasks');
    } else {
      toast.error(res.error || 'Invalid username or password');
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#0d1b2e',
        background: 'radial-gradient(circle at 50% 20%, #1e2e4a 0%, #0d1b2e 80%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 440,
          backgroundColor: '#ffffff',
          borderRadius: 24,
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1)',
          overflow: 'hidden',
          animation: 'fadeIn 0.3s ease-out',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '36px 28px 26px',
            background: 'linear-gradient(180deg, #f8fafc 0%, #ffffff 100%)',
            borderBottom: '1px solid #e8ecf0',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: 54,
              height: 54,
              borderRadius: 16,
              background: '#55642a',
              boxShadow: '0 8px 24px rgba(85, 100, 42, 0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
            }}
          >
            <AppLogo size={32} color="#ffffff" />
          </div>
          <h1 style={{ fontSize: 21, fontWeight: 800, color: '#0f172a', margin: 0 }}>
            Action Tracker System
          </h1>
          <p style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>
            Sign in to access your HR Department dashboard
          </p>
        </div>

        {/* Content Form */}
        <div style={{ padding: '28px 28px 32px', display: 'flex', flexDirection: 'column', gap: 20 }}>
          
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            
            {/* Username */}
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                Username
              </label>
              <div style={{ position: 'relative' }}>
                <UserIcon size={16} color="#94a3b8" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="Enter your username..."
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  style={{
                    width: '100%',
                    height: 44,
                    paddingLeft: 38,
                    paddingRight: 12,
                    borderRadius: 10,
                    border: '1px solid #cbd5e1',
                    fontSize: 13,
                    outline: 'none',
                    color: '#0f172a',
                    backgroundColor: '#f8fafc',
                  }}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} color="#94a3b8" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Enter your password..."
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{
                    width: '100%',
                    height: 44,
                    paddingLeft: 38,
                    paddingRight: 40,
                    borderRadius: 10,
                    border: '1px solid #cbd5e1',
                    fontSize: 13,
                    outline: 'none',
                    color: '#0f172a',
                    backgroundColor: '#f8fafc',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: 12,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#94a3b8',
                    display: 'flex',
                  }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              style={{
                height: 44,
                marginTop: 6,
                borderRadius: 12,
                border: 'none',
                background: 'linear-gradient(135deg, #2563eb, #3b82f6)',
                color: '#ffffff',
                fontSize: 14,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                boxShadow: '0 4px 14px rgba(37,99,235,0.3)',
              }}
            >
              Sign In <ArrowRight size={16} />
            </button>
          </form>

        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.97); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
};

export default Login;
