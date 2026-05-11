export type PlanningEmployee = {
  id: number;
  fullName: string;
  store?: { id: number; name: string } | null;
};

export type PlanningAppointment = {
  id: number;
  status: string;
  bookingSource: string;
  paymentMode: string | null;
  paymentStatus: string | null;
  employee: { id: number; fullName: string };
  customer: { id: number; fullName: string } | null;
  store?: { id: number; name: string } | null;
  startAt: string;
  endAt: string;
  notes: string | null;
  services: Array<{
    serviceId: number;
    serviceName: string;
    quantity: number;
    durationMinutes: number;
  }>;
};

export type PlanningAvailability = {
  id: number;
  employeeId: number;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
};

export type PlanningBusinessHour = {
  id: number | null;
  dayOfWeek: number;
  store?: { id: number; name: string } | null;
  startTime: string;
  endTime: string;
  isOpen: boolean;
};

export type PlanningSlot = {
  startAt: string;
  endAt: string;
  employee: { id: number; name: string };
};
