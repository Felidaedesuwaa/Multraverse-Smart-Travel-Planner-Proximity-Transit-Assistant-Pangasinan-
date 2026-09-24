// Values for money fields are stored in PHP, regardless of display currency.
export const plannerFieldSteps = { destinations: 1, date: 2, travelers: 2, budget: 2, days: 2, startTime: 3, foodPerPersonPerDay: 3, transportModes: 3, nightlyBudget: 3, rooms: 3 };
export function validatePlannerForm(form) {
  const errors = {};
  const number = (value, min, max, integer = false) => {
    if (value === null || value === undefined || String(value).trim() === '') return false;
    const n = Number(value);
    return Number.isFinite(n) && n >= min && n <= max && (!integer || Number.isInteger(n));
  };
  if (!form.destinations?.some(d => d.placeIds?.length)) errors.destinations = 'Select at least one attraction.';
  else if (form.destinations.length > 48 || form.destinations.some(d => d.placeIds.length > 30)) errors.destinations = 'Select up to 30 attractions per area and 48 areas.';
  if (!number(form.travelers, 1, 30, true)) errors.travelers = 'Enter a whole number from 1 to 30 travelers.';
  if (!number(form.days, 1, 7, true)) errors.days = 'Choose 1 to 7 days.';
  if (!number(form.budget, 1, 1000000)) errors.budget = 'Enter a total budget between PHP 1 and PHP 1,000,000 (or its equivalent).';
  const date = form.dates?.start;
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date) errors.date = 'Enter a real date in YYYY-MM-DD format, for example 2027-01-15.';
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(form.startTime || '') || form.startTime > '16:00') errors.startTime = 'Enter a start time from 00:00 to 16:00, for example 08:00.';
  if (!number(form.foodPerPersonPerDay, 0, 10000)) errors.foodPerPersonPerDay = 'Enter a daily meal allowance from PHP 0 to PHP 10,000 (or its equivalent).';
  if (!form.transportModes?.length || form.transportModes.some(mode => !['bus', 'jeepney', 'tricycle', 'van', 'own-vehicle'].includes(mode))) errors.transportModes = 'Select at least one transport mode.';
  if (Number(form.days) > 1 && form.lodging?.preference !== 'none') {
    if (!number(form.lodging?.nightlyBudget, 0, 100000)) errors.nightlyBudget = 'Enter a nightly room budget from PHP 0 to PHP 100,000 (or its equivalent).';
    if (!number(form.lodging?.rooms, 1, 30, true)) errors.rooms = 'Enter a whole number from 1 to 30 rooms.';
  }
  return errors;
}
