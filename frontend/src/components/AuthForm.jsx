import { useState } from 'react';
import { loginUser, registerUser } from '../services/api.js';

export function AuthForm({ onAuthenticated }) {
  const [mode, setMode] = useState('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const authenticate = mode === 'login' ? loginUser : registerUser;
      const session = await authenticate({ username, password });
      onAuthenticated(session);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  function changeMode(nextMode) {
    setMode(nextMode);
    setError('');
  }

  const isLogin = mode === 'login';

  return (
    <main className="app-shell auth-shell">
      <header className="topbar">
        <a className="brand" href="#auth" aria-label="DMS, início">
          <span className="brand-mark" aria-hidden="true">D</span>
          <span>DMS</span>
        </a>
        <span className="workspace-label">Biblioteca privada</span>
      </header>

      <div className="auth-content" id="auth">
        <section className="auth-intro" aria-labelledby="auth-title">
          <p className="eyebrow">DOCUMENT MANAGEMENT SYSTEM</p>
          <h1 id="auth-title">Seus arquivos,<br />só seus.</h1>
          <p>Entre para acessar sua biblioteca privada ou crie uma conta local.</p>
        </section>

        <section className="auth-panel" aria-labelledby="auth-form-title">
          <div className="auth-tabs" role="tablist" aria-label="Acesso à conta">
            <button
              className={isLogin ? 'auth-tab active' : 'auth-tab'}
              id="login-tab"
              type="button"
              role="tab"
              aria-selected={isLogin}
              onClick={() => changeMode('login')}
            >
              Entrar
            </button>
            <button
              className={!isLogin ? 'auth-tab active' : 'auth-tab'}
              id="register-tab"
              type="button"
              role="tab"
              aria-selected={!isLogin}
              onClick={() => changeMode('register')}
            >
              Criar conta
            </button>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            <h2 id="auth-form-title">{isLogin ? 'Bem-vindo de volta' : 'Nova conta'}</h2>
            <label htmlFor="username">Usuário</label>
            <input
              id="username"
              name="username"
              autoComplete="username"
              minLength={3}
              maxLength={32}
              pattern="[A-Za-z0-9._-]{3,32}"
              required
              value={username}
              onChange={(event) => setUsername(event.target.value)}
            />
            <label htmlFor="password">Senha</label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete={isLogin ? 'current-password' : 'new-password'}
              minLength={12}
              maxLength={128}
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            {!isLogin && <p className="auth-hint">Use de 12 a 128 caracteres.</p>}
            {error && <p className="feedback error" role="alert">{error}</p>}
            <button className="primary-button auth-submit" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Aguarde...' : isLogin ? 'Entrar na biblioteca' : 'Criar conta'}
              <span aria-hidden="true">↗</span>
            </button>
          </form>
        </section>
      </div>

      <footer className="footer">
        <span>DMS · armazenamento local</span>
        <span>A sessão termina ao fechar ou atualizar esta página.</span>
      </footer>
    </main>
  );
}