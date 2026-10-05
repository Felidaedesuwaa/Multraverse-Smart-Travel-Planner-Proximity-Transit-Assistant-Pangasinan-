import { View } from 'react-native';
import { calculateTransport } from '../../server/src/lib/fareCalculation';
import { Card, Copy, Field, Select, money } from './planner/NativeItineraryUI';

export default function ItineraryFareInputs({ modes, tables, values, onChange, areaId, date, travelers = 1, errors = {} }) {
  const update = (mode, changes) => {
    const previous = values.find(value => value.mode === mode) || { mode, rides: 2 };
    onChange([...values.filter(value => value.mode !== mode), { ...previous, ...changes }]);
  };
  return <View style={{ gap: 14 }}>
    {!!modes.length && <Copy muted>Choose kilometers per ride and total rides for the whole trip, including return rides.</Copy>}
    {modes.map(mode => {
      const value = values.find(item => item.mode === mode) || { rides: 2 };
      const options = tables.filter(table => table.mode === mode && (mode !== 'Tricycle' || areaId === 'dagupan'));
      const table = options.find(item => item.id === value.tableId) || (!value.tableId ? options[0] : undefined);
      const row = table?.rows.find(item => item.km === value.km);
      const selected = { ...value, mode, tableId: table?.id, allowance: table ? undefined : value.allowance };
      const pricing = calculateTransport({ areaId, date, travelers, transportModes: [mode], fareInputs: [selected] }, tables)[0];
      return <Card key={mode}>
        <Copy heading>{mode}</Copy>
        {options.length > 0 ? <Select label={`${mode} fare matrix`} value={table?.id} options={options.map(item => ({ id: item.id, label: `${item.id.replaceAll('-', ' ')} matrix` }))} onChange={tableId => update(mode, { tableId, km: undefined, allowance: undefined, referenceAccepted: false })} /> : <Copy muted>My local allowance</Copy>}
        {table ? <Select label={`${mode} distance per ride (km)`} value={value.km} options={table.rows.map(item => ({ id: item.km, label: `${item.km} km` }))} onChange={km => update(mode, { tableId: table.id, km, allowance: undefined })} /> : <Field label={`${mode} PHP / person / ride`} numeric value={value.allowance} placeholder="Enter local allowance" onChange={allowance => update(mode, { allowance: allowance === '' ? undefined : Number(allowance) })} />}
        <Field label={`${mode} total rides / person`} numeric value={value.rides} onChange={rides => update(mode, { rides: rides === '' ? '' : Number(rides) })} error={errors[`fare-${mode}`]} />
        {!!row && <Copy>{pricing.perRide == null ? 'This matrix is not effective for the selected date.' : `${money(pricing.perRide)} / person / ride | ${money(pricing.total)} for ${travelers} travelers, ${value.rides} rides`}</Copy>}
        {row?.discounted != null && pricing.perRide != null && <Copy muted>Student / senior / PWD: {money(row.discounted)} with valid ID. Trip totals use regular fares.</Copy>}
        {mode === 'Tricycle' && <Copy muted>{table?.scope || 'The supplied matrix covers Dagupan shared rides only. Enter a local per-person allowance here.'}</Copy>}
        {mode === 'Own Vehicle' && <Copy muted>Divide group fuel and toll costs by travelers; use one ride for a whole-trip allowance.</Copy>}
      </Card>;
    })}
  </View>;
}
