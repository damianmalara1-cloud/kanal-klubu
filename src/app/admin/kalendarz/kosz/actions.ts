'use server';
import { redirect } from 'next/navigation';
import { isAdmin } from '@/admin/auth';
import { restoreEvents, restoreSeries } from '@/workflow/calendar';
/** `redirect()` rzuca wyjątek sterujący Next — nie owijać w try/catch. */
export async function adminRestoreCalendarAction(fd: FormData): Promise<void> {
  if (!(await isAdmin())) redirect('/admin');
  const id = String(fd.get('id') ?? ''), seriesId = String(fd.get('seriesId') ?? ''), deletedAt = String(fd.get('deletedAt') ?? '');
  // `deletedAt` (I1) odróżnia tę konkretną „paczkę" usunięcia od innych terminów tej samej serii wyrzuconych
  // do kosza osobno — bez niego „Przywróć serię" ożywiałoby też terminy odwołane wcześniej przy innej okazji.
  if (seriesId && deletedAt) await restoreSeries(seriesId, 'admin', deletedAt);
  else if (id) await restoreEvents([id], 'admin');
  redirect('/admin/kalendarz/kosz');
}
