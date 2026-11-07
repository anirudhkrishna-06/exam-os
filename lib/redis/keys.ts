const prefix = (userId: string) => `examos:${userId}`;

export const redisKeys = {
  preferences: (userId: string) => `${prefix(userId)}:preferences`,
  scheduleSlots: (userId: string) => `${prefix(userId)}:schedule-slots`,
  seasons: (userId: string) => `${prefix(userId)}:seasons`,
  season: (userId: string, seasonId: string) => `${prefix(userId)}:season:${seasonId}`,
  subjects: (userId: string, seasonId: string) => `${prefix(userId)}:subjects:${seasonId}`,
  subject: (userId: string, subjectId: string) => `${prefix(userId)}:subject:${subjectId}`,
  units: (userId: string, subjectId: string) => `${prefix(userId)}:units:${subjectId}`,
  calendar: (userId: string, year: number, month: number) => `${prefix(userId)}:calendar:${year}:${month}`,
  day: (userId: string, date: string) => `${prefix(userId)}:day:${date}`,
  progress: (userId: string, seasonId: string) => `${prefix(userId)}:progress:${seasonId}`,
  subjectProgress: (userId: string, subjectId: string) => `${prefix(userId)}:subject-progress:${subjectId}`,
  dashboard: (userId: string, seasonId: string, name: string) => `${prefix(userId)}:dashboard:${name}:${seasonId}`,
  revision: (userId: string, seasonId: string, today: string) => `${prefix(userId)}:revision:${seasonId}:${today}`,
  knowledge: (userId: string, name: string, id: string) => `${prefix(userId)}:knowledge:${name}:${id}`,
  userSearchRateLimit: (userId: string) => `${prefix(userId)}:rate-limit:user-search`,
};

export const userKeyPattern = (userId: string) => `${prefix(userId)}:*`;
