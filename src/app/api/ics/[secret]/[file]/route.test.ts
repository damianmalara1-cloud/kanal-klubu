import { describe, it, expect, vi, beforeEach } from 'vitest';
import { testConfig, resetAdapters } from '@/test/helpers';
vi.mock('@/config', () => ({ getConfig: () => testConfig({ coachNames: ['Ania'], teams: ['młodziczki (2011+)', 'B'] }) }));
import { GET } from './route';
import { createEvent, deleteEvent } from '@/workflow/calendar';
import { getCalendar } from '@/calendar';
const S = 'abcdefghijklmnop';
const call = (secret: string, file: string) => GET(new Request(`http://x/api/ics/${secret}/${file}`), { params: Promise.resolve({ secret, file }) });
beforeEach(() => resetAdapters());
describe('/api/ics', () => {
  it('zły sekret / zły slug / brak .ics → 404', async () => {
    expect((await call('zly', 'klub.ics')).status).toBe(404);
    expect((await call(S, 'nieznana.ics')).status).toBe(404);
    expect((await call(S, 'klub')).status).toBe(404);
  });
  it('klub.ics: nagłówki, wszystkie drużyny, bez kosza; drużyna: jej wydarzenia + klubowe (I6)', async () => {
    const a = await createEvent({ type: 'trening', teams: ['młodziczki (2011+)'], date: '2026-10-01', startTime: '16:30', endTime: '18:00', coaches: ['Ania'] }, 'Ania');
    const b = await createEvent({ type: 'inne', teams: ['B'], title: 'Sparing', date: '2026-10-02', startTime: '16:30', endTime: '18:00', coaches: [] }, 'Ania');
    await deleteEvent(b.id, 'Ania', 'one');
    const c = await createEvent({ type: 'inne', teams: [], title: 'Zebranie', date: '2026-10-03', startTime: '19:00', endTime: '20:00', coaches: [] }, 'Ania');
    const r = await call(S, 'klub.ics');
    expect(r.status).toBe(200);
    expect(r.headers.get('content-type')).toBe('text/calendar; charset=utf-8');
    expect(r.headers.get('cache-control')).toBe('public, max-age=300');
    expect(r.headers.get('content-disposition')).toBe('inline; filename="uks-banino-klub.ics"');
    const body = await r.text();
    expect(body).toContain(`UID:${a.id}@`); expect(body).not.toContain(`UID:${b.id}@`); expect(body).toContain(`UID:${c.id}@`);
    // Filtr drużyny musi dociągnąć też wydarzenia całego klubu (`c`, team=null) — nie tylko swoje (I6).
    const t = await (await call(S, 'mlodziczki-2011.ics')).text();
    expect(t).toContain(`UID:${a.id}@`); expect(t).toContain(`UID:${c.id}@`); expect(t).not.toContain(`UID:${b.id}@`); expect(t).toContain('X-WR-CALNAME:UKS Banino · młodziczki (2011+)');
  });
  it('wydarzenie dwóch drużyn trafia do .ics obu, SUMMARY z obiema', async () => {
    const e = await createEvent({ type: 'turniej', teams: ['młodziczki (2011+)', 'B'], name: 'Mikołajki', date: '2026-10-04', allDay: true, coaches: [] }, 'Ania');
    const a = await (await call(S, 'mlodziczki-2011.ics')).text();
    const b = await (await call(S, 'b.ics')).text();
    expect(a).toContain(`UID:${e.id}@`); expect(b).toContain(`UID:${e.id}@`);
    expect(a).toContain('SUMMARY:młodziczki (2011+) + B · Turniej · Mikołajki');
  });
  it('awaria bazy → 503 z Retry-After', async () => {
    vi.spyOn(getCalendar(), 'listRange').mockRejectedValueOnce(new Error('down'));
    const r = await call(S, 'klub.ics');
    expect(r.status).toBe(503); expect(r.headers.get('retry-after')).toBe('300');
  });
});
