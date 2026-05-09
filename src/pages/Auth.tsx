import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { COLORS } from '../lib/constants';
import { useAuthStore } from '../stores/authStore';

const S = {
  field: {
    background: '#0A0E14', color: '#DDE3EE',
    border: '1px solid #1B2535',
    borderRadius: 4, padding: '10px 12px',
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 12, outline: 'none', width: '100%',
    WebkitAppearance: 'none' as const, appearance: 'none' as const,
  },
};

export default function Auth() {
  const navigate = useNavigate();
  const login    = useAuthStore(s => s.login);
  const register = useAuthStore(s => s.register);

  const [mode,     setMode]     = useState<'login' | 'register'>('login');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'login') await login(email, password);
      else await register(email, password);
      navigate('/dashboard', { replace: true });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg.includes('400') ? 'Invalid email or password.' : msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', background: COLORS.bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20,
    }}>
      <div style={{ width: '100%', maxWidth: 380 }}>
        <h1 className="syne" style={{ fontSize: 28, fontWeight: 800, color: COLORS.text, marginBottom: 4 }}>
          Projection
        </h1>
        <p style={{ fontSize: 11, color: COLORS.muted, marginBottom: 28 }}>
          Personal financial scenario planner
        </p>

        {/* Mode tabs */}
        <div style={{
          display: 'flex', borderRadius: 6, overflow: 'hidden',
          border: `1px solid ${COLORS.border}`, marginBottom: 24,
        }}>
          {(['login', 'register'] as const).map(m => (
            <button
              key={m}
              onClick={() => { setMode(m); setError(''); }}
              style={{
                flex: 1, padding: '9px 0', fontSize: 11, border: 'none',
                fontFamily: "'IBM Plex Mono', monospace",
                cursor: 'pointer', transition: 'all 0.12s',
                background: mode === m ? `${COLORS.accent}18` : 'transparent',
                color:      mode === m ? COLORS.accent : COLORS.muted,
              }}
            >
              {m === 'login' ? 'Sign in' : 'Create account'}
            </button>
          ))}
        </div>

        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label htmlFor="email" style={{ fontSize: 10, letterSpacing: 2, color: COLORS.muted, textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Email</label>
            <input
              id="email" type="email" value={email} required autoComplete="email"
              onChange={e => setEmail(e.target.value)}
              style={S.field}
            />
          </div>
          <div>
            <label htmlFor="password" style={{ fontSize: 10, letterSpacing: 2, color: COLORS.muted, textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Password</label>
            <input
              id="password" type="password" value={password} required
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              onChange={e => setPassword(e.target.value)}
              style={S.field}
            />
          </div>

          {error && (
            <div style={{
              padding: '9px 12px', borderRadius: 4,
              background: `${COLORS.red}18`, border: `1px solid ${COLORS.red}40`,
              fontSize: 11, color: COLORS.red,
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '11px', fontSize: 12, borderRadius: 4,
              border: `1px solid ${COLORS.accent}`,
              background: COLORS.accent, color: '#07090C',
              fontFamily: "'IBM Plex Mono', monospace",
              fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1, marginTop: 4,
            }}
          >
            {loading ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
          </button>
        </form>
      </div>
    </div>
  );
}
