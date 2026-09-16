/*
  공통 — 한국 시각 계산
  서버(UTC)와 브라우저가 같은 날짜·시각을 보도록 여기서만 계산함

  @date : 2026-09-14
*/

const OFFSET = 9 * 60 * 60 * 1000;

const DAY = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** 시각 → 한국 날짜 YYYY-MM-DD */
export function kstDay(at: string | Date = new Date()) {
  return DAY.format(new Date(at));
}

/** 시각 → 한국 자정부터 흐른 분 (0~1439) */
export function kstMinuteOfDay(at: string | Date) {
  const d = new Date(new Date(at).getTime() + OFFSET);
  return d.getUTCHours() * 60 + d.getUTCMinutes();
}

/** 자정부터 분 → "20시", 분이 있으면 "20시 30분" */
function clockLabel(minutes: number) {
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  return minute === 0 ? `${hour}시` : `${hour}시 ${minute}분`;
}

/** 시각 → 한국 시(0~23) */
export function kstHour(at: string | Date) {
  return new Date(new Date(at).getTime() + OFFSET).getUTCHours();
}

/** 시각 → "20시", 분이 있으면 "20시 30분" (한국 시각, 24시 표기) */
export function kstTimeLabel(at: string | Date) {
  return clockLabel(kstMinuteOfDay(at));
}

/** 이번 달 YYYY-MM */
export function kstMonth(at: string | Date = new Date()) {
  return kstDay(at).slice(0, 7);
}

/** 한국 날짜(YYYY-MM-DD)와 시·분 → ISO 시각 */
export function kstIso(day: string, hour: number, minute = 0) {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, hour, minute) - OFFSET).toISOString();
}

/** 한국 달(YYYY-MM)의 시작과 끝(다음 달 1일) */
export function kstMonthRange(month: string) {
  const [y, m] = month.split("-").map(Number);
  return {
    start: new Date(Date.UTC(y, m - 1, 1) - OFFSET),
    end: new Date(Date.UTC(y, m, 1) - OFFSET),
  };
}

/** YYYY-MM에 달을 더함 */
export function shiftMonth(month: string, delta: number) {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1 + delta, 1)).toISOString().slice(0, 7);
}
