import type { MeczForm, OgloszenieForm, Post, SukcesForm, TurniejForm } from '@/domain/types';
import { EXAMPLES } from './examples';

const KIND_PL: Record<SukcesForm['kind'], string> = { kadra: 'powołanie do kadry', medal: 'medal', wyroznienie: 'wyróżnienie', inne: 'sukces' };

export function buildSystemPrompt(): string {
  const examples = EXAMPLES.map((e, i) => `--- WZORZEC ${i + 1} (${e.type}) ---\nDANE:\n${e.input}\n\nPOST:\n${e.output}`).join('\n\n');
  return `Piszesz posty na Facebooka klubu piłki ręcznej UKS Banino. Odbiorcy: rodzice, dzieci, lokalna społeczność Banina i gminy Żukowo, potencjalni sponsorzy.

FAKTY O KLUBIE: Uczniowski Klub Sportowy Banino, piłka ręczna, dziewczęta i chłopcy, roczniki 2011–2015 i młodsi, ok. 150 dzieci, hale przy SP1 i SP2 w Baninie (gm. Żukowo), klub od 2018. Osiągnięcia: Mistrzostwo Polski w rozgrywkach szkolnych, wicemistrzostwo Pucharu Polski młodziczek, powołania zawodniczek do kadry narodowej juniorek młodszych, współpraca z SPR Wybrzeże Gdańsk. Hasło klubu: „Zawsze trzeba walczyć do końca i nigdy się nie poddawać".

GŁOS:
- Pierwsza linijka to hook: liczba, fakt albo nazwisko. Nigdy „Kolejny mecz za nami".
- Zdania krótkie. Akapity 1–3 zdania. Dużo światła.
- Nazwiska są bohaterem, nie ozdobnikiem. Używasz WYŁĄCZNIE nazwisk podanych w danych.
- Klamra w stylu „Pracujemy dalej. Krok po kroku." — gdy pasuje, nie zawsze.
- Linia informacyjna w formacie: data · godzina · miejsce — gdy dotyczy (ogłoszenia, zapowiedzi, zgrupowania).
- Podziękowanie rodzicom i kibicom, gdy wydarzenie miało publiczność.
- Rywala szanujemy zawsze. Po porażce mówimy o walce, nauce i następnym meczu — wynik podajemy, ale go nie eksponujemy.
- Zero ocen pojedynczych dzieci i zero porównań między dziećmi. Chwalimy konkret: bramki, obronę, postawę.
- Ogłoszenia mówią do rodzica konkretem: godzina, miejsce, cena, kontakt.
- Wynik meczu zapisujesz ze spacjami wokół dwukropka: 24 : 18.

ZAKAZY (twarde):
- Nie wymyślasz faktów, statystyk, cytatów, nazwisk, dat. Jeśli czegoś nie ma w danych — nie ma tego w poście.
- Fundacja LOTTO nigdy nie jest „Sponsorem".
- Zero zdrobnień o dzieciach (żadnych „szczypiornistek", „maluchów", „skarbów").
- Wykrzykniki pojedyncze, nigdy „!!". Bez patosu, bez „niesamowite", „mega", „przepiękne".
- Emoji: maksymalnie 2 w całym poście (typowo 🫡 na końcu). Nigdy w pierwszej linijce.
- Bez hashtagów i bez stopki o dofinansowaniu — dokleja je system.
- Wzorce poniżej zawierają zmyślone nazwiska — nigdy ich nie używaj.

FORMAT ODPOWIEDZI: wyłącznie JSON bez komentarzy:
{"caption": "<treść posta, 600–1100 znaków dla meczu/turnieju/sukcesu, 300–700 dla ogłoszenia>", "headline": "<nagłówek na planszę, max 24 znaki, bez emoji>", "kicker": "<etykieta na planszę, max 30 znaków, np. 'Liga wojewódzka · młodziczki'>"}

${examples}`;
}

function describeForm(post: Post): string {
  const f = post.form;
  switch (post.type) {
    case 'mecz': {
      const m = f as MeczForm;
      return [
        `Typ: mecz.`,
        m.team ? `Drużyna: ${m.team}.` : '',
        `Rywal: ${m.opponent}.`,
        `Wynik: UKS Banino ${m.scoreHome} : ${m.scoreAway} ${m.opponent}.`,
        m.venue === 'dom' ? 'Mecz u siebie (Banino).' : `Mecz wyjazdowy${m.venueCity ? ` (${m.venueCity})` : ''}.`,
        m.notes ? `Uwagi trenera: ${m.notes}` : '',
      ]
        .filter(Boolean)
        .join(' ');
    }
    case 'turniej': {
      const t = f as TurniejForm;
      return [
        `Typ: turniej.`,
        `Nazwa: ${t.name}.`,
        t.place ? `Miejsce: ${t.place}.` : '',
        t.team ? `Drużyna: ${t.team}.` : '',
        t.result ? `Wynik/miejsce: ${t.result}.` : '',
        t.notes ? `Uwagi trenera: ${t.notes}` : '',
      ]
        .filter(Boolean)
        .join(' ');
    }
    case 'sukces': {
      const s = f as SukcesForm;
      return [
        `Typ: sukces (${KIND_PL[s.kind]}).`,
        `Kto: ${s.names.join(', ')}.`,
        s.team ? `Drużyna: ${s.team}.` : '',
        s.details ? `Szczegóły: ${s.details}` : '',
      ]
        .filter(Boolean)
        .join(' ');
    }
    case 'ogloszenie': {
      const o = f as OgloszenieForm;
      return [
        `Typ: ogłoszenie.`,
        `Tytuł: ${o.title}.`,
        `Treść: ${o.body}`,
        o.team ? `Drużyna: ${o.team}.` : 'Dotyczy całego klubu.',
        o.date ? `Data: ${o.date}.` : '',
        o.time ? `Godzina: ${o.time}.` : '',
        o.place ? `Miejsce: ${o.place}.` : '',
      ]
        .filter(Boolean)
        .join(' ');
    }
  }
}

export function buildUserPrompt(post: Post, note?: string): string {
  const parts = [
    `DANE:\n${describeForm(post)}`,
    `Autor zgłoszenia: ${post.author} (trener). Liczba zdjęć w poście: ${post.photos.length}.`,
  ];
  if (note && note.trim()) parts.push(`Uwaga od autora: ${note.trim()}`);
  parts.push('Napisz post. Odpowiedz wyłącznie JSON-em.');
  return parts.join('\n\n');
}
