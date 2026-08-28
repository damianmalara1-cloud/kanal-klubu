import { TeamSelect } from './TeamSelect';
import type { FieldsProps } from './MeczFields';

export function TurniejFields({ values, set, teams }: FieldsProps) {
  return (
    <>
      <div className="field">
        <label htmlFor="name">Nazwa turnieju</label>
        <input id="name" required value={values.name ?? ''} onChange={(e) => set('name', e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="place">Miejsce</label>
        <input id="place" value={values.place ?? ''} onChange={(e) => set('place', e.target.value)} />
      </div>
      <TeamSelect value={values.team ?? ''} onChange={(v) => set('team', v)} teams={teams} required />
      <div className="field">
        <label htmlFor="result">Zajęte miejsce / wynik</label>
        <input id="result" value={values.result ?? ''} onChange={(e) => set('result', e.target.value)} placeholder="np. 2. miejsce" />
      </div>
      <div className="field">
        <label htmlFor="notes">Co warto powiedzieć</label>
        <textarea id="notes" value={values.notes ?? ''} onChange={(e) => set('notes', e.target.value)} />
      </div>
    </>
  );
}
