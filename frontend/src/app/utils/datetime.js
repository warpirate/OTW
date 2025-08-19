// Shared date-time utilities for converting backend UTC strings to local time
// Supports backend format 'YYYY-MM-DD HH:mm:ss' (UTC) and ISO strings

export function parseUTCString(dateTimeString) {
  if (!dateTimeString) return null;
  try {
    // If it's already ISO with timezone, let Date parse it
    if (dateTimeString.includes('Z') || /[+-]\d\d:?\d\d$/.test(dateTimeString)) {
      return new Date(dateTimeString);
    }
    // Convert 'YYYY-MM-DD HH:mm:ss' to ISO UTC by adding 'T' and 'Z'
    const iso = dateTimeString.replace(' ', 'T');
    return new Date(`${iso}Z`);
  } catch (e) {
    return null;
  }
}

export function formatUTCToLocal(dateTimeString, options = {}) {
  const date = parseUTCString(dateTimeString);
  if (!date || isNaN(date.getTime())) return 'Invalid date';
  const defaultOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  };
  return date.toLocaleString('en-IN', { ...defaultOptions, ...options });
}

export function formatUTCDate(dateTimeString, options = {}) {
  const date = parseUTCString(dateTimeString);
  if (!date || isNaN(date.getTime())) return 'Invalid date';
  const defaultOptions = { year: 'numeric', month: 'short', day: 'numeric' };
  return date.toLocaleDateString('en-IN', { ...defaultOptions, ...options });
}

export function formatUTCTime(dateTimeString, options = {}) {
  const date = parseUTCString(dateTimeString);
  if (!date || isNaN(date.getTime())) return 'Invalid time';
  const defaultOptions = { hour: '2-digit', minute: '2-digit' };
  return date.toLocaleTimeString('en-IN', { ...defaultOptions, ...options });
}

// ISO-like local date string (YYYY-MM-DD) using en-CA locale
export function formatUTCDateISO(dateTimeString) {
  const date = parseUTCString(dateTimeString);
  if (!date || isNaN(date.getTime())) return 'Invalid date';
  return date.toLocaleDateString('en-CA');
}
