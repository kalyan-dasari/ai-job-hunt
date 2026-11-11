/**
 * JobPilot AI — Temporal & Timezone Utility
 * 
 * Provides strict, deterministic date handling anchored to Asia/Kolkata (IST = UTC+05:30).
 * Used for:
 * - Daily scheduled execution (e.g. 7:00 AM IST)
 * - "Today" calculations in Asia/Kolkata timezone
 * - "Last 24 hours", "Last 7 days", "Last 30 days" timeframes
 * - Startup catch-up discovery triggers
 */

export const IST_TIMEZONE = 'Asia/Kolkata';
export const IST_OFFSET_MINUTES = 330; // UTC + 5h 30m
export const IST_OFFSET_MS = IST_OFFSET_MINUTES * 60 * 1000;

/**
 * Returns current timestamp in UTC ISO format (YYYY-MM-DDTHH:mm:ss.sssZ)
 */
export function getNowUtcIso(): string {
  return new Date().toISOString();
}

/**
 * Returns current Date adjusted to IST epoch
 */
export function getNowIstDate(): Date {
  return new Date(Date.now() + IST_OFFSET_MS);
}

/**
 * Returns the calendar date string in Asia/Kolkata (YYYY-MM-DD)
 */
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

/**
 * Returns the time string in Asia/Kolkata (HH:mm)
 */
export function getIstTimeString(isoOrDate?: string | Date | null): string {
  const d = isoOrDate ? new Date(isoOrDate) : new Date();
  if (isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: IST_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(d);
}

/**
 * Returns a human-friendly display date and time in Asia/Kolkata
 * e.g. "11 Nov 2026, 07:00 AM IST"
 */
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

/**
 * Checks if a given ISO timestamp occurred on the current calendar day in Asia/Kolkata
 */
export function isTodayIst(isoString?: string | null): boolean {
  if (!isoString) return false;
  const todayIst = getIstDateString();
  const targetIst = getIstDateString(isoString);
  return todayIst === targetIst;
}

/**
 * Checks if a given ISO timestamp is within the last N hours
 */
export function isWithinHours(isoString?: string | null, hours: number = 24): boolean {
  if (!isoString) return false;
  const t = new Date(isoString).getTime();
  if (isNaN(t)) return false;
  const now = Date.now();
  // Allow up to 1 minute of future clock drift
  return t <= (now + 60 * 1000) && (now - t) <= hours * 60 * 60 * 1000;
}

/**
 * Checks if a given ISO timestamp is within the last N days
 */
export function isWithinDays(isoString?: string | null, days: number = 7): boolean {
  return isWithinHours(isoString, days * 24);
}

/**
 * Parses "HH:mm" (e.g. "07:00") and computes the next scheduled ISO string in Asia/Kolkata.
 * If the scheduled time today has already passed, schedules for tomorrow at that time.
 * If intervalHours is provided and not 24 (e.g. 12), schedules after interval.
 */
export function computeNextRunAtIst(
  scheduleTimeIst: string = '07:00',
  intervalHours: number = 24,
  fromIso?: string
): string {
  const fromTime = fromIso ? new Date(fromIso).getTime() : Date.now();
  const [targetHourStr, targetMinStr] = (scheduleTimeIst || '07:00').split(':');
  const targetHour = Math.min(23, Math.max(0, parseInt(targetHourStr, 10) || 7));
  const targetMinute = Math.min(59, Math.max(0, parseInt(targetMinStr, 10) || 0));

  // Determine current calendar day in IST
  const todayIstStr = getIstDateString(new Date(fromTime)); // "YYYY-MM-DD"
  const [year, month, day] = todayIstStr.split('-').map(Number);

  // Construct target date for today in IST: YYYY-MM-DDTHH:mm:00.000+05:30
  const pad = (n: number) => String(n).padStart(2, '0');
  const candidateIso = `${year}-${pad(month)}-${pad(day)}T${pad(targetHour)}:${pad(targetMinute)}:00.000+05:30`;
  const candidateDate = new Date(candidateIso);

  if (intervalHours === 24) {
    if (candidateDate.getTime() > fromTime) {
      return candidateDate.toISOString();
    }
    // Already passed today, next run is tomorrow at targetHour:targetMinute IST
    const tomorrow = new Date(candidateDate.getTime() + 24 * 60 * 60 * 1000);
    return tomorrow.toISOString();
  }

  // Generic interval step
  let next = candidateDate.getTime();
  const stepMs = Math.max(1, intervalHours) * 60 * 60 * 1000;
  while (next <= fromTime) {
    next += stepMs;
  }
  return new Date(next).toISOString();
}

/**
 * Checks whether catch-up discovery should be triggered on startup:
 * returns true if lastSuccessfulRunAt is undefined, null, or older than 24 hours.
 */
export function isCatchUpNeeded(lastSuccessfulRunAt?: string | null, thresholdHours: number = 24): boolean {
  if (!lastSuccessfulRunAt) return true;
  const lastTime = new Date(lastSuccessfulRunAt).getTime();
  if (isNaN(lastTime)) return true;
  return (Date.now() - lastTime) >= thresholdHours * 60 * 60 * 1000;
}

