import { Bus, Info } from 'lucide-react-native';

export default function ItineraryFareInputs({ modes, tables, values, onChange, areaId }) {
  const update = (mode, changes) => {
    const previous = values.find(v => v.mode === mode) || { mode, rides: 2 };
    onChange([...values.filter(v => v.mode !== mode), { ...previous, ...changes }]);
  };
  return <div className="aip-fare-inputs">
    <style>{`
      .aip-fare-inputs { margin:20px 0; }
      .aip-fare-inputs > p { font-size:12px; color:#5C6D7A; }
      .aip-fare-input { padding:16px; border:1px solid #E4E1D8; border-radius:12px; margin:12px 0; }
      .aip-fare-input h4 { display:flex; align-items:center; gap:8px; margin:0 0 12px; font-size:14px; }
      .aip-fare-fields { display:grid; grid-template-columns:repeat(auto-fit,minmax(min(100%,170px),1fr)); gap:12px; }
      .aip-fare-fields label { display:block; font-size:12px; color:#5C6D7A; }
      .aip-fare-fields input,.aip-fare-fields select { margin-top:5px; font-size:13px; min-height:44px; padding:10px; }
      .aip-fare-confirm { display:flex; align-items:flex-start; gap:8px; font-size:12px; margin-top:12px; }
      .aip-fare-scope { display:flex; gap:6px; font-size:11px; color:#795416; margin:12px 0 0; }
    `}</style>
    {!!modes.length && <p>Estimate fares per person. Enter total rides for the whole trip, including return rides. Use billed route distance, not straight-line distance.</p>}
    {modes.map(mode => {
      const v = values.find(x => x.mode === mode) || { rides: 2 };
      const options = tables.filter(t => t.mode === mode && (mode !== 'Tricycle' || areaId === 'alaminos'));
      const table = options.find(t => t.id === v.tableId);
      return <div className="aip-fare-input" key={mode}>
        <h4><Bus size={17} />{mode}</h4>
        <div className="aip-fare-fields">
          <label>Estimate basis<select className="aip-select" value={table?.id || ''} onChange={e => update(mode, { tableId: e.target.value || undefined, km: undefined, allowance: undefined, referenceAccepted: false })}>
            <option value="">My local allowance</option>{options.map(t => <option key={t.id} value={t.id}>{t.id.replaceAll('-', ' ')} matrix</option>)}
          </select></label>
          {table ? <label>Billed distance per ride<select className="aip-select" value={v.km ?? ''} onChange={e => update(mode, { km: e.target.value ? Number(e.target.value) : undefined })}><option value="">Select distance</option>{table.rows.map(row => <option key={row.km} value={row.km}>{row.km} km</option>)}</select></label> :
            <label>PHP / person / ride<input type="number" className="aip-input" min={0} max={10000} step="0.25" placeholder="Enter local allowance" value={v.allowance ?? ''} onChange={e => update(mode, { allowance: e.target.value === '' ? undefined : Number(e.target.value) })} /></label>}
          <label>Total rides / person<input className="aip-input" type="number" min={1} max={100} step={1} value={v.rides} onChange={e => update(mode, { rides: Math.min(100, Math.max(1, Math.floor(Number(e.target.value) || 1))) })} /></label>
        </div>
        {mode === 'Jeepney' && table && <label className="aip-fare-confirm"><input type="checkbox" checked={!!v.referenceAccepted} onChange={e => update(mode, { referenceAccepted: e.target.checked })} />Use the Mega Manila matrix as an estimate only; I will confirm the local fare.</label>}
        {(table || mode === 'Tricycle') && <p className="aip-fare-scope"><Info size={14} />{table?.scope || 'The supplied tricycle matrix covers Alaminos only. Enter a local per-person allowance for this destination.'}</p>}
        {mode === 'Own Vehicle' && <p className="aip-fare-scope">Divide the group fuel and toll allowance by travelers; use one ride for a whole-trip allowance.</p>}
      </div>;
    })}
  </div>;
}
