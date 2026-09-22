import { adminLoginAction } from './actions';

const MSG: Record<string, string> = {
  bad: 'Złe hasło',
  limit: 'Za dużo prób, spróbuj za 15 minut',
  error: 'Nie udało się sprawdzić logowania, spróbuj za chwilę',
};

export function LoginForm({ error }: { error?: string }) {
  const msg = error ? MSG[error] : undefined;
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
