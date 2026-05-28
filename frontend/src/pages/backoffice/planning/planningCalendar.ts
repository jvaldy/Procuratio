import type { PlanningBusinessHour } from '../../../types/planning';

export type ViewMode = 'day' | 'week' | 'month' | 'year';

export const SLOT_HEIGHT = 56;

const DAY_LABELS = ['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export const DEFAULT_BUSINESS_HOURS: PlanningBusinessHour[] = [
  { id: null, dayOfWeek: 1, startTime: '09:00', endTime: '18:00', isOpen: true },
  { id: null, dayOfWeek: 2, startTime: '09:00', endTime: '18:00', isOpen: true },
  { id: null, dayOfWeek: 3, startTime: '09:00', endTime: '18:00', isOpen: true },
  { id: null, dayOfWeek: 4, startTime: '09:00', endTime: '18:00', isOpen: true },
  { id: null, dayOfWeek: 5, startTime: '09:00', endTime: '18:00', isOpen: true },
  { id: null, dayOfWeek: 6, startTime: '09:00', endTime: '18:00', isOpen: true },
  { id: null, dayOfWeek: 7, startTime: '09:00', endTime: '18:00', isOpen: false },
];

function startOfDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);

  return next;
}

function toLocalDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function startOfWeek(date: Date): Date {
  const next = startOfDay(date);
  const day = next.getDay();
  const offset = day === 0 ? -6 : 1 - day;
  next.setDate(next.getDate() + offset);

  return next;
}

function startOfMonth(date: Date): Date {
  const next = startOfDay(date);
  next.setDate(1);

  return next;
}

function startOfYear(date: Date): Date {
  const next = startOfDay(date);
  next.setMonth(0, 1);

  return next;
}

function enumerateDays(from: Date, count: number): Date[] {
  return Array.from({ length: count }, (_, index) => addDays(from, index));
}

export function isoDate(date: Date): string {
  return toLocalDateString(startOfDay(date));
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);

  return next;
}

export function getRangeForView(anchorDate: string, view: ViewMode): Date[] {
  const anchor = new Date(`${anchorDate}T12:00:00`);
  if (view === 'day') return [startOfDay(anchor)];
  if (view === 'week') return enumerateDays(startOfWeek(anchor), 7);
  if (view === 'month') return enumerateDays(startOfWeek(startOfMonth(anchor)), 35);

  return Array.from({ length: 12 }, (_, monthIndex) => {
    const date = startOfYear(anchor);
    date.setMonth(monthIndex, 1);

    return date;
  });
}

export function navigateDate(anchorDate: string, view: ViewMode, direction: -1 | 1): string {
  const anchor = new Date(`${anchorDate}T12:00:00`);
  if (view === 'day') {
    anchor.setDate(anchor.getDate() + direction);
  } else if (view === 'week') {
    anchor.setDate(anchor.getDate() + (7 * direction));
  } else if (view === 'month') {
    anchor.setMonth(anchor.getMonth() + direction, 1);
  } else {
    anchor.setFullYear(anchor.getFullYear() + direction, 0, 1);
  }

  return isoDate(anchor);
}

export function describeView(anchorDate: string, view: ViewMode): string {
  const anchor = new Date(`${anchorDate}T12:00:00`);
  if (view === 'day') {
    return anchor.toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
  }
  if (view === 'week') {
    const from = startOfWeek(anchor);
    const to = addDays(from, 6);

    return `${from.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} - ${to.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`;
  }
  if (view === 'month') {
    return anchor.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  }

  return anchor.toLocaleDateString('en-GB', { year: 'numeric' });
}

export function formatTime(dateString: string): string {
  return new Date(dateString).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

export function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleString('en-GB', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function toLocalDateTimeInput(isoString: string): string {
  const date = new Date(isoString);
  const pad = (value: number) => String(value).padStart(2, '0');

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function toDateTimeLocalString(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0');

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function roundToNextHalfHour(date: Date): Date {
  const next = new Date(date);
  next.setSeconds(0, 0);
  const minutes = next.getMinutes();
  if (minutes === 0 || minutes === 30) {
    return next;
  }
  if (minutes < 30) {
    next.setMinutes(30, 0, 0);

    return next;
  }
  next.setHours(next.getHours() + 1, 0, 0, 0);

  return next;
}

export function appointmentHeight(startAt: string, endAt: string): number {
  const durationMinutes = (new Date(endAt).getTime() - new Date(startAt).getTime()) / 60000;

  return Math.max((durationMinutes / 30) * SLOT_HEIGHT, SLOT_HEIGHT);
}

export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);

  return (hours * 60) + minutes;
}

export function minutesToTimeLabel(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

export function dateToBusinessDayOfWeek(date: Date): number {
  const day = date.getDay();

  return day === 0 ? 7 : day;
}

export function dayOfWeekLabel(dayOfWeek: number): string {
  return DAY_LABELS[dayOfWeek] ?? `Day ${dayOfWeek}`;
}

export function statusLabel(status: string): string {
  if (status === 'completed') return 'Completed';
  if (status === 'cancelled') return 'Cancelled';

  return 'Scheduled';
}

export function statusBadgeClass(status: string): string {
  if (status === 'completed') return 'status-badge active';
  if (status === 'cancelled') return 'status-badge inactive';

  return 'status-badge pending';
}
