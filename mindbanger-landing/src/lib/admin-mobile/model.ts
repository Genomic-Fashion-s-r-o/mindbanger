export const MOBILE_PATH = '/mindbanger_daily/admin/mobile';
export const MOBILE_INTEREST_PAGE_SIZE = 50;
export type MobileInterestPage = {
  page: number; pageCount: number; pageSize: number; total: number;
  items: { id: string; email: string; registered_at: string }[];
};
export type MobileOverview = {
  day: string; timezone: string; from: string; until: string;
  bookings: { id: string; kind: string; status: string; starts_at: string; ends_at: string; service_name: string; customer_name: string | null; email: string | null }[];
  interestDay: number; interestTotal: number;
  interests: { id: string; email: string; registered_at: string }[];
};
export function bratislavaDay(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Bratislava', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}
export function validDay(value: string) {
  return /^20\d{2}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
}
export function shiftDay(day: string, amount: number) {
  return new Date(Date.parse(day + 'T12:00:00Z') + amount * 86400000).toISOString().slice(0, 10);
}
export function pushContents(kind: 'booking' | 'interest', eventId: string) {
  return { title: 'Mindbanger Admin', body: kind === 'booking' ? 'Prišla nová rezervácia termínu.' : 'Nový záujem o program Nebuď otrokom cukru.', tab: kind === 'booking' ? 'calendar' : 'sugar', eventId };
}
export function fcmFailure(status: number, body: unknown): 'invalid-token' | 'retry' | 'failed' {
  const details = (body as { error?: { details?: { errorCode?: string }[] } })?.error?.details;
  if (details?.some(d => d.errorCode === 'UNREGISTERED')) return 'invalid-token';
  // 401/403 may be a temporary server credential configuration problem; keep devices.
  if ([401, 403, 408, 429].includes(status) || status >= 500) return 'retry';
  return 'failed';
}
