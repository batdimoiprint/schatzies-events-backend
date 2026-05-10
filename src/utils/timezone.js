/**
 * Timezone utility for Schatzies Events Backend.
 *
 * All timestamps are generated in Philippine Standard Time (PST, UTC+8).
 * This ensures consistent date/time values across the application regardless
 * of the server's system timezone (e.g. AWS Lambda uses UTC).
 */

const PH_OFFSET_MS = 8 * 60 * 60 * 1000; // UTC+8

/**
 * Get current date/time adjusted to Philippine Standard Time and return as ISO string.
 *
 * The returned string is in ISO 8601 format (YYYY-MM-DDTHH:mm:ss.sssZ) but the
 * actual time values represent Philippine local time, not UTC.
 *
 * @returns {string} ISO 8601 timestamp in Philippine time
 */
export function nowPH() {
  const now = new Date();
  const phTime = new Date(now.getTime() + PH_OFFSET_MS);
  return phTime.toISOString();
}

/**
 * Convert any date value to Philippine time ISO string.
 *
 * @param {string|Date|number} dateInput - A date string, Date object, or epoch ms
 * @returns {string} ISO 8601 timestamp in Philippine time
 */
export function toPH(dateInput) {
  const date = new Date(dateInput);
  const phTime = new Date(date.getTime() + PH_OFFSET_MS);
  return phTime.toISOString();
}

/**
 * Get the Philippine date key (YYYY-MM-DD) for the current time.
 *
 * @returns {string} Date in YYYY-MM-DD format
 */
export function todayPH() {
  return nowPH().slice(0, 10);
}
