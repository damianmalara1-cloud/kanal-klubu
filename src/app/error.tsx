'use client';

/** Ostatnia siatka bezpieczeństwa dla nieobsłużonych błędów renderowania. Trener widzi jedno zdanie i
 * przycisk — bez `digest`, stack trace'u i komunikatu z wyjątku (mogą nieść dane z serwera).
 *
 * `retry` (nie `reset`) — od Next 16.3 to stabilne API i jedyne, które ponawia POBRANIE danych; `reset`
 * tylko czyści stan granicy błędu, więc na stronach `force-dynamic` pokazałby ten sam błąd jeszcze raz
 * (node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/error.md). */
export default function Error({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <main className="wrap">
      <p className="kicker">Kanał Klubu</p>
      <h1>Coś poszło nie tak</h1>
      <p className="muted">Spróbuj jeszcze raz. Jeśli to się powtórzy, daj znać Damianowi.</p>
      <button className="btn btn-primary" type="button" onClick={() => retry()}>
        Spróbuj ponownie
      </button>
    </main>
  );
}
