/**
 * BatchScan Date Normalizer & Shelf-Life Standardizer
 * Formats all packaging dates strictly into "12 Nov 2026" style.
 */

const MONTH_NAMES_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

const MONTH_MAP = {
  jan: 1, january: 1,
  feb: 2, february: 2,
  mar: 3, march: 3,
  apr: 4, april: 4,
  may: 5,
  jun: 6, june: 6,
  jul: 7, july: 7,
  aug: 8, august: 8,
  sep: 9, sept: 9, september: 9,
  oct: 10, october: 10,
  nov: 11, november: 11,
  dec: 12, december: 12
};

/**
 * Parses mixed date strings (DD/MM/YYYY, DD-MM-YY, DD.MM.YYYY, JAN 2027, etc.)
 * Returns a valid JS Date object normalized to midnight UTC or null.
 */
export function parseDateSafe(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const s = dateStr.trim();
  if (['N/A', 'UNKNOWN', '-', 'NONE', 'NULL'].includes(s.toUpperCase())) return null;

  // 1. Check textual month pattern: e.g. "15-OCT-26", "OCT 2026", "15 OCT 2026"
  const textMonthMatch = s.match(/(\d{1,2})?[\s\-\/\.]*([a-zA-Z]{3,9})[\s\-\/\.]*(\d{2,4})/);
  if (textMonthMatch) {
    const rawDay = textMonthMatch[1];
    const mStr = textMonthMatch[2].toLowerCase();
    const rawYear = textMonthMatch[3];
    const month = MONTH_MAP[mStr];

    if (month) {
      let year = parseInt(rawYear, 10);
      if (year < 100) year += year < 70 ? 2000 : 1900;
      let day = rawDay ? parseInt(rawDay, 10) : 1;
      if (day < 1) day = 1;
      if (day > 31) day = 31;
      return new Date(Date.UTC(year, month - 1, day));
    }
  }

  // 2. ISO timestamp pattern: 2026-11-09T...
  if (s.includes('T')) {
    const d = new Date(s);
    if (!isNaN(d.getTime())) return d;
  }

  // 3. Numeric delimiters: DD/MM/YYYY, MM/YYYY, DD-MM-YYYY, YYYY-MM-DD
  const cleanNum = s.replace(/[^\d\/\-\.]/g, '');
  const parts = cleanNum.split(/[\/\-\.]/).filter(Boolean);

  if (parts.length === 3) {
    // Check if YYYY-MM-DD
    if (parts[0].length === 4) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10);
      const day = parseInt(parts[2], 10);
      if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
        return new Date(Date.UTC(year, month - 1, day));
      }
    }

    // Default DD/MM/YY or DD/MM/YYYY (Indian/European standard on Indian FMCG labels)
    let day = parseInt(parts[0], 10);
    let month = parseInt(parts[1], 10);
    let year = parseInt(parts[2], 10);

    // If month > 12 but day <= 12, swap (MM/DD/YYYY)
    if (day > 12 && month <= 12) {
      // standard DD/MM
    } else if (month > 12 && day <= 12) {
      const temp = day;
      day = month;
      month = temp;
    }

    if (year < 100) year += year < 70 ? 2000 : 1900;
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return new Date(Date.UTC(year, month - 1, day));
    }
  } else if (parts.length === 2) {
    // MM/YY or MM/YYYY
    let month = parseInt(parts[0], 10);
    let year = parseInt(parts[1], 10);
    if (month > 12 && year <= 12) {
      const temp = month;
      month = year;
      year = temp;
    }
    if (year < 100) year += year < 70 ? 2000 : 1900;
    if (month >= 1 && month <= 12) {
      // Set to last day of the month for expiry validity
      const lastDay = new Date(year, month, 0).getDate();
      return new Date(Date.UTC(year, month - 1, lastDay));
    }
  }

  // Fallback native parse
  const fallback = new Date(s);
  return isNaN(fallback.getTime()) ? null : fallback;
}

/**
 * Formats any date safely into the standardized "12 Nov 2026" string.
 * If includeTime is true and date has time, appends " · 02:30 PM".
 */
export function formatDateStandard(dateInput, includeTime = false) {
  if (!dateInput) return '-';

  let dateObj = null;
  if (dateInput instanceof Date) {
    dateObj = dateInput;
  } else {
    dateObj = parseDateSafe(String(dateInput));
  }

  if (!dateObj || isNaN(dateObj.getTime())) {
    return String(dateInput); // Return raw if unparseable
  }

  const day = String(dateObj.getUTCDate()).padStart(2, '0');
  const month = MONTH_NAMES_SHORT[dateObj.getUTCMonth()];
  const year = dateObj.getUTCFullYear();

  let formatted = `${day} ${month} ${year}`;

  if (includeTime) {
    let hours = dateObj.getHours();
    const minutes = String(dateObj.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    formatted += ` · ${hours}:${minutes} ${ampm}`;
  }

  return formatted;
}

/**
 * Calculates days left from right now to midnight of expiry date.
 */
export function calculateDaysLeft(expDateStr) {
  const exp = parseDateSafe(expDateStr);
  if (!exp) return null;

  const now = new Date();
  const todayUtc = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const expUtc = Date.UTC(exp.getUTCFullYear(), exp.getUTCMonth(), exp.getUTCDate());

  return Math.round((expUtc - todayUtc) / (1000 * 60 * 60 * 24));
}

