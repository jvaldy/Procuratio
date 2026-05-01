import { FormEvent, useEffect, useState } from 'react';
import { listServices } from '../../api/stock';
import { confirmBookingSession, listBookingSlots, openBookingSession } from '../../api/booking';
import type { ServiceItem } from '../../types/stock';
import type { BookingSlot } from '../../types/booking';
import { apiRequest } from '../../api/client';

type Employee = { id: number; fullName: string };

export function BookingPage() {
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [serviceId, setServiceId] = useState<number>(0);
  const [employeeId, setEmployeeId] = useState<number>(0);
  const [date, setDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [paymentMode, setPaymentMode] = useState<'online' | 'in_store'>('in_store');
  const [slots, setSlots] = useState<BookingSlot[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const [servicesRes, employeesRes] = await Promise.all([
        listServices(new URLSearchParams({ page: '1', perPage: '50' })),
        apiRequest<{ data: Employee[] }>('/api/v1/public/booking/employees'),
      ]);
      setServices(servicesRes.data.filter((item) => item.isActive));
      setEmployees(employeesRes.data);
    })().catch((err) => setError((err as Error).message));
  }, []);

  async function loadSlots(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    if (!serviceId) {
      setError('Selectionne un service.');
      return;
    }

    setLoading(true);
    try {
      const from = date;
      const to = date;
      const response = await listBookingSlots(serviceId, from, to, employeeId || undefined);
      setSlots(response.data);
      if (response.data.length === 0) {
        setMessage('Aucun creneau disponible pour cette date.');
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function book(slot: BookingSlot) {
    setError(null);
    setMessage(null);
    setLoading(true);
    try {
      const session = await openBookingSession({
        serviceId,
        employeeId: slot.employee.id,
        startAt: slot.startAt,
        paymentMode,
      });
      const appointment = await confirmBookingSession(session.token);
      setMessage(`Reservation confirmee pour le ${new Date(appointment.startAt).toLocaleString()}.`);
      setSlots([]);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="stack">
      <h2 className="page-title">Reserver un rendez-vous</h2>
      <form className="panel row" onSubmit={loadSlots}>
        <select value={serviceId} onChange={(e) => setServiceId(Number(e.target.value))}>
          <option value={0}>Choisir un service</option>
          {services.map((service) => (
            <option key={service.id} value={service.id}>{service.name} ({service.durationMinutes} min)</option>
          ))}
        </select>
        <select value={employeeId} onChange={(e) => setEmployeeId(Number(e.target.value))}>
          <option value={0}>Employe (optionnel)</option>
          {employees.map((employee) => (
            <option key={employee.id} value={employee.id}>{employee.fullName}</option>
          ))}
        </select>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <select value={paymentMode} onChange={(e) => setPaymentMode(e.target.value as 'online' | 'in_store')}>
          <option value="in_store">Paiement en magasin</option>
          <option value="online">Paiement en ligne</option>
        </select>
        <button type="submit" disabled={loading}>Chercher des creneaux</button>
      </form>
      {error && <p className="error">{error}</p>}
      {message && <p>{message}</p>}
      <div className="panel stack">
        {slots.length === 0 ? (
          <p>Aucun creneau charge.</p>
        ) : (
          slots.map((slot) => (
            <div className="row panel" key={`${slot.employee.id}-${slot.startAt}`}>
              <strong>{new Date(slot.startAt).toLocaleString()} - {new Date(slot.endAt).toLocaleTimeString()}</strong>
              <span>{slot.employee.name}</span>
              <button onClick={() => book(slot)} disabled={loading}>Reserver</button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
