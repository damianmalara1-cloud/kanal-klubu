import type { OgloszenieForm } from '@/domain/types';
import type { CreativeProps } from '../types';
import { BarRow, Canvas, DataCell, Kicker, Logo, M, PartnerBand, PhotoTop, RED, RedBar, FONT_DISPLAY, upperPl } from '../parts';

// Kiedy/Godzina/Miejsce muszą zmieścić się w JEDNYM wierszu (max 3 komórki) — trzy równe kolumny z
// dwiema przerwami 26px: (950 − 2×26) / 3 ≈ 299px. Przy szerokości 462px (stara wartość) trzecia
// komórka się zawijała, a jej linia 2px wyglądała jak podkreślenie wiersza powyżej.
const CELL_WIDTH = Math.floor((950 - 2 * 26) / 3);

// Szerokości znaków Antona (advance / unitsPerEm, wyciągnięte z Anton-Regular.ttf fontToolsem) — pozwalają
// policzyć, ile linii zajmie nagłówek przy danym rozmiarze, bez renderowania. Nieznany znak → 0.5 (z zapasem).
const ANTON_W: Record<string, number> = {
  A: 0.485, B: 0.479, C: 0.474, D: 0.493, E: 0.412, F: 0.399, G: 0.485, H: 0.499, I: 0.227, J: 0.466, K: 0.472,
  L: 0.397, M: 0.746, N: 0.498, O: 0.486, P: 0.472, Q: 0.494, R: 0.477, S: 0.461, T: 0.396, U: 0.474, V: 0.469,
  W: 0.712, X: 0.484, Y: 0.446, Z: 0.41, Ą: 0.485, Ć: 0.474, Ę: 0.412, Ł: 0.417, Ń: 0.498, Ó: 0.486, Ś: 0.461,
  Ź: 0.41, Ż: 0.41, '0': 0.494, '1': 0.331, '2': 0.494, '3': 0.494, '4': 0.494, '5': 0.494, '6': 0.494, '7': 0.494,
  '8': 0.494, '9': 0.494, ' ': 0.234, '.': 0.229, ',': 0.236, ':': 0.242, ';': 0.245, '!': 0.229, '?': 0.492,
  '-': 0.311, '–': 0.311, '—': 0.563, '/': 0.405, '&': 0.52, '+': 0.355, '"': 0.429, "'": 0.214, '(': 0.291,
  ')': 0.291, '„': 0.467, '”': 0.463, '%': 1.057, '#': 0.546, '@': 0.864,
};
const TRACKING = -0.015; // letterSpacing nagłówka w em (jak w stylu niżej)
// Liczymy na 95% szerokości kolumny — margines na zaokrąglenia satori, żeby wyliczone N linii nie zrobiło się N+1.
const FIT_WIDTH = 950 * 0.95;

export const textWidth = (s: string, size: number) =>
  [...s].reduce((w, c) => w + ((ANTON_W[c] ?? 0.5) + TRACKING) * size, 0);

/** Zawijanie zachłanne po spacjach (jak satori); null, gdy pojedyncze słowo nie mieści się w szerokości. */
export function wrapLines(text: string, size: number, width = FIT_WIDTH): string[] | null {
  const lines: string[] = [];
  let cur = '';
  for (const word of text.split(/\s+/).filter(Boolean)) {
    if (textWidth(word, size) > width) return null;
    const next = cur ? `${cur} ${word}` : word;
    if (textWidth(next, size) <= width) cur = next;
    else {
      lines.push(cur);
      cur = word;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

export const lineHeightFor = (lines: number) => (lines > 1 ? 1.0 : 0.92);

/**
 * Największy rozmiar nagłówka, który mieści się w wolnym miejscu (szerokość 950 × `maxHeight`).
 * Wcześniej rozmiar zależał tylko od długości tytułu (3 progi) — przy długim tytule bez Kiedy/Godzina/Miejsce
 * (np. „Mała Cegielnia nowym partnerem UKS Banino") nagłówek szedł 62 px, a środek planszy zostawał pusty.
 * Teraz tytuł wypełnia przestrzeń, którą faktycznie ma. `cap` trzyma krótkie tytuły („Nabór") w ryzach.
 */
export function fitHeadline(
  text: string,
  maxHeight: number,
  cap: number,
  vs: [string, string] | null = null,
): { size: number; lineHeight: number } {
  for (let size = cap; size > 40; size -= 2) {
    if (vs) {
      const second = textWidth('VS', size * 0.6) + size * 0.2 + textWidth(vs[1], size);
      if (textWidth(vs[0], size) <= FIT_WIDTH && second <= FIT_WIDTH && 2 * size * lineHeightFor(2) <= maxHeight) {
        return { size, lineHeight: lineHeightFor(2) };
      }
      continue;
    }
    const lines = wrapLines(text, size);
    if (lines && lines.length * size * lineHeightFor(lines.length) <= maxHeight) {
      return { size, lineHeight: lineHeightFor(lines.length) };
    }
  }
  return { size: 40, lineHeight: 1.08 };
}

/**
 * Tytuł typu „UKS Banino vs SPR Gdynia" (zapowiedź meczu) → dwie linie: gospodarz / „VS" + gość.
 * W jednej linii taki tytuł łapał najmniejszy rozmiar ze skali długości i plansza wyglądała pusto;
 * rozbity na dwie linie mierzy się długością dłuższej nazwy, więc idzie dużym krojem jak wynik meczu.
 */
export function splitVs(title: string): [string, string] | null {
  const m = title.match(/^(.+?)\s+vs\.?\s+(.+)$/i);
  return m ? [m[1].trim(), m[2].trim()] : null;
}

/**
 * Linia pod nagłówkiem (czerwony pasek + tekst). Pomijamy tekst, gdy powtórzyłby to, co już stoi wyżej —
 * model zwykle wkłada drużynę do kickera („Juniorki · dom"), a tytuł często zawiera „UKS Banino";
 * dubel „JUNIORKI … JUNIORKI" wyglądał na błąd. Sam pasek zostaje jako akcent.
 */
export function subLine(team: string | null, kicker: string | null, title: string): string | null {
  const sub = team || 'UKS Banino';
  const low = (s: string) => s.toLocaleLowerCase('pl-PL');
  if (low(kicker ?? '').includes(low(sub)) || low(title).includes(low(sub))) return null;
  return upperPl(sub);
}

// Dolna granica treści: z pasem partnerów trzymamy się nad zarezerwowaną strefą 1180–1350,
// bez pasa — margines jak po bokach. Treść jest przyklejona do tej granicy (a nie do góry), więc
// krótkie ogłoszenie nie zostawia pustej połowy planszy pod spodem.
const bottomLimit = (partnerBand: boolean) => (partnerBand ? 1150 : 1350 - M - 10);

export function OgloszenieCreative({ post, photo, partnerBand }: CreativeProps) {
  const f = post.form as OgloszenieForm;
  // Nagłówek WYŁĄCZNIE z pola „Tytuł" (UAT D-10): przy ogłoszeniu źródłem prawdy jest trener, a nie model —
  // „Nabór" nie może wjechać na planszę jako wymyślone „ZACZNIJ GRAĆ W BANINIE". `post.headline` model nadal
  // zwraca (zostaje w bazie i w podpisie), ale dla tego typu jest tu świadomie ignorowany.
  const headlineText = upperPl(f.title).slice(0, 60);
  const kicker = post.kicker || 'Ogłoszenie';
  const sub = subLine(f.team, kicker, f.title);
  const cells: [string, string][] = [];
  if (f.date) cells.push(['Kiedy', f.date]);
  if (f.time) cells.push(['Godzina', f.time]);
  if (f.place) cells.push(['Miejsce', f.place]);
  // Zdjęcie jak w szablonie meczu (700); z pasem partnerów niżej, żeby treść nie weszła na zdjęcie.
  const photoHeight = partnerBand ? 600 : 700;
  // Lewy brzeg zdjęcia sięga pełnego photoHeight (klin opada w lewo), więc treść zaczyna się pod nim.
  const top = photo ? photoHeight + 24 : 230;
  const bottom = bottomLimit(partnerBand);
  const vs = splitVs(headlineText);
  // Wysokość elementów pod/nad nagłówkiem — reszta wolnego miejsca idzie na sam tytuł.
  const kickerH = photo ? 30 + 16 : 0;
  const barH = 30 + (sub ? 30 : 12);
  const cellLines = Math.max(1, ...cells.map(([, v]) => Math.ceil((v.length * 0.52 * 40) / CELL_WIDTH)));
  const cellsH = cells.length > 0 ? 56 + 2 + 12 + 21 + 10 + cellLines * 48 : 0;
  const { size, lineHeight } = fitHeadline(headlineText, bottom - top - kickerH - barH - cellsH, photo ? 190 : 240, vs);
  return (
    <Canvas>
      {photo && <PhotoTop src={photo} height={photoHeight} />}
      <Logo white={!!photo} />
      {!photo && (
        <Kicker style={{ position: 'absolute', left: 500, top: 64, width: 515, justifyContent: 'flex-end', lineHeight: 1 }}>
          {kicker}
        </Kicker>
      )}
      <div
        style={{
          position: 'absolute',
          left: M,
          top,
          width: 950,
          height: bottom - top,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
        }}
      >
        {photo && <Kicker>{kicker}</Kicker>}
        <div
          style={{
            display: 'flex',
            marginTop: photo ? 16 : 0,
            width: 950,
            fontFamily: FONT_DISPLAY,
            fontSize: size,
            lineHeight,
            letterSpacing: -size * 0.015,
            wordBreak: 'break-word',
          }}
        >
          {vs ? (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex' }}>{vs[0]}</div>
              <div style={{ display: 'flex' }}>
                <span style={{ color: RED, fontSize: size * 0.6, marginRight: size * 0.2, alignSelf: 'center' }}>VS</span>
                <span>{vs[1]}</span>
              </div>
            </div>
          ) : (
            headlineText
          )}
        </div>
        {sub ? (
          <BarRow style={{ marginTop: 30 }} textStyle={{ fontWeight: 600, fontSize: 24, letterSpacing: 1.4, textTransform: 'uppercase' }}>
            {sub}
          </BarRow>
        ) : (
          <RedBar style={{ marginTop: 30 }} />
        )}
        {cells.length > 0 && (
          <div style={{ display: 'flex', marginTop: 56, gap: 26 }}>
            {cells.map(([label, value]) => (
              <DataCell key={label} label={label} value={value} width={CELL_WIDTH} big={40} />
            ))}
          </div>
        )}
      </div>
      {partnerBand && <PartnerBand />}
    </Canvas>
  );
}
