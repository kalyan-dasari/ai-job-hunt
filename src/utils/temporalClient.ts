export const IST_TIMEZONE = 'Asia/Kolkata';

export function getIstDateString(isoOrDate?: string | Date | null): string {
  const d = isoOrDate ? new Date(isoOrDate) : new Date();
  if (isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: IST_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

export function formatIstDateTime(isoOrDate?: string | Date | null): string {
  if (!isoOrDate) return 'Never';
  const d = new Date(isoOrDate);
  if (isNaN(d.getTime())) return 'Invalid date';

  const datePart = new Intl.DateTimeFormat('en-GB', {
    timeZone: IST_TIMEZONE,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(d);

  const timePart = new Intl.DateTimeFormat('en-US', {
    timeZone: IST_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(d);

  return `${datePart}, ${timePart} IST`;
}

export function isTodayIst(isoString?: string | null): boolean {
  if (!isoString) return false;
  const todayIst = getIstDateString();
  const targetIst = getIstDateString(isoString);
  return todayIst === targetIst;
}

export function isWithinHours(isoString?: string | null, hours: number = 24): boolean {
  if (!isoString) return false;
  const t = new Date(isoString).getTime();
  if (isNaN(t)) return false;
  const now = Date.now();
  return t <= now + 60 * 1000 && now - t <= hours * 60 * 60 * 1000;
}

export function isWithinDays(isoString?: string | null, days: number = 7): boolean {
  return isWithinHours(isoString, days * 24);
}

