/** Limity uploadu zdjęć, wydzielone z `workflow/draft.ts` — ten import `sharp`/db/storage i nie wolno go
 * ciągnąć z komponentu klienckiego. `PhotoPicker` ('use client') czyta te same wartości stąd, żeby limit
 * pokazywany trenerowi w UI zawsze zgadzał się z tym, co faktycznie wyegzekwuje `/api/upload` (ruling 1,
 * task-16). `workflow/draft.ts` re-eksportuje obie stałe, więc dotychczasowy import z `@/workflow/draft`
 * (upload route + jego testy) działa bez zmian. */
export const MAX_PHOTOS = 10;
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
