import { ClubMark } from '@/components/ClubMark';
export default function NotFound() {
  return (
    <main className="wrap">
      <ClubMark />
      <h1>Nie znaleziono</h1>
      <p className="muted">Ten link nie działa albo post został już usunięty (pliki znikają po 7 dniach). Wróć do linku trenera, który dostałeś od klubu.</p>
    </main>
  );
}
