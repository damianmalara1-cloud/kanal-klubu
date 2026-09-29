import type { OgloszenieForm } from '@/domain/types';
import type { CreativeProps } from '../types';
import { BarRow, Canvas, DataCell, Kicker, Logo, M, PartnerBand, PhotoTop, RED, RedBar, FONT_DISPLAY, upperPl } from '../parts';

// Kiedy/Godzina/Miejsce muszą zmieścić się w JEDNYM wierszu (max 3 komórki) — trzy równe kolumny z
// dwiema przerwami 26px: (950 − 2×26) / 3 ≈ 299px. Przy szerokości 462px (stara wartość) trzecia
// komórka się zawijała, a jej linia 2px wyglądała jak podkreślenie wiersza powyżej.
const CELL_WIDTH = Math.floor((950 - 2 * 26) / 3);

/**
 * Rozmiar wielkiego nagłówka zależny od długości (jak `resultStyle` w turniej.tsx). Nagłówek jest
 * ucinany do 40 znaków (`.slice(0, 40)` niżej), ale nawet 40 znaków Antonem w bazowym rozmiarze
 * zawijałoby się na tyle linii, że wjeżdżałby w zarezerwowaną strefę 1180–1350 (pas partnerów) —
 * skalowanie trzyma go nad strefą niezależnie od wariantu (zdjęcie ma mniejszą bazę, bo mniej
 * miejsca w pionie na treść).
 */
function headlineStyle(text: string, base: number): { size: number; lineHeight: number } {
  if (text.length <= 18) return { size: base, lineHeight: 0.92 };
  if (text.length <= 30) return { size: Math.round(base * 0.72), lineHeight: 1.0 };
  return { size: Math.round(base * 0.52), lineHeight: 1.08 };
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
  const headlineText = upperPl(f.title).slice(0, 40);
  const kicker = post.kicker || 'Ogłoszenie';
  const sub = subLine(f.team, kicker, f.title);
  const cells: [string, string][] = [];
  if (f.date) cells.push(['Kiedy', f.date]);
  if (f.time) cells.push(['Godzina', f.time]);
  if (f.place) cells.push(['Miejsce', f.place]);
  // Zdjęcie jak w szablonie meczu (700); z pasem partnerów niżej, żeby treść nie weszła na zdjęcie.
  const photoHeight = partnerBand ? 600 : 700;
  const top = photo ? photoHeight - 60 : 240;
  const bottom = bottomLimit(partnerBand);
  const base = photo ? 120 : 140;
  const vs = splitVs(headlineText);
  const { size, lineHeight } = vs
    ? headlineStyle(vs[0].length >= vs[1].length ? vs[0] : vs[1], base)
    : headlineStyle(headlineText, base);
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
