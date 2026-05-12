import { FormEvent, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthField from '../components/AuthField';

type LoginPageProps = {
  onLoginSuccess: () => void;
};

function LoginPage({ onLoginSuccess }: LoginPageProps) {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const errorTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    setUsername('');
    setPassword('');
    setError('');
  }, []);

  useEffect(() => {
    if (!error) {
      return;
    }

    if (errorTimeoutRef.current) {
      window.clearTimeout(errorTimeoutRef.current);
    }

    errorTimeoutRef.current = window.setTimeout(() => {
      setError('');
      errorTimeoutRef.current = null;
    }, 2000);

    return () => {
      if (errorTimeoutRef.current) {
        window.clearTimeout(errorTimeoutRef.current);
      }
    };
  }, [error]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (username === 'Angelo' && password === 'A2026') {
      onLoginSuccess();
      navigate('/admin');
      return;
    }

    setError('Credenziali errate. Riprovare');
  };

  return (
    <div className="login-page">
      <div className="login-page__top">
        <div className="login-page__brand">
          <div className="login-page__brand-icon">
            <span className="material-symbols-outlined" aria-hidden="true">
              park
            </span>
          </div>
          <h1 className="login-page__title">GeoGiardini</h1>
        </div>
      </div>

      <main className="login-page__main">
        <div className="login-page__intro">
          <h2>Benvenuto</h2>
          <p>Gestione completa delle aree verdi</p>
        </div>

        <form className="login-page__form" autoComplete="off" onSubmit={handleSubmit}>
          <AuthField
            id="username"
            label="Nome utente"
            type="text"
            placeholder="Inserisci il nome utente"
            icon="person"
            value={username}
            onChange={(value) => setUsername(value)}
            autoComplete="off"
          />
          <AuthField
            id="password"
            label="Password"
            type="password"
            placeholder="••••••••"
            icon="lock"
            value={password}
            onChange={(value) => setPassword(value)}
            autoComplete="new-password"
          />

          <div className="login-page__actions">
            <Link className="login-page__link" to="#">
              Password dimenticata
            </Link>
            <button className="login-page__submit" type="submit">
              Accedi
            </button>
          </div>
        </form>
      </main>

      {error && (
        <div className="login-page__error-overlay" role="alert" aria-live="assertive">
          <div className="login-page__error-message">{error}</div>
        </div>
      )}

      <footer className="login-page__footer">
        <p>
          Nuovo utente?{' '}
          <Link className="login-page__footer-link" to="#">
            Registrati adesso
          </Link>
        </p>
        <p className="login-page__powered-by">Powered by Spectrum Italia 2026</p>
      </footer>

      <div className="login-page__background">
        <div className="login-page__glow login-page__glow--top" />
        <div className="login-page__glow login-page__glow--bottom" />
      </div>
    </div>
  );
}

export default LoginPage;
