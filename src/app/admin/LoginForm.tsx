import { loginErrorMessage } from '@/admin/login';
import { adminLoginAction } from './actions';

export function LoginForm({ error }: { error?: string }) {
  const msg = loginErrorMessage(error);
  return (
    <main className="wrap">
      <p className="kicker">UKS Banino · Kanał Klubu</p>
      <h1>Panel admina</h1>
      {msg && <p className="error" role="alert">{msg}</p>}
      <form action={adminLoginAction}>
        <div className="field">
          <label htmlFor="pw">Hasło</label>
          <input id="pw" name="password" type="password" autoComplete="current-password" required />
        </div>
        <button type="submit" className="btn btn-primary">Zaloguj</button>
      </form>
    </main>
  );
}
