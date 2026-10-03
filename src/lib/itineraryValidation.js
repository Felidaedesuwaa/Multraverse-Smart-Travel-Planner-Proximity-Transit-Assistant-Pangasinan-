export function itineraryErrors(form, { catalog, hotelRooms, budgetTier, today, step = 3, fareTables = [] }) {
  const errors = {};
  const area = catalog.find(a => a.id === form.areaId);
  const number = (key, value, min, max, whole, label) => {
    if (value == null || String(value).trim() === '') errors[key] = `Enter ${label.toLowerCase()}.`;
    else if (!Number.isFinite(Number(value)) || Number(value) < min || Number(value) > max || (whole && !Number.isInteger(Number(value)))) errors[key] = `${label} must be ${whole ? 'a whole number' : 'a number'} from ${min} to ${max}.`;
  };
  if (!area) errors.areaId = 'Choose a city or municipality.';
  for (const [key, label] of [['tripTypes', 'trip types'], ['activities', 'activities']]) {
    if (!form[key]?.length) errors[key] = `Choose at least one of the ${label}.`;
    else if (form[key].length > 3) errors[key] = `Choose up to 3 ${label}. Remove one before adding another.`;
  }
  if (!['solo', 'couple', 'family', 'barkada', 'group'].includes(form.travelerType)) errors.travelerType = 'Choose who you are traveling with.';
  if (!['relaxed', 'balanced', 'adventurous'].includes(form.travelStyle)) errors.travelStyle = 'Choose your travel style.';
  if (step < 2) return errors;
  if (!form.date) errors.date = 'Choose your travel date.';
  else if (!/^\d{4}-\d{2}-\d{2}$/.test(form.date) || !Number.isFinite(Date.parse(form.date)) || new Date(form.date).toISOString().slice(0, 10) !== form.date) errors.date = 'Enter a valid travel date.';
  else if (form.date < today) errors.date = 'Choose today or a future travel date.';
  number('travelers', form.travelers, 1, 30, true, 'Number of travelers');
  number('days', form.days, 1, 7, true, 'Trip length');
  if (!errors.travelers && form.travelerType === 'solo' && Number(form.travelers) !== 1) errors.travelers = 'Solo travel is for 1 person. Choose another group type for more travelers.';
  if (!errors.travelers && form.travelerType === 'couple' && Number(form.travelers) !== 2) errors.travelers = 'Couple travel is for 2 people. Update the group type or traveler count.';
  if (!errors.travelers && ['family', 'barkada', 'group'].includes(form.travelerType) && Number(form.travelers) < 2) errors.travelers = 'Enter at least 2 travelers for this group type.';
  number('budget', form.budget, 1, 1000000, false, 'Trip budget');
  if (!budgetTier) errors.budget = 'Choose your total trip budget.';
  if (form.lodgingId === '' || form.lodgingId === undefined) errors.lodgingId = 'Choose a hotel or select no lodging.';
  else if (form.lodgingId !== null && !area?.lodging.some(h => h.id === form.lodgingId && h.lodgingDetails?.overnight_supported !== false)) errors.lodgingId = 'Choose an available overnight hotel in your destination.';
  if (form.lodgingId && Number(form.days) === 1) errors.lodgingId = 'A day trip has no overnight stay. Select no lodging or choose at least 2 days.';
  if (form.lodgingId) number('hotelRooms', hotelRooms, 1, 30, true, 'Number of rooms');
  if (step < 3) return errors;
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(form.startTime || '')) errors.startTime = 'Choose a valid start time, such as 07:00.';
  number('mealBudget', form.mealBudget, 1, 10000, false, 'Daily meal allowance');
  if (!form.transportModes.length) errors.transportModes = 'Choose at least one way to travel.';
  for (const mode of form.transportModes) {
    const input = form.fareInputs.find(f => f.mode === mode);
    const key = `fare-${mode}`;
    if (!input) { errors[key] = `Enter a fare or travel allowance for ${mode}.`; continue; }
    number(key, input.rides, 1, 100, true, `${mode} rides`);
    if (errors[key]) continue;
    if (input.tableId) {
      const table = fareTables.find(t => t.id === input.tableId && t.mode === mode);
      if (!table?.rows.some(r => r.km === Number(input.km))) errors[key] = `Choose a listed distance for ${mode}.`;
      else if (mode === 'Tricycle' && form.areaId !== 'dagupan') errors[key] = 'Enter a local tricycle allowance. This fare table applies only to Dagupan.';

    } else if (mode === 'Bus' || mode === 'Jeepney' || (mode === 'Tricycle' && form.areaId === 'dagupan')) errors[key] = `Choose the supplied matrix and a billed distance for ${mode}.`;
    else number(key, input.allowance, 0, 10000, false, `${mode} allowance per person per ride`);
  }
  return errors;
}

export const itineraryErrorStep = key => ['areaId', 'tripTypes', 'activities', 'travelerType', 'travelStyle'].includes(key) ? 1 : ['date', 'travelers', 'days', 'budget', 'lodgingId', 'hotelRooms'].includes(key) ? 2 : 3;

export function itineraryFailureMessage(error, fallback) {
  if (error?.code === 'ITINERARY_SCHEMA_OUTDATED') return 'The itinerary database needs an update. Ask the administrator to run the itinerary schema migration.';
  if (error?.status === 401) return 'Please sign in again to continue.';
  if (error instanceof TypeError || error instanceof SyntaxError) return 'We could not reach the travel planner. Check your connection and try again.';
  if (error?.status >= 500) return 'The travel planner is temporarily unavailable. Please try again shortly.';
  return error?.message || fallback;
}
