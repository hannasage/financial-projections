import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useColors } from '../stores/themeStore';
import { useAuthStore } from '../stores/authStore';
import { Button, ButtonGroup, Input } from '@hannasage/projection-ui';
import type { ButtonGroupOption } from '@hannasage/projection-ui';

export default function Auth() {
  const COLORS   = useColors();
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

  const modeOptions: ButtonGroupOption[] = [
    { value: 'login',    label: 'Sign in'        },
    { value: 'register', label: 'Create account' },
  ];

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

        <ButtonGroup
          options={modeOptions}
          value={mode}
          variant="segmented"
          onChange={(v) => { setMode(v as 'login' | 'register'); setError(''); }}
          block
          style={{ marginBottom: 24 }}
        />

        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Input
            id="email"
            type="email"
            label="Email"
            value={email}
            required
            autoComplete="email"
            onChange={e => setEmail(e.target.value)}
          />
          <Input
            id="password"
            type="password"
            label="Password"
            value={password}
            required
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            onChange={e => setPassword(e.target.value)}
          />

          {error && (
            <div style={{
              padding: '9px 12px', borderRadius: 'var(--ui-radius-md)',
              background: 'color-mix(in srgb, var(--ui-danger) 15%, transparent)',
              border: '1px solid color-mix(in srgb, var(--ui-danger) 40%, transparent)',
              fontSize: 11, color: 'var(--ui-danger)', fontFamily: 'var(--ui-font)',
            }}>
              {error}
            </div>
          )}

          <Button type="submit" variant="primary" block disabled={loading} style={{ marginTop: 4 }}>
            {loading ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
          </Button>
        </form>
      </div>
    </div>
  );
}
