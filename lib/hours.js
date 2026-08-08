const DUSHANBE_OFFSET_MIN = 5 * 60;

function nowInDushanbe() {
  const now = new Date();
  const utcMin = now.getUTCHours() * 60 + now.getUTCMinutes();
  let dushMin = utcMin + DUSHANBE_OFFSET_MIN;
  let dayOffset = 0;
  if (dushMin >= 24 * 60) {
    dushMin -= 24 * 60;
    dayOffset = 1;
  }
  const utcDay = now.getUTCDay(); // 0 = Sunday
  const day = (utcDay + dayOffset) % 7;
  return { minutesOfDay: dushMin, isSunday: day === 0 };
}

function toMinutes(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

// Returns { isOpen, label } where label is a short localized-ready key the caller maps to text,
// or null if the schedule is missing/malformed (caller should just show the raw hours string).
export function getOpenStatus(schedule) {
  if (!schedule) return null;
  if (schedule.open24h) return { isOpen: true, key: "open24h" };

  const period = nowInDushanbe();
  const today = schedule.isSundayOverride
    ? schedule.sunday
    : period.isSunday && schedule.sunday
      ? schedule.sunday
      : schedule.weekday;
  if (!today) return null;

  const open = toMinutes(today.open);
  const close = toMinutes(today.close);
  const nowMin = period.minutesOfDay;

  const isOpen = close < open ? nowMin >= open || nowMin < close : nowMin >= open && nowMin < close;

  return { isOpen, key: isOpen ? "closesAt" : "opensAt", time: isOpen ? today.close : today.open };
}
