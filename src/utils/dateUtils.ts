/**
 * Returns the local calendar date string in YYYY-MM-DD format.
 * Fixes the UTC `.toISOString().slice(0, 10)` bug so "practiced today"
 * always reflects the device's local timezone.
 */
export function getLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Checks whether an ISO timestamp string falls on the given local calendar date.
 */
export function isSameLocalDay(
  isoTimestamp: string | null | undefined,
  referenceDate: Date = new Date()
): boolean {
  if (!isoTimestamp) return false;
  const parsed = new Date(isoTimestamp);
  if (Number.isNaN(parsed.getTime())) {
    return isoTimestamp.startsWith(getLocalDateString(referenceDate));
  }
  return getLocalDateString(parsed) === getLocalDateString(referenceDate);
}
