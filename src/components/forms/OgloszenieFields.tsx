import { TeamSelect } from './TeamSelect';
import type { FieldsProps } from './MeczFields';

export function OgloszenieFields({ values, set, teams }: FieldsProps) {
  return (
    <>
      <div className="field">
        <label htmlFor="title">Tytuł</label>
        <input id="title" required value={values.title ?? ''} onChange={(e) => set('title', e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="body">Treść</label>
        <textarea id="body" required value={values.body ?? ''} onChange={(e) => set('body', e.target.value)} placeholder="Co, kiedy, gdzie, dla kogo" />
      </div>
      <TeamSelect value={values.team ?? ''} onChange={(v) => set('team', v)} teams={teams} allowAll />
      <div className="row">
        <div className="field">
          <label htmlFor="date">Data</label>
          <input id="date" value={values.date ?? ''} onChange={(e) => set('date', e.target.value)} placeholder="sob. 14.03" />
        </div>
        <div className="field">
          <label htmlFor="time">Godzina</label>
          <input id="time" value={values.time ?? ''} onChange={(e) => set('time', e.target.value)} placeholder="11:00" />
        </div>
      </div>
      <div className="field">
        <label htmlFor="place">Miejsce</label>
        <input id="place" value={values.place ?? ''} onChange={(e) => set('place', e.target.value)} placeholder="hala SP1 Banino" />
      </div>
    </>
  );
}
