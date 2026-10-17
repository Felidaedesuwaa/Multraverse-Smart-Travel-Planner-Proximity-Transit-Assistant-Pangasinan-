// Monthly balances follow the travel planner's Philippine calendar.
export function monthlyExpenses(entries, now = new Date()) {
  const monthKey = value => new Date(value).toLocaleDateString('en-CA', { year: 'numeric', month: '2-digit', timeZone: 'Asia/Manila' });
  const currentMonth = monthKey(now);
  return entries.filter(entry => {
    const date = new Date(entry.createdAt || entry.date);
    return Number.isFinite(date.getTime()) && monthKey(date) === currentMonth;
  });
}
