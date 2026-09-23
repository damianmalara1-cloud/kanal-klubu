import { describe, it, expect, vi, beforeEach } from 'vitest';
import { testConfig, resetAdapters } from '@/test/helpers';
vi.mock('@/config', () => ({ getConfig: () => testConfig({ adminPassword: 'x'.repeat(16), coachNames: ['Ania'], teams: ['A'] }) }));
const auth = vi.hoisted(() => ({ ok: true }));
vi.mock('@/admin/auth', () => ({ isAdmin: async () => auth.ok, isAdminEnabled: () => true }));
vi.mock('next/navigation', () => ({ redirect: (u: string) => { throw new Error(`REDIRECT ${u}`); }, notFound: () => { throw new Error('NOT_FOUND'); } }));
import { adminRestoreCalendarAction } from './actions';
import { createSeries, deleteEvent } from '@/workflow/calendar';
import { getCalendar } from '@/calendar';
const fd = (o: Record<string, string>) => { const f = new FormData(); for (const [k, v] of Object.entries(o)) f.set(k, v); return f; };
beforeEach(() => { resetAdapters(); auth.ok = true; });
describe('adminRestoreCalendarAction', () => {
  it('bez sesji → redirect na /admin', async () => {
    auth.ok = false;
    await expect(adminRestoreCalendarAction(fd({ id: 'x' }))).rejects.toThrow('REDIRECT /admin');
  });
  it('id → przywraca jeden; seriesId → całą serię z kosza; zawsze redirect do kosza', async () => {
    const s = await createSeries({ type: 'trening', team: 'A', date: '2026-09-29', startTime: '16:30', endTime: '18:00', coaches: ['Ania'] }, { weekdays: [2], until: '2026-10-13' }, 'Ania');
    const rows = await getCalendar().listSeriesFrom(s.seriesId, '2000-01-01T00:00:00.000Z');
    await deleteEvent(rows[0].id, 'Ania', 'following');
    await expect(adminRestoreCalendarAction(fd({ id: rows[0].id }))).rejects.toThrow('REDIRECT /admin/kalendarz/kosz');
    expect((await getCalendar().listDeleted()).length).toBe(2);
    await expect(adminRestoreCalendarAction(fd({ seriesId: s.seriesId }))).rejects.toThrow('REDIRECT /admin/kalendarz/kosz');
    expect((await getCalendar().listDeleted()).length).toBe(0);
    expect((await getCalendar().get(rows[1].id))?.updatedBy).toBe('admin');
  });
});
