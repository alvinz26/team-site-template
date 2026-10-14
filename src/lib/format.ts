const DATE = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

/** 2026-10-05 → "5 October 2026" */
export const formatDate = (d: Date) => DATE.format(d);
