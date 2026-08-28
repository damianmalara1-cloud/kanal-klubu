import { mkdirSync, writeFileSync } from 'node:fs';
import sharp from 'sharp';
import { renderCreative } from '../src/creative';
import type { Post } from '../src/domain/types';

const base: Omit<Post, 'type' | 'form' | 'headline' | 'kicker'> = {
  id: 's',
  createdAt: '',
  updatedAt: '',
  author: 'Ania',
  photos: [],
  heroPhoto: null,
  captionAi: null,
  caption: null,
  creativePath: null,
  regenCount: 0,
  factWarning: null,
  partnerInfo: true,
  status: 'draft',
  purgeAfter: null,
  purgedAt: null,
  ip: null,
};

// partnerBand tylko dla drużyn objętych programem KLUB PRO (młodzicy/młodziczki) — reszta bez stopki Fundacji.
const samples: Array<{ post: Post; partnerBand: boolean }> = [
  {
    partnerBand: true,
    post: {
      ...base,
      type: 'mecz',
      kicker: 'Liga wojewódzka · młodziczki',
      headline: '24 : 18',
      form: {
        team: 'młodziczki (2011+)',
        opponent: 'SPR Wybrzeże II Gdańsk',
        scoreHome: 24,
        scoreAway: 18,
        venue: 'dom',
        venueCity: null,
        notes: null,
      },
    },
  },
  {
    partnerBand: true,
    post: {
      ...base,
      type: 'turniej',
      kicker: 'Kaszubski Turniej · VII edycja',
      headline: '2. MIEJSCE',
      form: {
        name: 'Kaszubski Turniej Piłki Ręcznej',
        place: 'Banino',
        team: 'młodzicy (2011+)',
        result: '2. miejsce',
        notes: null,
      },
    },
  },
  {
    partnerBand: true,
    post: {
      ...base,
      type: 'sukces',
      kicker: 'Powołanie · kadra Polski',
      headline: 'POWOŁANIE DO KADRY',
      form: {
        names: ['Żaneta Ćwikła', 'Zuzanna Kowalska'],
        kind: 'kadra',
        team: 'młodziczki (2011+)',
        details: 'Zgrupowanie kadry juniorek młodszych, 12–19 kwietnia, Płock.',
      },
    },
  },
  {
    partnerBand: false,
    post: {
      ...base,
      type: 'ogloszenie',
      kicker: 'Nabór 2026/27',
      headline: 'ZACZNIJ GRAĆ W BANINIE',
      form: {
        title: 'Nabór',
        body: 'Zapraszamy dzieci i młodzież na treningi piłki ręcznej w Baninie — pierwsze zajęcia bez zobowiązań.',
        team: null,
        date: 'wtorki i czwartki',
        time: '17:00 – 18:30',
        place: 'hala SP2 Banino',
      },
    },
  },
];

async function main() {
  mkdirSync('samples', { recursive: true });
  const photo = await sharp({
    create: {
      width: 1600,
      height: 1200,
      channels: 3,
      background: { r: 130, g: 130, b: 130 },
      noise: { type: 'gaussian', mean: 128, sigma: 60 },
    },
  })
    .jpeg()
    .toBuffer();

  for (const { post, partnerBand } of samples) {
    for (const withPhoto of [false, true]) {
      const png = await renderCreative(post, withPhoto ? photo : null, { partnerBand });
      writeFileSync(`samples/${post.type}-${withPhoto ? 'foto' : 'typo'}.png`, png);
    }
  }
  console.log('samples/ gotowe — 8 plików PNG');
}

main();
