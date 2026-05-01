import { apiRequest } from './client';
import type { BookingSession, BookingSlot, ClientAppointment, AppointmentHistoryItem } from '../types/booking';

export function listBookingSlots(serviceId: number, from: string, to: string, employeeId?: number): Promise<{ data: BookingSlot[] }> {
  const params = new URLSearchParams({ serviceId: String(serviceId), from, to });
  if (employeeId) {
    params.set('employeeId', String(employeeId));
  }
  return apiRequest(`/api/v1/public/booking/slots?${params.toString()}`);
}

export function openBookingSession(payload: {
  serviceId: number;
  employeeId: number;
  startAt: string;
  paymentMode: 'online' | 'in_store';
}): Promise<BookingSession> {
  return apiRequest('/api/v1/bookings/sessions', { method: 'POST', body: JSON.stringify(payload) });
}

export function confirmBookingSession(token: string, notes?: string): Promise<ClientAppointment> {
  return apiRequest(`/api/v1/bookings/sessions/${token}/confirm`, {
    method: 'POST',
    body: JSON.stringify(notes ? { notes } : {}),
  });
}

export function listClientAppointments(status: 'upcoming' | 'past' | 'cancelled'): Promise<{ data: ClientAppointment[] }> {
  return apiRequest(`/api/v1/client/appointments?status=${status}`);
}

export function getClientAppointment(id: number): Promise<{ appointment: ClientAppointment; history: AppointmentHistoryItem[] }> {
  return apiRequest(`/api/v1/client/appointments/${id}`);
}

export function rescheduleClientAppointment(id: number, payload: { employeeId?: number; startAt: string }): Promise<ClientAppointment> {
  return apiRequest(`/api/v1/client/appointments/${id}/reschedule`, { method: 'POST', body: JSON.stringify(payload) });
}

export function cancelClientAppointment(id: number, reason?: string): Promise<ClientAppointment> {
  return apiRequest(`/api/v1/client/appointments/${id}/cancel`, {
    method: 'POST',
    body: JSON.stringify(reason ? { reason } : {}),
  });
}

