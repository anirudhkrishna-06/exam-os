const configured = (name: string, fallback: number) => {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
};

export const CACHE_TTL = {
  preferences: configured('REDIS_TTL_PREFERENCES', 300),
  seasons: configured('REDIS_TTL_SEASONS', 120),
  subjects: configured('REDIS_TTL_SUBJECTS', 180),
  units: configured('REDIS_TTL_UNITS', 300),
  dashboard: configured('REDIS_TTL_DASHBOARD', 30),
  calendar: configured('REDIS_TTL_CALENDAR', 30),
  progress: configured('REDIS_TTL_PROGRESS', 30),
  revision: configured('REDIS_TTL_REVISION', 30),
  knowledge: configured('REDIS_TTL_KNOWLEDGE', 30),
};
