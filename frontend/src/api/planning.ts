import { apiRequest } from './client';
import type { PlanningAppointment, PlanningAvailability, PlanningEmployee } from '../types/planning';

export function listEmployees(): Promise<PlanningEmployee[]> {
  return apiRequest('/api/v1/planning/employees');
}

export function listAppointments(params: URLSearchParams): Promise<{ data: PlanningAppointment[] }> {
  return apiRequest(`/api/v1/planning/appointments?${params.toString()}`);
}

export function createAppointment(payload: unknown): Promise<PlanningAppointment> {
  return apiRequest('/api/v1/planning/appointments', { method: 'POST', body: JSON.stringify(payload) });
}

export function updateAppointment(id: number, payload: unknown): Promise<PlanningAppointment> {
  return apiRequest(`/api/v1/planning/appointments/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
}

export function cancelAppointment(id: number): Promise<PlanningAppointment> {
  return apiRequest(`/api/v1/planning/appointments/${id}/cancel`, { method: 'POST' });
}

export function listAvailability(employeeId: number): Promise<PlanningAvailability[]> {
  return apiRequest(`/api/v1/planning/availabilities?employeeId=${employeeId}`);
}

export function createAvailability(payload: unknown): Promise<PlanningAvailability> {
  return apiRequest('/api/v1/planning/availabilities', { method: 'POST', body: JSON.stringify(payload) });
}
