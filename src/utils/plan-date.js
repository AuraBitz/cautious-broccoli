const MS_PER_DAY = 1000 * 60 * 60 * 24;
const IST_OFFSET = '+05:30';

/** Current moment as ISO string with explicit IST offset (e.g. 2026-06-08T14:30:00+05:30) */
const toIstIsoTimestamp = (date = new Date()) => {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(date);

  const pick = (type) => parts.find((p) => p.type === type)?.value ?? '00';

  return `${pick('year')}-${pick('month')}-${pick('day')}T${pick('hour')}:${pick('minute')}:${pick('second')}${IST_OFFSET}`;
};

/** Midnight IST for a given instant — used for validity day counting */
const toIstMidnightUtcMs = (dateInput) => {
  const d = new Date(dateInput);
  const ymd = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
  return new Date(`${ymd}T00:00:00${IST_OFFSET}`).getTime();
};

const computeRemainDays = (planStartAt, planValidDays) => {
  if (!planStartAt || planValidDays == null) return null;

  const startMs = toIstMidnightUtcMs(planStartAt);
  const endMs = startMs + Number(planValidDays) * MS_PER_DAY;
  const todayMs = toIstMidnightUtcMs(new Date());

  const diffMs = endMs - todayMs;
  return Math.max(0, Math.ceil(diffMs / MS_PER_DAY));
};

module.exports = {
  toIstIsoTimestamp,
  computeRemainDays,
};
