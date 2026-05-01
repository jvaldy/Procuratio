export type BookingSlot = {
  startAt: string;
  endAt: string;
  employee: { id: number; name: string };
};

export type BookingSession = {
  token: string;
  status: string;
  paymentMode: 'online' | 'in_store';
  paymentStatus: 'pending' | 'paid';
  employee: { id: number; fullName: string };
  service: { id: number; name: string };
  startAt: string;
  endAt: string;
  expiresAt: string;
};

export type ClientAppointment = {
  id: number;
  status: string;
  bookingSource: string;
  paymentMode: string | null;
  paymentStatus: string | null;
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

export type AppointmentHistoryItem = {
  id: number;
  fromStatus: string | null;
  toStatus: string;
  changedBy: string;
  reason: string | null;
  createdAt: string;
};

