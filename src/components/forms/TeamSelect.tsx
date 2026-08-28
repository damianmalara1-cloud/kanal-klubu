export function TeamSelect({ value, onChange, teams, allowAll = false, id = 'team' }: { value: string; onChange: (v: string) => void; teams: string[]; allowAll?: boolean; id?: string }) {
  return (
    <div className="field">
      <label htmlFor={id}>Drużyna</label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">{allowAll ? 'cały klub' : '— wybierz —'}</option>
        {teams.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>
    </div>
  );
}
