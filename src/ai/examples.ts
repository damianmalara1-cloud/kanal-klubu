import type { PostType } from '@/domain/types';

export interface Example {
  type: PostType;
  input: string;
  output: string;
}

export const EXAMPLES: Example[] = [
  {
    type: 'mecz',
    input: 'Typ: mecz. Drużyna: młodziczki (2011+). Rywal: SPR Wybrzeże II Gdańsk. Wynik: UKS Banino 32 : 21. U siebie, hala SP1. Uwagi: Zuzanna Kowalska 8 bramek, Julia Nowak obroniła dwa karne, pełne trybuny.',
    output: `32 bramki. Najlepszy mecz sezonu.

UKS Banino 32 : 21 SPR Wybrzeże II Gdańsk

Młodziczki wyszły na parkiet hali SP1 skupione od pierwszej minuty. Piłka chodziła szybko, obrona trzymała się blisko, a każda akcja miała cel. Wybrzeże walczyło do końca — to zespół, z którym zawsze gra się trudno.

Osiem bramek Zuzanny Kowalskiej, w tym trzy w ostatnich pięciu minutach. Julia Nowak w bramce zatrzymała dwa rzuty karne.

Dziękujemy rodzicom i kibicom za trybuny. Wasz doping było słychać w każdej akcji.

Pracujemy dalej. Krok po kroku. 🫡`,
  },
  {
    type: 'sukces',
    input: 'Typ: sukces (kadra). Kto: Zuzanna Kowalska. Drużyna: młodziczki (2011+). Szczegóły: powołanie na zgrupowanie kadry Polski juniorek młodszych, 12–19.04, Płock; w klubie od 2019, zaczynała w grupie naborowej.',
    output: `Zuzanna Kowalska w kadrze Polski juniorek młodszych.

Nasza rozgrywająca dostała powołanie na zgrupowanie kadry narodowej. Od poniedziałku trenuje w Płocku z najlepszymi zawodniczkami rocznika 2011 w kraju.

Zuzanna gra w UKS Banino od 2019 roku. Zaczynała w grupie naborowej na hali SP2. Jej powołanie nie spadło z księżyca — to sześć lat treningów, turniejów i pracy w każdy wtorek i czwartek.

Dla klubu to sygnał, że droga, którą wybraliśmy, ma sens.

Trzymamy kciuki, Zuzanna. 🫡

12–19.04 · zgrupowanie kadry · Płock`,
  },
  {
    type: 'ogloszenie',
    input: 'Typ: ogłoszenie. Tytuł: Mecz u siebie z MKS Kwidzyn. Treść: sobota 14.03, 11:00, hala SP1, liga wojewódzka młodzików, wstęp wolny, dwa wygrane mecze z rzędu. Drużyna: młodzicy (2011+).',
    output: `W sobotę gramy u siebie.

UKS Banino podejmuje MKS Kwidzyn w lidze wojewódzkiej młodzików. Początek o 11:00 w hali SP1.

Chłopcy mają za sobą dwa wygrane mecze z rzędu. Kwidzyn to zespół, który gra twardo i nie odpuszcza do końca — będzie o co walczyć.

Wstęp wolny. Przyjdźcie z całą rodziną — im głośniej na trybunach, tym łatwiej na parkiecie.

sob. 14.03 · 11:00 · hala SP1 Banino · UKS Banino – MKS Kwidzyn`,
  },
];
