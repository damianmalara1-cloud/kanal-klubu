import { TeamSelect } from './TeamSelect';
import type { FieldsProps } from './MeczFields';

export function SukcesFields({ values, set, teams }: FieldsProps) {
  return (
    <>
      {[0, 1, 2].map((i) => (
        <div className="field" key={i}>
          <label htmlFor={`name${i}`}>{i === 0 ? 'Imię i nazwisko' : `Imię i nazwisko ${i + 1}`}</label>
          <input id={`name${i}`} required={i === 0} value={values[`name${i}`] ?? ''} onChange={(e) => set(`name${i}`, e.target.value)} />
        </div>
      ))}
      <div className="field">
        <label htmlFor="kind">Co się wydarzyło</label>
        <select id="kind" value={values.kind ?? 'kadra'} onChange={(e) => set('kind', e.target.value)}>
          <option value="kadra">powołanie do kadry</option>
          <option value="medal">medal</option>
          <option value="wyroznienie">wyróżnienie</option>
          <option value="inne">inne</option>
        </select>
      </div>
      <TeamSelect value={values.team ?? ''} onChange={(v) => set('team', v)} teams={teams} required />
      <div className="field">
        <label htmlFor="details">Szczegóły</label>
        <textarea id="details" value={values.details ?? ''} onChange={(e) => set('details', e.target.value)} placeholder="Gdzie, kiedy, za co" />
      </div>
    </>
  );
}
