'use server';
import { redirect } from 'next/navigation';
import { isAdmin } from '@/admin/auth';
import { restoreEvents, restoreSeries } from '@/workflow/calendar';
/** `redirect()` rzuca wyjątek sterujący Next — nie owijać w try/catch. */
export async function adminRestoreCalendarAction(fd: FormData): Promise<void> {
  if (!(await isAdmin())) redirect('/admin');
  const id = String(fd.get('id') ?? ''), seriesId = String(fd.get('seriesId') ?? '');
  if (seriesId) await restoreSeries(seriesId, 'admin');
  else if (id) await restoreEvents([id], 'admin');
  redirect('/admin/kalendarz/kosz');
}
