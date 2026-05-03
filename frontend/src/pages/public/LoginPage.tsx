import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser, hasRole, login } from '../../auth/auth';

export function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail]       = useState('admin@procuratio.local');
  const [password, setPassword] = useState('Admin123!');
  const [error, setError]       = useState<string | null>(null);
  const [loading, setLoading]   = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      const user = await getCurrentUser();
      if (hasRole(user.roles, 'ROLE_ADMIN') || hasRole(user.roles, 'ROLE_EMPLOYEE')) {
        navigate('/backoffice');
      } else {
        navigate('/client');
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="login-brand">PROCURATIO</div>
        <form className="login-form" onSubmit={onSubmit}>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Adresse e-mail"
            autoComplete="email"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mot de passe"
            autoComplete="current-password"
          />
          <button type="submit" disabled={loading}>
            {loading ? 'Connexion…' : 'Se connecter'}
          </button>
        </form>
        {error && <p className="error" style={{ marginTop: 12 }}>{error}</p>}
      </div>
    </div>
  );
}
