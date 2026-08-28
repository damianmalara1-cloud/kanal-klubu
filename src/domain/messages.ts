/** Komunikaty o poście, którego już nie ma albo jest zamknięty. Mieszkają w `domain`, a nie w `workflow`,
 * bo czyta je też klient (`NewPostClient`) — moduły `workflow/*` ciągną `server-only` przez config/db/storage
 * i nie mogą wejść do bundla przeglądarki. Dzięki temu klient nie duplikuje tekstu serwera.
 */
export const MSG_DRAFT_GONE = 'Post nie istnieje albo jest już zakończony';
export const MSG_POST_NOT_FOUND = 'Nie znaleziono';
export const MSG_POST_DONE = 'Post jest już zakończony';

/** Komunikaty znaczące „trzymany w kliencie `id` szkicu jest już nieaktualny" — po każdym z nich klient musi
 * wyrzucić `id`/wgrane ścieżki, żeby kolejna próba założyła świeży szkic zamiast dobijać się do martwego. */
export const DRAFT_GONE_MESSAGES: readonly string[] = [MSG_DRAFT_GONE, MSG_POST_NOT_FOUND, MSG_POST_DONE];

export const isDraftGoneMessage = (message: string): boolean => DRAFT_GONE_MESSAGES.includes(message);
