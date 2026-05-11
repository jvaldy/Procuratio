import { useEffect, useMemo, useState } from 'react';
import { listAdminStores } from '../../../api/stores';
import {
  cancelAppointment,
  createAvailability,
  createAppointment,
  deleteAvailability,
  listAppointments,
  listAvailability,
  listBusinessHours,
  listEmployees,
  listSlots,
  replaceBusinessHours,
  updateAppointmentStatus,
} from '../../../api/planning';
import { searchCustomers } from '../../../api/pos';
import { listServices } from '../../../api/stock';
import type {
  PlanningAppointment,
  PlanningAvailability,
  PlanningBusinessHour,
  PlanningEmployee,
  PlanningSlot,
} from '../../../types/planning';
import type { PosCustomerSearchResult } from '../../../types/pos';
import type { ServiceItem } from '../../../types/stock';
import { InlineNotification } from '../../../ui/InlineNotification';

type ViewMode = 'day' | 'week' | 'month' | 'year';

type AppointmentForm = {
  employeeId: string;
  customerId: string;
  startAt: string;
  serviceId: string;
  quantity: string;
  notes: string;
};

type AvailabilityForm = {
  employeeId: string;
  dayOfWeek: string;
  mode: 'available' | 'off';
  startTime: string;
  endTime: string;
};

type CalendarCard =
  | (PlanningAppointment & {
      cardKind: 'appointment';
      key: string;
      top: number;
      left: string;
      width: string;
      height: number;
      tint: number;
    })
  | {
      cardKind: 'group';
      key: string;
      top: number;
      left: string;
      width: string;
      height: number;
      tint: number;
      label: string;
      appointments: PlanningAppointment[];
    };

const SLOT_HEIGHT = 56;
const DAY_LABELS = ['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const EMPTY_FORM: AppointmentForm = {
  employeeId: '',
  customerId: '',
  startAt: '',
  serviceId: '',
  quantity: '1',
  notes: '',
};

const EMPTY_AVAILABILITY_FORM: AvailabilityForm = {
  employeeId: '',
  dayOfWeek: '1',
  mode: 'off',
  startTime: '09:00',
  endTime: '18:00',
};

const DEFAULT_BUSINESS_HOURS: PlanningBusinessHour[] = [
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

function isoDate(date: Date): string {
  return toLocalDateString(startOfDay(date));
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
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

function getRangeForView(anchorDate: string, view: ViewMode): Date[] {
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

function navigateDate(anchorDate: string, view: ViewMode, direction: -1 | 1): string {
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

function describeView(anchorDate: string, view: ViewMode): string {
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

function formatTime(dateString: string): string {
  return new Date(dateString).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleString('en-GB', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function toLocalDateTimeInput(isoString: string): string {
  const date = new Date(isoString);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function appointmentHeight(startAt: string, endAt: string): number {
  const durationMinutes = (new Date(endAt).getTime() - new Date(startAt).getTime()) / 60000;
  return Math.max((durationMinutes / 30) * SLOT_HEIGHT, SLOT_HEIGHT);
}

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return (hours * 60) + minutes;
}

function minutesToTimeLabel(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function dateToBusinessDayOfWeek(date: Date): number {
  const day = date.getDay();
  return day === 0 ? 7 : day;
}

function dayOfWeekLabel(dayOfWeek: number): string {
  return DAY_LABELS[dayOfWeek] ?? `Day ${dayOfWeek}`;
}

function statusLabel(status: string): string {
  if (status === 'completed') return 'Completed';
  if (status === 'cancelled') return 'Cancelled';
  return 'Scheduled';
}

function statusBadgeClass(status: string): string {
  if (status === 'completed') return 'status-badge active';
  if (status === 'cancelled') return 'status-badge inactive';
  return 'status-badge pending';
}

export function PlanningPage() {
  const [view, setView] = useState<ViewMode>('week');
  const [anchorDate, setAnchorDate] = useState(isoDate(new Date()));
  const [stores, setStores] = useState<Array<{ id: number; name: string; city: string | null }>>([]);
  const [storeFilterId, setStoreFilterId] = useState('');
  const [employees, setEmployees] = useState<PlanningEmployee[]>([]);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [appointments, setAppointments] = useState<PlanningAppointment[]>([]);
  const [availability, setAvailability] = useState<PlanningAvailability[]>([]);
  const [businessHours, setBusinessHours] = useState<PlanningBusinessHour[]>(DEFAULT_BUSINESS_HOURS);
  const [employeeFilterId, setEmployeeFilterId] = useState('');
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<number | null>(null);
  const [form, setForm] = useState<AppointmentForm>(EMPTY_FORM);
  const [availabilityForm, setAvailabilityForm] = useState<AvailabilityForm>(EMPTY_AVAILABILITY_FORM);
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [showAvailabilityModal, setShowAvailabilityModal] = useState(false);
  const [showBusinessHoursModal, setShowBusinessHoursModal] = useState(false);
  const [showAppointmentSummaryModal, setShowAppointmentSummaryModal] = useState(false);
  const [showSlotResultsModal, setShowSlotResultsModal] = useState(false);
  const [bookingFlowMode, setBookingFlowMode] = useState<'create' | 'selected'>('create');
  const [showOverlapSummaryModal, setShowOverlapSummaryModal] = useState(false);
  const [returnToOverlapList, setReturnToOverlapList] = useState(false);
  const [overlapAppointments, setOverlapAppointments] = useState<PlanningAppointment[]>([]);
  const [overlapLabel, setOverlapLabel] = useState('');
  const [customerQuery, setCustomerQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<PosCustomerSearchResult | null>(null);
  const [customerResults, setCustomerResults] = useState<PosCustomerSearchResult[]>([]);
  const [slotServiceId, setSlotServiceId] = useState('');
  const [slotEmployeeId, setSlotEmployeeId] = useState('');
  const [slotFrom, setSlotFrom] = useState(isoDate(new Date()));
  const [slotTo, setSlotTo] = useState(isoDate(addDays(new Date(), 7)));
  const [slots, setSlots] = useState<PlanningSlot[]>([]);
  const [slotLoading, setSlotLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const selectedAppointment = appointments.find((item) => item.id === selectedAppointmentId) ?? null;
  const selectedEmployeeName = employees.find((item) => String(item.id) === employeeFilterId)?.fullName ?? 'All staff members';
  const selectedService = services.find((item) => item.id === Number(form.serviceId)) ?? null;
  const selectedAvailabilityDay = Number(availabilityForm.dayOfWeek || 1);
  const visibleDates = useMemo(() => getRangeForView(anchorDate, view), [anchorDate, view]);
  const currentBusinessHourByDay = useMemo(() => {
    return businessHours.reduce<Record<number, PlanningBusinessHour>>((accumulator, item) => {
      accumulator[item.dayOfWeek] = item;
      return accumulator;
    }, {});
  }, [businessHours]);
  const planningWindow = useMemo(() => {
    const visibleDayRules = visibleDates
      .map((date) => currentBusinessHourByDay[dateToBusinessDayOfWeek(date)])
      .filter((item): item is PlanningBusinessHour => Boolean(item && item.isOpen));

    if (visibleDayRules.length === 0) {
      return { startMinutes: 9 * 60, endMinutes: 18 * 60 };
    }

    return {
      startMinutes: Math.min(...visibleDayRules.map((item) => timeToMinutes(item.startTime))),
      endMinutes: Math.max(...visibleDayRules.map((item) => timeToMinutes(item.endTime))),
    };
  }, [currentBusinessHourByDay, visibleDates]);
  const hourSlots = useMemo(() => {
    const slotCount = Math.max(1, (planningWindow.endMinutes - planningWindow.startMinutes) / 30);
    return Array.from({ length: slotCount }, (_, index) => minutesToTimeLabel(planningWindow.startMinutes + (index * 30)));
  }, [planningWindow.endMinutes, planningWindow.startMinutes]);

  const boardEmployees = useMemo(() => {
    if (view === 'day') {
      if (employeeFilterId) {
        return employees.filter((item) => String(item.id) === employeeFilterId);
      }
      return employees.slice(0, 6);
    }

    return employees;
  }, [employees, employeeFilterId, view]);

  const boardColumns = useMemo(() => {
    if (view === 'day') {
      return boardEmployees.map((item) => ({ key: `employee-${item.id}`, label: item.fullName }));
    }

    return visibleDates.map((date) => ({
      key: isoDate(date),
      label: date.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' }),
    }));
  }, [boardEmployees, view, visibleDates]);

  const colCount = Math.max(boardColumns.length, 1);
  const colPct = 100 / colCount;
  const planningGridBackground = {
    background:
      `repeating-linear-gradient(180deg, transparent 0, transparent 55px, #edf1f8 55px, #edf1f8 56px),` +
      `repeating-linear-gradient(90deg, transparent 0, transparent calc(${100 / colCount}% - 1px), #edf1f8 calc(${100 / colCount}% - 1px), #edf1f8 ${100 / colCount}%)`,
  };
  const timeToOffset = (isoString: string): number => {
    const date = new Date(isoString);
    const totalMinutes = (date.getHours() * 60) + date.getMinutes();
    return ((totalMinutes - planningWindow.startMinutes) / 30) * SLOT_HEIGHT;
  };

  const dayCards = useMemo(() => {
    if (view !== 'day' && view !== 'week') {
      return [] as CalendarCard[];
    }

    if (view === 'day') {
      const cards: CalendarCard[] = [];
      appointments.forEach((appointment, index) => {
        const dateKey = isoDate(new Date(appointment.startAt));
        const dayIndex = visibleDates.findIndex((date) => isoDate(date) === dateKey);
        const employeeIndex = boardEmployees.findIndex((employee) => employee.id === appointment.employee.id);
        const columnIndex = employeeIndex >= 0 ? employeeIndex : dayIndex;

        if (columnIndex < 0) {
          return;
        }

        cards.push({
          ...appointment,
          cardKind: 'appointment' as const,
          key: `${appointment.id}-${index}`,
          top: Math.max(0, timeToOffset(appointment.startAt)),
          left: `calc(${columnIndex * colPct}% + 5px)`,
          width: `calc(${colPct}% - 10px)`,
          height: appointmentHeight(appointment.startAt, appointment.endAt),
          tint: Math.max(0, employeeIndex) % 4,
        });
      });
      return cards;
    }

    const groups = new Map<string, PlanningAppointment[]>();
    for (const appointment of appointments) {
      const dateKey = isoDate(new Date(appointment.startAt));
      const startLabel = formatTime(appointment.startAt);
      const groupKey = `${dateKey}-${startLabel}`;
      const items = groups.get(groupKey) ?? [];
      items.push(appointment);
      groups.set(groupKey, items);
    }

    const cards: CalendarCard[] = [];
    Array.from(groups.entries()).forEach(([groupKey, groupedAppointments], index) => {
      const dateKey = isoDate(new Date(groupedAppointments[0].startAt));
      const dayIndex = visibleDates.findIndex((date) => isoDate(date) === dateKey);
      if (dayIndex < 0) {
        return;
      }

      const firstAppointment = groupedAppointments[0];
      const employeeIndex = boardEmployees.findIndex((employee) => employee.id === firstAppointment.employee.id);
      const top = Math.max(0, timeToOffset(firstAppointment.startAt));
      const left = `calc(${dayIndex * colPct}% + 5px)`;
      const width = `calc(${colPct}% - 10px)`;
      const height = Math.max(...groupedAppointments.map((item) => appointmentHeight(item.startAt, item.endAt)));
      const tint = Math.max(0, employeeIndex) % 4;

      if (groupedAppointments.length === 1) {
        cards.push({
          ...firstAppointment,
          cardKind: 'appointment' as const,
          key: `${firstAppointment.id}-${index}`,
          top,
          left,
          width,
          height,
          tint,
        });
        return;
      }

      cards.push({
        cardKind: 'group' as const,
        key: `group-${groupKey}`,
        top,
        left,
        width,
        height,
        tint,
        label: `${groupedAppointments.length} appointments`,
        appointments: groupedAppointments.sort((a, b) => a.employee.fullName.localeCompare(b.employee.fullName)),
      });
    });
    return cards;
  }, [appointments, boardEmployees, colPct, view, visibleDates]);

  const monthCells = useMemo(() => {
    if (view !== 'month') return [] as Array<{ date: Date; items: PlanningAppointment[] }>;
    return visibleDates.map((date) => {
      const dateKey = isoDate(date);
      return {
        date,
        items: appointments.filter((item) => isoDate(new Date(item.startAt)) === dateKey),
      };
    });
  }, [appointments, view, visibleDates]);
  const selectedDayBusinessHour = currentBusinessHourByDay[selectedAvailabilityDay] ?? DEFAULT_BUSINESS_HOURS[selectedAvailabilityDay - 1];

  const yearCells = useMemo(() => {
    if (view !== 'year') return [] as Array<{ date: Date; count: number; customers: string[] }>;
    return visibleDates.map((date) => {
      const month = date.getMonth();
      const monthAppointments = appointments.filter((item) => new Date(item.startAt).getMonth() === month);
      return {
        date,
        count: monthAppointments.length,
        customers: Array.from(new Set(monthAppointments.map((item) => item.customer?.fullName).filter(Boolean))) as string[],
      };
    });
  }, [appointments, view, visibleDates]);

  const nowOffsetPx = timeToOffset(new Date().toISOString());
  const showNowLine = (view === 'day' || view === 'week') && nowOffsetPx >= 0 && nowOffsetPx <= hourSlots.length * SLOT_HEIGHT;
  const isFormReady = Boolean(form.employeeId && form.serviceId && form.startAt);
  const viewDescription = describeView(anchorDate, view);
  const canRestoreSelectedAppointment = Boolean(
    selectedAppointment
    && selectedAppointment.status === 'cancelled'
    && new Date(selectedAppointment.startAt).getTime() > Date.now()
  );

  async function refreshAppointments(nextEmployeeId?: string) {
    const params = new URLSearchParams({ view, date: anchorDate });
    const employeeId = nextEmployeeId ?? employeeFilterId;
    if (employeeId) {
      params.set('employeeId', employeeId);
    }
    if (storeFilterId) {
      params.set('storeId', storeFilterId);
    }
    const result = await listAppointments(params);
    setAppointments(result.data);
  }

  useEffect(() => {
    (async () => {
      try {
        const [employeesResult, servicesResult, businessHoursResult, storesResult] = await Promise.all([
          listEmployees(storeFilterId ? Number(storeFilterId) : undefined),
          listServices(new URLSearchParams({ page: '1', perPage: '50', active: 'true' })),
          listBusinessHours(storeFilterId ? Number(storeFilterId) : undefined),
          listAdminStores(new URLSearchParams({ page: '1', perPage: '50', status: 'active' })),
        ]);
        setEmployees(employeesResult);
        setServices(servicesResult.data.filter((item) => item.isActive));
        setBusinessHours(businessHoursResult);
        setStores(storesResult.data);
      } catch (err) {
        setError((err as Error).message);
      }
    })();
  }, [storeFilterId]);

  useEffect(() => {
    refreshAppointments().catch((err) => setError((err as Error).message));
  }, [anchorDate, employeeFilterId, storeFilterId, view]);

  useEffect(() => {
    const employeeId = Number(employeeFilterId || form.employeeId);
    if (!employeeId) {
      setAvailability([]);
      return;
    }

    listAvailability(employeeId)
      .then(setAvailability)
      .catch((err) => setError((err as Error).message));
  }, [employeeFilterId, form.employeeId]);

  useEffect(() => {
    const term = customerQuery.trim();
    if (!term || term.length < 2 || (selectedCustomer && term === selectedCustomer.fullName)) {
      setCustomerResults([]);
      return;
    }

    const timeout = setTimeout(() => {
      searchCustomers(term)
        .then((result) => setCustomerResults(result.data))
        .catch((err) => setError((err as Error).message));
    }, 250);

    return () => clearTimeout(timeout);
  }, [customerQuery, selectedCustomer]);

  useEffect(() => {
    setForm((prev) => ({ ...prev, customerId: selectedCustomer ? String(selectedCustomer.id) : '' }));
  }, [selectedCustomer]);

  async function submitAppointment() {
    setError(null);
    setMessage(null);
    setInfo(null);

    try {
      await createAppointment({
        employeeId: Number(form.employeeId),
        customerId: form.customerId ? Number(form.customerId) : null,
        startAt: form.startAt,
        notes: form.notes.trim() || null,
        storeId: storeFilterId ? Number(storeFilterId) : undefined,
        services: [{ serviceId: Number(form.serviceId), quantity: Number(form.quantity) }],
      });
      setForm(EMPTY_FORM);
      setCustomerQuery('');
      setSelectedCustomer(null);
      setCustomerResults([]);
      setShowAppointmentModal(false);
      setMessage('Appointment created successfully.');
      await refreshAppointments();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function submitAvailabilityRule() {
    setError(null);
    setMessage(null);
    setInfo(null);

    try {
      await createAvailability({
        employeeId: Number(availabilityForm.employeeId),
        dayOfWeek: Number(availabilityForm.dayOfWeek),
        startTime: availabilityForm.startTime,
        endTime: availabilityForm.endTime,
        isAvailable: availabilityForm.mode === 'available',
      });
      setShowAvailabilityModal(false);
      setMessage(availabilityForm.mode === 'off' ? 'Day off saved successfully.' : 'Working window saved successfully.');
      if (availabilityForm.employeeId) {
        const result = await listAvailability(Number(availabilityForm.employeeId));
        setAvailability(result);
      }
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function removeAvailabilityRule(id: number) {
    setError(null);
    setMessage(null);
    setInfo(null);

    try {
      await deleteAvailability(id);
      setMessage('Availability rule removed.');
      if (employeeFilterId || form.employeeId) {
        const result = await listAvailability(Number(employeeFilterId || form.employeeId));
        setAvailability(result);
      }
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function saveBusinessHours() {
    setError(null);
    setMessage(null);
    setInfo(null);

    try {
      const saved = await replaceBusinessHours(businessHours, storeFilterId ? Number(storeFilterId) : undefined);
      setBusinessHours(saved);
      setShowBusinessHoursModal(false);
      setMessage('Salon opening hours updated successfully.');
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function markAppointmentCompleted(id: number) {
    setError(null);
    setMessage(null);
    setInfo(null);

    try {
      await updateAppointmentStatus(id, 'completed');
      setSelectedAppointmentId(null);
      setShowAppointmentSummaryModal(false);
      setMessage('Appointment marked as completed.');
      await refreshAppointments();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function cancelSelectedAppointment(id: number) {
    setError(null);
    setMessage(null);
    setInfo(null);

    try {
      await cancelAppointment(id);
      setSelectedAppointmentId(null);
      setShowAppointmentSummaryModal(false);
      setMessage('Appointment cancelled.');
      await refreshAppointments();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function restoreSelectedAppointment(id: number) {
    setError(null);
    setMessage(null);
    setInfo(null);

    try {
      await updateAppointmentStatus(id, 'scheduled');
      setSelectedAppointmentId(null);
      setShowAppointmentSummaryModal(false);
      setMessage('Appointment restored.');
      await refreshAppointments();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function searchAvailableSlots() {
    if (!slotServiceId) {
      setError('Select a service to search for available slots.');
      return;
    }

    setSlotLoading(true);
    setError(null);
    setMessage(null);
    setInfo(null);
    setSlots([]);

    try {
      const params = new URLSearchParams({ serviceId: slotServiceId, from: slotFrom, to: slotTo });
      if (slotEmployeeId) {
        params.set('employeeId', slotEmployeeId);
      }
      if (storeFilterId) {
        params.set('storeId', storeFilterId);
      }
      const result = await listSlots(params);
      setSlots(result.data);
      setShowSlotResultsModal(true);
      if (result.data.length === 0) {
        setInfo('No available slots were found for this period.');
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSlotLoading(false);
    }
  }

  function selectSlot(slot: PlanningSlot) {
    setForm((prev) => ({
      ...prev,
      employeeId: String(slot.employee.id),
      serviceId: slotServiceId,
      startAt: toLocalDateTimeInput(slot.startAt),
      quantity: '1',
    }));
    setSlots([]);
    setShowSlotResultsModal(false);
    setBookingFlowMode('selected');
    setInfo('The slot has been pre-filled. Complete the appointment form to save it.');
    setShowAppointmentModal(true);
  }

  function clearCustomer() {
    setCustomerQuery('');
    setSelectedCustomer(null);
    setCustomerResults([]);
  }

  function openAppointmentModal() {
    setError(null);
    setMessage(null);
    setInfo(null);
    setBookingFlowMode('create');
    setShowAppointmentModal(true);
  }

  function openAppointmentSummary(id: number, options?: { fromOverlap?: boolean }) {
    setSelectedAppointmentId(id);
    setShowAppointmentSummaryModal(true);
    setReturnToOverlapList(Boolean(options?.fromOverlap));
    setError(null);
    setMessage(null);
    setInfo(null);
  }

  function openOverlapSummary(items: PlanningAppointment[]) {
    if (items.length === 0) {
      return;
    }

    const firstAppointment = items[0];
    setOverlapAppointments(items);
    setOverlapLabel(`${new Date(firstAppointment.startAt).toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' })} - ${formatTime(firstAppointment.startAt)}`);
    setShowOverlapSummaryModal(true);
    setReturnToOverlapList(false);
    setError(null);
    setMessage(null);
    setInfo(null);
  }

  function openAvailabilityModal() {
    const defaultDay = new Date(`${anchorDate}T12:00:00`).getDay() || 7;
    const employeeId = employeeFilterId || (employees[0] ? String(employees[0].id) : '');
    const businessHour = currentBusinessHourByDay[defaultDay] ?? DEFAULT_BUSINESS_HOURS[defaultDay - 1];

    setAvailabilityForm({
      employeeId,
      dayOfWeek: String(defaultDay),
      mode: 'off',
      startTime: businessHour.startTime,
      endTime: businessHour.endTime,
    });
    setError(null);
    setMessage(null);
    setInfo(null);
    setShowAvailabilityModal(true);
  }

  return (
    <div className="reference-screen planning-reference">
      <header className="planning-topbar">
        <div className="planning-topbar-left">
          <span className="planning-prev-month">
            {new Date(`${anchorDate}T12:00:00`).toLocaleDateString('en-GB', { month: 'short' }).toUpperCase()}
          </span>
          <div className="planning-grid-icon" aria-hidden="true">
            {Array.from({ length: 9 }).map((_, index) => <span key={index} />)}
          </div>
        </div>

        <div className="planning-topbar-right" />
      </header>

      <div className="planning-toolbar">
        <div className="planning-toolbar-primary">
          <div className="planning-toolbar-actions">
            <button className="btn-soft btn-xs planning-action-btn planning-action-btn-primary" data-testid="planning-open-appointment" type="button" onClick={openAppointmentModal}>New appointment</button>
            <button className="btn-ghost btn-xs planning-action-btn" data-testid="planning-open-slot-search" type="button" onClick={() => setShowSlotResultsModal(true)}>Search availability</button>
            <button className="btn-ghost btn-xs planning-action-btn" data-testid="planning-open-business-hours" type="button" onClick={() => setShowBusinessHoursModal(true)}>Salon hours</button>
            <select
              className="planning-staff-select"
              value={storeFilterId}
              onChange={(event) => {
                setStoreFilterId(event.target.value);
                setEmployeeFilterId('');
              }}
            >
              <option value="">All stores</option>
              {stores.map((store) => <option key={store.id} value={store.id}>{store.name}</option>)}
            </select>
            <select
              data-testid="planning-employee-filter"
              className="planning-staff-select"
              value={employeeFilterId}
              onChange={(event) => setEmployeeFilterId(event.target.value)}
            >
              <option value="">All staff members</option>
              {employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.fullName}</option>)}
            </select>
          </div>
        </div>
        <div className="planning-toolbar-text">
          <strong>{viewDescription}</strong>
          <span>{selectedEmployeeName}</span>
        </div>
      </div>

      <div className="planning-detail-grid">
        <div className="panel planning-availability-panel">
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <div className="stack" style={{ gap: 4 }}>
              <h3>Employee hours</h3>
              <p className="muted">Working windows and day-off rules for the selected employee.</p>
            </div>
            <button className="btn-ghost btn-xs" type="button" onClick={openAvailabilityModal}>Edit hours</button>
          </div>
          {availability.length === 0 ? (
            <p className="muted">Choose an employee to load their availability rules.</p>
          ) : (
            <div className="planning-availability-list">
              {availability.map((slot) => (
                <div key={slot.id} className="planning-availability-item">
                  <div className="stack" style={{ gap: 4 }}>
                    <strong>{dayOfWeekLabel(slot.dayOfWeek)}</strong>
                    <span className="muted">{slot.startTime} - {slot.endTime}</span>
                  </div>
                  <span className={slot.isAvailable ? 'status-badge active' : 'status-badge inactive'}>
                    {slot.isAvailable ? 'Working' : 'Off'}
                  </span>
                  <button
                    type="button"
                    className="btn-icon btn-danger btn-xs"
                    title="Delete rule"
                    aria-label="Delete rule"
                    onClick={() => removeAvailabilityRule(slot.id)}
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 3h6l1 2h4v2H4V5h4l1-2Zm1 6h2v9h-2V9Zm4 0h2v9h-2V9ZM7 9h2v9H7V9Z" fill="currentColor" /></svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      <div className="stack" style={{ margin: '0 14px 14px' }}>
        {message && <InlineNotification tone="success" title="Saved" message={message} />}
        {info && <InlineNotification tone="info" title="Information" message={info} />}
        {error && <InlineNotification tone="error" title="Action unavailable" message={error} />}
      </div>

      <div>
        {(view === 'day' || view === 'week') && (
          <>
            <div className="planning-board-toolbar">
              <div className="planning-view-switch">
                {(['day', 'week', 'month', 'year'] as ViewMode[]).map((mode) => (
                  <button
                    key={mode}
                    className={view === mode ? '' : 'btn-soft'}
                    data-testid={`planning-view-${mode}`}
                    onClick={() => setView(mode)}
                    type="button"
                  >
                    {mode.charAt(0).toUpperCase() + mode.slice(1)}
                  </button>
                ))}
                <button className="btn-ghost btn-xs" type="button" onClick={() => setAnchorDate(isoDate(new Date()))}>Today</button>
              </div>
              <div className="planning-board-nav">
                <button className="planning-nav-btn" onClick={() => setAnchorDate(navigateDate(anchorDate, view, -1))} title="Previous">{'<'}</button>
                <strong>{viewDescription}</strong>
                <button className="planning-nav-btn" onClick={() => setAnchorDate(navigateDate(anchorDate, view, 1))} title="Next">{'>'}</button>
              </div>
            </div>

            <div className="planning-board">
            <div className="planning-hours">
              <div className="planning-hours-spacer" />
              {hourSlots.map((slot) => <div key={slot}>{slot}</div>)}
            </div>

            <div className="planning-grid">
              <div className="planning-grid-header" style={{ gridTemplateColumns: `repeat(${colCount}, minmax(120px, 1fr))` }}>
                {boardColumns.map((column) => <span key={column.key}>{column.label}</span>)}
              </div>

              <div className="planning-cells" style={planningGridBackground}>
                {showNowLine && (
                  <div className="planning-now-line" style={{ top: nowOffsetPx }}>
                    <div className="planning-now-dot" />
                  </div>
                )}

                {dayCards.map((appointment) => (
                  <article
                    key={appointment.key}
                    className={`planning-card tint-${appointment.tint}${appointment.cardKind === 'appointment' && selectedAppointmentId === appointment.id ? ' planning-card-selected' : ''}${appointment.cardKind === 'group' ? ' planning-card-group' : ''}`}
                    data-testid={appointment.cardKind === 'group' ? `planning-group-${appointment.key}` : `planning-row-${appointment.id}`}
                    style={{ top: appointment.top, left: appointment.left, width: appointment.width, minHeight: appointment.height }}
                    onClick={() => appointment.cardKind === 'group' ? openOverlapSummary(appointment.appointments) : openAppointmentSummary(appointment.id)}
                  >
                    {appointment.cardKind === 'group' ? (
                      <>
                        <strong>{appointment.label}</strong>
                        <div className="planning-card-service">
                          <div className="planning-card-dot" />
                          Multiple employees on the same slot
                        </div>
                        <div className="planning-card-caption">{formatTime(appointment.appointments[0].startAt)}</div>
                        <div className="planning-card-caption">Click to review the list</div>
                      </>
                    ) : (
                      <>
                        <strong>{appointment.customer?.fullName ?? 'Walk-in'}</strong>
                        <div className="planning-card-service">
                          <div className="planning-card-dot" />
                          {appointment.services.map((service) => service.serviceName).join(', ')}
                        </div>
                        <div className="planning-card-caption">{formatTime(appointment.startAt)} - {formatTime(appointment.endAt)}</div>
                        <div className="planning-card-caption">{appointment.employee.fullName}</div>
                      </>
                    )}
                  </article>
                ))}
              </div>
            </div>
            </div>
          </>
        )}

        {view === 'month' && (
          <>
            <div className="planning-board-toolbar">
              <div className="planning-view-switch">
                {(['day', 'week', 'month', 'year'] as ViewMode[]).map((mode) => (
                  <button
                    key={mode}
                    className={view === mode ? '' : 'btn-soft'}
                    data-testid={`planning-view-${mode}`}
                    onClick={() => setView(mode)}
                    type="button"
                  >
                    {mode.charAt(0).toUpperCase() + mode.slice(1)}
                  </button>
                ))}
                <button className="btn-ghost btn-xs" type="button" onClick={() => setAnchorDate(isoDate(new Date()))}>Today</button>
              </div>
              <div className="planning-board-nav">
                <button className="planning-nav-btn" onClick={() => setAnchorDate(navigateDate(anchorDate, view, -1))} title="Previous">{'<'}</button>
                <strong>{viewDescription}</strong>
                <button className="planning-nav-btn" onClick={() => setAnchorDate(navigateDate(anchorDate, view, 1))} title="Next">{'>'}</button>
              </div>
            </div>

            <div className="planning-month-grid">
              {monthCells.map((cell) => (
                <div key={isoDate(cell.date)} className="panel planning-month-cell">
                  <button className="planning-month-date-btn" type="button" onClick={() => { setAnchorDate(isoDate(cell.date)); setView('day'); }}>
                    {cell.date.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' })}
                  </button>
                  {cell.items.length === 0 ? (
                    <span className="muted">No appointments</span>
                  ) : (
                    cell.items.slice(0, 4).map((appointment) => (
                      <button key={appointment.id} className="planning-month-chip" type="button" onClick={() => openAppointmentSummary(appointment.id)}>
                        {formatTime(appointment.startAt)} - {appointment.customer?.fullName ?? 'Walk-in'}
                      </button>
                    ))
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {view === 'year' && (
          <>
            <div className="planning-board-toolbar">
              <div className="planning-view-switch">
                {(['day', 'week', 'month', 'year'] as ViewMode[]).map((mode) => (
                  <button
                    key={mode}
                    className={view === mode ? '' : 'btn-soft'}
                    data-testid={`planning-view-${mode}`}
                    onClick={() => setView(mode)}
                    type="button"
                  >
                    {mode.charAt(0).toUpperCase() + mode.slice(1)}
                  </button>
                ))}
                <button className="btn-ghost btn-xs" type="button" onClick={() => setAnchorDate(isoDate(new Date()))}>Today</button>
              </div>
              <div className="planning-board-nav">
                <button className="planning-nav-btn" onClick={() => setAnchorDate(navigateDate(anchorDate, view, -1))} title="Previous">{'<'}</button>
                <strong>{viewDescription}</strong>
                <button className="planning-nav-btn" onClick={() => setAnchorDate(navigateDate(anchorDate, view, 1))} title="Next">{'>'}</button>
              </div>
            </div>

            <div className="planning-year-grid">
              {yearCells.map((cell) => (
                <div key={cell.date.toISOString()} className="panel planning-year-cell" style={{ cursor: 'pointer' }} onClick={() => { setAnchorDate(isoDate(cell.date)); setView('month'); }}>
                  <strong>{cell.date.toLocaleDateString('en-GB', { month: 'long' })}</strong>
                  <span>{cell.count} appointment(s)</span>
                  <span className="muted">{cell.customers.slice(0, 2).join(', ') || 'No activity'}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {showAppointmentModal && (
        <div className="modal-backdrop" onClick={() => setShowAppointmentModal(false)}>
          <div className="modal-card" onClick={(event) => event.stopPropagation()}>
            <div className="stack" style={{ gap: 6 }}>
              <h3>{bookingFlowMode === 'selected' ? 'Selected booking' : 'Create appointment'}</h3>
              <span className="muted">
                {bookingFlowMode === 'selected'
                  ? 'Review the selected slot, then confirm the booking.'
                  : 'Create a new appointment manually or from a selected slot.'}
              </span>
            </div>
            <div className="planning-form-panel planning-form-panel-rich">
              <div className="form-field planning-customer-wrap" style={{ gridColumn: '1 / -1' }}>
                <label htmlFor="planning-customer-search-modal">Customer</label>
                <input
                  id="planning-customer-search-modal"
                  data-testid="planning-customer-id"
                  placeholder="Search by name or email, or leave empty for a walk-in customer"
                  value={customerQuery}
                  onChange={(event) => { setCustomerQuery(event.target.value); setSelectedCustomer(null); }}
                  autoComplete="off"
                />
                {customerResults.length > 0 && (
                  <div className="planning-customer-dropdown">
                    {customerResults.map((customer) => (
                      <button
                        key={customer.id}
                        type="button"
                        className="planning-customer-option"
                        onClick={() => {
                          setSelectedCustomer(customer);
                          setCustomerQuery(customer.fullName);
                          setCustomerResults([]);
                        }}
                      >
                        <strong>{customer.fullName}</strong>
                        <span>{customer.email}{customer.phoneNumber ? ` - ${customer.phoneNumber}` : ''}</span>
                      </button>
                    ))}
                  </div>
                )}
                {selectedCustomer && (
                  <div className="row" style={{ marginTop: 6 }}>
                    <span className="status-badge active">#{selectedCustomer.id} - {selectedCustomer.fullName}</span>
                    <button type="button" className="btn-ghost btn-xs" onClick={clearCustomer}>Walk-in</button>
                  </div>
                )}
              </div>

              <div className="form-field">
                <label htmlFor="planning-create-start-modal">Start date and time</label>
                <input id="planning-create-start-modal" data-testid="planning-start-at" type="datetime-local" value={form.startAt} onChange={(event) => setForm({ ...form, startAt: event.target.value })} />
              </div>
              <div className="form-field">
                <label htmlFor="planning-create-service-modal">Service</label>
                <select id="planning-create-service-modal" data-testid="planning-service" value={form.serviceId} onChange={(event) => setForm({ ...form, serviceId: event.target.value })}>
                  <option value="">Select a service</option>
                  {services.map((service) => <option key={service.id} value={service.id}>{service.name} ({service.durationMinutes} min)</option>)}
                </select>
              </div>
              <div className="form-field">
                <label htmlFor="planning-create-employee-modal">Employee</label>
                <select id="planning-create-employee-modal" value={form.employeeId} onChange={(event) => setForm({ ...form, employeeId: event.target.value })}>
                  <option value="">Select an employee</option>
                  {employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.fullName}</option>)}
                </select>
              </div>
              <div className="form-field">
                <label htmlFor="planning-create-quantity-modal">Quantity</label>
                <input id="planning-create-quantity-modal" data-testid="planning-quantity" type="number" min="1" value={form.quantity} onChange={(event) => setForm({ ...form, quantity: event.target.value })} />
              </div>
              <div className="form-field form-field-full">
                <label htmlFor="planning-create-notes-modal">Notes</label>
                <textarea id="planning-create-notes-modal" placeholder="Optional note for the team." value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
              </div>
            </div>
            <div className="planning-form-actions">
              <div className="planning-helper-text">
                {selectedService ? `${selectedService.name} - ${selectedService.durationMinutes} min.` : 'Use the slot search to pre-fill a valid appointment time.'}
              </div>
              <div className="row">
                <button data-testid="planning-submit" onClick={submitAppointment} disabled={!isFormReady}>Create appointment</button>
                <button className="btn-ghost" type="button" onClick={() => setShowAppointmentModal(false)}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showAvailabilityModal && (
        <div className="modal-backdrop" onClick={() => setShowAvailabilityModal(false)}>
          <div className="modal-card" onClick={(event) => event.stopPropagation()}>
            <h3>Employee day off / working rule</h3>
            <div className="grid-form grid-2">
              <div className="form-field">
                <label htmlFor="availability-employee">Employee</label>
                <select id="availability-employee" data-testid="availability-employee" value={availabilityForm.employeeId} onChange={(event) => setAvailabilityForm({ ...availabilityForm, employeeId: event.target.value })}>
                  <option value="">Select an employee</option>
                  {employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.fullName}</option>)}
                </select>
              </div>
              <div className="form-field">
                <label htmlFor="availability-day">Day</label>
                <select
                  id="availability-day"
                  data-testid="availability-day"
                  value={availabilityForm.dayOfWeek}
                  onChange={(event) => {
                    const dayOfWeek = Number(event.target.value);
                    const businessHour = currentBusinessHourByDay[dayOfWeek] ?? DEFAULT_BUSINESS_HOURS[dayOfWeek - 1];
                    setAvailabilityForm({
                      ...availabilityForm,
                      dayOfWeek: event.target.value,
                      startTime: businessHour.startTime,
                      endTime: businessHour.endTime,
                    });
                  }}
                >
                  {DAY_LABELS.slice(1).map((label, index) => <option key={label} value={index + 1}>{label}</option>)}
                </select>
              </div>
              <div className="form-field">
                <label htmlFor="availability-mode">Rule type</label>
                <select id="availability-mode" value={availabilityForm.mode} onChange={(event) => setAvailabilityForm({ ...availabilityForm, mode: event.target.value as 'available' | 'off' })}>
                  <option value="off">Day off / blocked window</option>
                  <option value="available">Working window</option>
                </select>
              </div>
              <div className="form-field">
                <label htmlFor="availability-start">Start time</label>
                <input
                  id="availability-start"
                  data-testid="availability-start"
                  type="time"
                  min={selectedDayBusinessHour.startTime}
                  max={selectedDayBusinessHour.endTime}
                  value={availabilityForm.startTime}
                  onChange={(event) => setAvailabilityForm({ ...availabilityForm, startTime: event.target.value })}
                />
              </div>
              <div className="form-field">
                <label htmlFor="availability-end">End time</label>
                <input
                  id="availability-end"
                  type="time"
                  min={selectedDayBusinessHour.startTime}
                  max={selectedDayBusinessHour.endTime}
                  value={availabilityForm.endTime}
                  onChange={(event) => setAvailabilityForm({ ...availabilityForm, endTime: event.target.value })}
                />
              </div>
              <div className="form-field form-field-full">
                <span className="planning-helper-text">
                  Salon hours for {dayOfWeekLabel(selectedAvailabilityDay)}: {selectedDayBusinessHour.isOpen ? `${selectedDayBusinessHour.startTime} - ${selectedDayBusinessHour.endTime}` : 'Closed'}.
                </span>
              </div>
            </div>
            <div className="row">
              <button data-testid="availability-submit" type="button" onClick={submitAvailabilityRule} disabled={!availabilityForm.employeeId}>Save rule</button>
              <button className="btn-ghost" type="button" onClick={() => setShowAvailabilityModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {showBusinessHoursModal && (
        <div className="modal-backdrop" onClick={() => setShowBusinessHoursModal(false)}>
          <div className="modal-card" onClick={(event) => event.stopPropagation()}>
            <h3>Salon opening hours</h3>
            <div className="planning-business-hours-grid">
              {businessHours.map((item) => (
                <div key={item.dayOfWeek} className="planning-business-hours-row">
                  <strong>{dayOfWeekLabel(item.dayOfWeek)}</strong>
                  <label className="form-field-inline">
                    <input
                      type="checkbox"
                      checked={item.isOpen}
                      onChange={(event) => setBusinessHours((current) => current.map((entry) => entry.dayOfWeek === item.dayOfWeek ? { ...entry, isOpen: event.target.checked } : entry))}
                    />
                    <span>Open</span>
                  </label>
                  <input type="time" value={item.startTime} onChange={(event) => setBusinessHours((current) => current.map((entry) => entry.dayOfWeek === item.dayOfWeek ? { ...entry, startTime: event.target.value } : entry))} disabled={!item.isOpen} />
                  <input type="time" value={item.endTime} onChange={(event) => setBusinessHours((current) => current.map((entry) => entry.dayOfWeek === item.dayOfWeek ? { ...entry, endTime: event.target.value } : entry))} disabled={!item.isOpen} />
                </div>
              ))}
            </div>
            <div className="row">
              <button type="button" onClick={saveBusinessHours}>Save hours</button>
              <button className="btn-ghost" type="button" onClick={() => setShowBusinessHoursModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {showSlotResultsModal && (
        <div className="modal-backdrop" onClick={() => setShowSlotResultsModal(false)}>
          <div className="modal-card planning-slot-results-modal" data-testid="planning-slot-search-modal" onClick={(event) => event.stopPropagation()}>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <div className="stack" style={{ gap: 6 }}>
                <h3>Search availability</h3>
                <span className="muted">Search a free slot, then choose one to pre-fill the booking form.</span>
              </div>
              <button className="btn-ghost" type="button" onClick={() => setShowSlotResultsModal(false)}>Close</button>
            </div>

            <div className="planning-slot-search-form planning-slot-search-modal-form">
              <div className="form-field">
                <label htmlFor="slot-service-modal">Service</label>
                <select id="slot-service-modal" value={slotServiceId} onChange={(event) => setSlotServiceId(event.target.value)}>
                  <option value="">Select a service</option>
                  {services.map((service) => (
                    <option key={service.id} value={service.id}>{service.name} ({service.durationMinutes} min)</option>
                  ))}
                </select>
              </div>
              <div className="form-field">
                <label htmlFor="slot-employee-modal">Employee</label>
                <select id="slot-employee-modal" value={slotEmployeeId} onChange={(event) => setSlotEmployeeId(event.target.value)}>
                  <option value="">Any employee</option>
                  {employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.fullName}</option>)}
                </select>
              </div>
              <div className="form-field">
                <label htmlFor="slot-from-modal">From</label>
                <input id="slot-from-modal" type="date" value={slotFrom} onChange={(event) => setSlotFrom(event.target.value)} />
              </div>
              <div className="form-field">
                <label htmlFor="slot-to-modal">To</label>
                <input id="slot-to-modal" type="date" value={slotTo} onChange={(event) => setSlotTo(event.target.value)} />
              </div>
              <div className="form-field">
                <label>&nbsp;</label>
                <button data-testid="planning-slot-search-submit" type="button" onClick={searchAvailableSlots} disabled={slotLoading}>
                  {slotLoading ? 'Searching...' : 'Search availability'}
                </button>
              </div>
            </div>

            {slots.length === 0 ? (
              <InlineNotification tone="info" title="No slot found" message="No available slots were found for this search." />
            ) : (
              <div className="planning-slot-results-scroll">
                <div className="planning-slot-list">
                  {slots.map((slot, index) => (
                    <button
                      key={`${slot.employee.id}-${slot.startAt}-${index}`}
                      type="button"
                      data-testid={`planning-slot-${index}`}
                      className="planning-slot-card"
                      onClick={() => selectSlot(slot)}
                    >
                      <strong>{new Date(slot.startAt).toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' })}</strong>
                      <span>{formatTime(slot.startAt)} - {formatTime(slot.endAt)}</span>
                      <span>{slot.employee.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {showAppointmentSummaryModal && selectedAppointment && (
        <div className="modal-backdrop" onClick={() => setShowAppointmentSummaryModal(false)}>
          <div className="modal-card planning-summary-modal" data-testid="planning-summary-modal" onClick={(event) => event.stopPropagation()}>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <div className="stack" style={{ gap: 6 }}>
                <h3>Appointment summary</h3>
                <span className="muted">Quick overview before editing the schedule.</span>
              </div>
              <span className={statusBadgeClass(selectedAppointment.status)}>{statusLabel(selectedAppointment.status)}</span>
            </div>

            <div className="planning-summary-modal-grid">
              <div className="planning-summary-modal-item">
                <span className="planning-summary-label">Customer</span>
                <strong>{selectedAppointment.customer?.fullName ?? 'Walk-in customer'}</strong>
              </div>
              <div className="planning-summary-modal-item">
                <span className="planning-summary-label">Employee</span>
                <strong>{selectedAppointment.employee.fullName}</strong>
              </div>
              <div className="planning-summary-modal-item">
                <span className="planning-summary-label">Time</span>
                <strong>{formatDateTime(selectedAppointment.startAt)}</strong>
                <span className="muted">{formatTime(selectedAppointment.startAt)} - {formatTime(selectedAppointment.endAt)}</span>
              </div>
              <div className="planning-summary-modal-item">
                <span className="planning-summary-label">Services</span>
                <strong>{selectedAppointment.services.map((service) => service.serviceName).join(', ')}</strong>
                <span className="muted">{selectedAppointment.services.reduce((sum, service) => sum + service.durationMinutes, 0)} min total</span>
              </div>
            </div>

            {selectedAppointment.notes ? (
              <div className="planning-summary-modal-notes">
                <span className="planning-summary-label">Notes</span>
                <p>{selectedAppointment.notes}</p>
              </div>
            ) : null}

            <div className="row" style={{ justifyContent: 'space-between' }}>
              <div className="row">
                {returnToOverlapList && (
                  <button
                    data-testid="planning-back-to-list"
                    className="btn-ghost btn-xs"
                    type="button"
                    onClick={() => {
                      setShowAppointmentSummaryModal(false);
                      setShowOverlapSummaryModal(true);
                    }}
                  >
                    Back to list
                  </button>
                )}
                {selectedAppointment.status === 'scheduled' && (
                  <>
                    <button className="btn-soft btn-xs" type="button" onClick={() => markAppointmentCompleted(selectedAppointment.id)}>
                      Mark as completed
                    </button>
                    <button className="btn-danger btn-xs" type="button" onClick={() => cancelSelectedAppointment(selectedAppointment.id)}>
                      Cancel
                    </button>
                  </>
                )}
                {canRestoreSelectedAppointment && (
                  <button data-testid="planning-restore-appointment" className="btn-soft btn-xs" type="button" onClick={() => restoreSelectedAppointment(selectedAppointment.id)}>
                    Restore appointment
                  </button>
                )}
              </div>
              <button className="btn-ghost" type="button" onClick={() => setShowAppointmentSummaryModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {showOverlapSummaryModal && overlapAppointments.length > 0 && (
        <div className="modal-backdrop" onClick={() => setShowOverlapSummaryModal(false)}>
          <div className="modal-card planning-summary-modal" onClick={(event) => event.stopPropagation()}>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <div className="stack" style={{ gap: 6 }}>
                <h3>{overlapAppointments.length} appointments</h3>
                <span className="muted">{overlapLabel}</span>
              </div>
              <button className="btn-ghost" type="button" onClick={() => setShowOverlapSummaryModal(false)}>Close</button>
            </div>

            <div className="planning-overlap-list">
              {overlapAppointments.map((appointment) => (
                <button
                  key={appointment.id}
                  type="button"
                  className="planning-overlap-item"
                  onClick={() => {
                    setShowOverlapSummaryModal(false);
                    openAppointmentSummary(appointment.id, { fromOverlap: true });
                  }}
                >
                  <strong>{appointment.customer?.fullName ?? 'Walk-in customer'}</strong>
                  <span>{appointment.employee.fullName}</span>
                  <span>{formatTime(appointment.startAt)} - {formatTime(appointment.endAt)}</span>
                  <span>{appointment.services.map((service) => service.serviceName).join(', ')}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
