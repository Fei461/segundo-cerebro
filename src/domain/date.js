function pad(value) {
  return String(value).padStart(2, "0");
}

export function localDateKey(input = new Date()) {
  const date = input instanceof Date ? new Date(input) : new Date(input);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function parseLocalDateKey(dateKey) {
  const [year, month, day] = String(dateKey || "").split("-").map(Number);
  if (![year, month, day].every(Number.isFinite)) {
    return new Date(NaN);
  }
  return new Date(year, month - 1, day);
}

export function addDaysToDateKey(dateKey, days) {
  const date = parseLocalDateKey(dateKey);
  date.setDate(date.getDate() + Number(days || 0));
  return localDateKey(date);
}

export function weekStartKeyFromLocalDate(input = new Date()) {
  const date = input instanceof Date ? new Date(input) : parseLocalDateKey(input);
  const mondayOffset = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - mondayOffset);
  return localDateKey(date);
}

export function weekKeysFromLocalDate(input = new Date()) {
  const startKey = weekStartKeyFromLocalDate(input);
  return Array.from({ length: 7 }, (_, index) => addDaysToDateKey(startKey, index));
}
