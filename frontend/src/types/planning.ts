export type PlanningEmployee = {
  id: number;
  fullName: string;
};

export type PlanningAppointment = {
  id: number;
  status: string;
  employee: { id: number; fullName: string };
  customer: { id: number; fullName: string } | null;
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

