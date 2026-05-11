export type BookingSlot = {
  startAt: string;
  endAt: string;
  employee: { id: number; name: string };
  store?: { id: number; name: string } | null;
};

export type BookingSession = {
  token: string;
  status: string;
  paymentMode: 'online' | 'in_store';
  paymentStatus: 'pending' | 'paid';
  employee: { id: number; fullName: string };
  store: { id: number; name: string } | null;
  service: { id: number; name: string; unitPrice: number };
  startAt: string;
  endAt: string;
  expiresAt: string;
};

export type BookingConfirmationResult = {
  appointment: ClientAppointment;
  order: { orderNumber: string; status: string } | null;
  paymentIntent: { id: string; clientSecret: string; status: string } | null;
};

export type ClientAppointment = {
  id: number;
  status: string;
  bookingSource: string;
  paymentMode: string | null;
  paymentStatus: string | null;
  employee: { id: number; fullName: string };
  store: { id: number; name: string } | null;
  customer: { id: number; fullName: string } | null;
  startAt: string;
  endAt: string;
  notes: string | null;
  services: Array<{
    serviceId: number;
    serviceName: string;
    quantity: number;
    durationMinutes: number;
    unitPrice: number;
    lineTotal: number;
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
