import { TeamSelect } from './TeamSelect';

export type FieldsProps = { values: Record<string, string>; set: (k: string, v: string) => void; teams: string[] };

export function MeczFields({ values, set, teams }: FieldsProps) {
  return (
    <>
      <TeamSelect value={values.team ?? ''} onChange={(v) => set('team', v)} teams={teams} required />
      <div className="field">
        <label htmlFor="opponent">Rywal</label>
        <input id="opponent" required value={values.opponent ?? ''} onChange={(e) => set('opponent', e.target.value)} placeholder="np. Sokół Gdańsk" />
      </div>
      <div className="row">
        <div className="field">
          <label htmlFor="scoreHome">Bramki UKS Banino</label>
          <input id="scoreHome" type="number" inputMode="numeric" min={0} max={199} required value={values.scoreHome ?? ''} onChange={(e) => set('scoreHome', e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="scoreAway">Bramki rywala</label>
          <input id="scoreAway" type="number" inputMode="numeric" min={0} max={199} required value={values.scoreAway ?? ''} onChange={(e) => set('scoreAway', e.target.value)} />
        </div>
      </div>
      <div className="field">
        <label htmlFor="venue">Gdzie</label>
        <select id="venue" value={values.venue ?? 'dom'} onChange={(e) => set('venue', e.target.value)}>
          <option value="dom">u siebie (Banino)</option>
          <option value="wyjazd">wyjazd</option>
        </select>
      </div>
      {values.venue === 'wyjazd' && (
        <div className="field">
          <label htmlFor="venueCity">Miejscowość (wyjazd)</label>
          <input id="venueCity" value={values.venueCity ?? ''} onChange={(e) => set('venueCity', e.target.value)} />
        </div>
      )}
      <div className="field">
        <label htmlFor="notes">Co warto powiedzieć</label>
        <textarea id="notes" value={values.notes ?? ''} onChange={(e) => set('notes', e.target.value)} placeholder="Kto błysnął, jak szło, kto był na trybunach — opcjonalnie" />
      </div>
    </>
  );
}
