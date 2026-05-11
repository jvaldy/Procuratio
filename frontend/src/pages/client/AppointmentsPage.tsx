import { useEffect, useState } from 'react';
import {
  cancelClientAppointment,
  getClientAppointment,
  listClientAppointments,
  rescheduleClientAppointment,
} from '../../api/booking';
import type { AppointmentHistoryItem, ClientAppointment } from '../../types/booking';

type Filter = 'upcoming' | 'past' | 'cancelled';

export function AppointmentsPage() {
  const [filter, setFilter] = useState<Filter>('upcoming');
  const [items, setItems] = useState<ClientAppointment[]>([]);
  const [selected, setSelected] = useState<ClientAppointment | null>(null);
  const [history, setHistory] = useState<AppointmentHistoryItem[]>([]);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    const response = await listClientAppointments(filter);
    setItems(response.data);
  }

  useEffect(() => {
    load().catch((err) => setError((err as Error).message));
  }, [filter]);

  async function selectAppointment(id: number) {
    setError(null);
    const response = await getClientAppointment(id);
    setSelected(response.appointment);
    setHistory(response.history);
  }

  async function cancelCurrent() {
    if (!selected) {
      return;
    }
    setError(null);
    setMessage(null);
    try {
      await cancelClientAppointment(selected.id, 'Cancellation requested from the customer area.');
      setMessage('Appointment cancelled.');
      await selectAppointment(selected.id);
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function rescheduleCurrent() {
    if (!selected || !rescheduleDate) {
      return;
    }
    setError(null);
    setMessage(null);
    try {
      await rescheduleClientAppointment(selected.id, { startAt: new Date(rescheduleDate).toISOString() });
      setMessage('Appointment rescheduled.');
      await selectAppointment(selected.id);
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <div className="stack">
      <h2 className="page-title">My appointments</h2>
      <div className="row">
        <button className={filter === 'upcoming' ? '' : 'btn-soft'} onClick={() => setFilter('upcoming')}>Upcoming</button>
        <button className={filter === 'past' ? '' : 'btn-soft'} onClick={() => setFilter('past')}>Past</button>
        <button className={filter === 'cancelled' ? '' : 'btn-soft'} onClick={() => setFilter('cancelled')}>Cancelled</button>
      </div>
      {error && <p className="error">{error}</p>}
      {message && <p>{message}</p>}
      <div className="booking-grid">
        <div className="panel stack">
          {items.length === 0 ? (
            <p>No appointment matches this filter.</p>
          ) : (
            items.map((appointment) => (
              <button key={appointment.id} className="btn-soft booking-item" onClick={() => selectAppointment(appointment.id)}>
                <strong>{new Date(appointment.startAt).toLocaleString()}</strong>
                <span>{appointment.services.map((service) => service.serviceName).join(', ')}</span>
                <span>{appointment.status}</span>
              </button>
            ))
          )}
        </div>

        <div className="panel stack">
          {!selected ? (
            <p>Select an appointment to view its details.</p>
          ) : (
            <>
              <h3>Appointment details #{selected.id}</h3>
              <p>Status: {selected.status}</p>
              <p>Employee: {selected.employee.fullName}</p>
              <p>Start: {new Date(selected.startAt).toLocaleString()}</p>
              <p>End: {new Date(selected.endAt).toLocaleString()}</p>
              <p>Payment: {selected.paymentMode ?? 'not set'} / {selected.paymentStatus ?? 'not set'}</p>
              <div className="row">
                <input type="datetime-local" value={rescheduleDate} onChange={(e) => setRescheduleDate(e.target.value)} />
                <button onClick={rescheduleCurrent}>Reschedule</button>
                <button className="btn-danger" onClick={cancelCurrent}>Cancel</button>
              </div>
              <div className="stack">
                <h4>Status history</h4>
                {history.map((item) => (
                  <div className="panel" key={item.id}>
                    <strong>{item.fromStatus ?? 'n/a'} {'->'} {item.toStatus}</strong>
                    <p>{item.reason ?? 'No reason provided'}</p>
                    <small>{new Date(item.createdAt).toLocaleString()} ({item.changedBy})</small>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
