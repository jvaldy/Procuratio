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
      await cancelClientAppointment(selected.id, 'Annulation depuis l espace client.');
      setMessage('Rendez-vous annule.');
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
      setMessage('Rendez-vous replanifie.');
      await selectAppointment(selected.id);
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <div className="stack">
      <h2 className="page-title">Mes rendez-vous</h2>
      <div className="row">
        <button className={filter === 'upcoming' ? '' : 'btn-soft'} onClick={() => setFilter('upcoming')}>A venir</button>
        <button className={filter === 'past' ? '' : 'btn-soft'} onClick={() => setFilter('past')}>Passes</button>
        <button className={filter === 'cancelled' ? '' : 'btn-soft'} onClick={() => setFilter('cancelled')}>Annules</button>
      </div>
      {error && <p className="error">{error}</p>}
      {message && <p>{message}</p>}
      <div className="booking-grid">
        <div className="panel stack">
          {items.length === 0 ? (
            <p>Aucun rendez-vous pour ce filtre.</p>
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
            <p>Selectionne un rendez-vous pour voir le detail.</p>
          ) : (
            <>
              <h3>Detail rendez-vous #{selected.id}</h3>
              <p>Statut: {selected.status}</p>
              <p>Employe: {selected.employee.fullName}</p>
              <p>Debut: {new Date(selected.startAt).toLocaleString()}</p>
              <p>Fin: {new Date(selected.endAt).toLocaleString()}</p>
              <p>Paiement: {selected.paymentMode ?? 'non defini'} / {selected.paymentStatus ?? 'non defini'}</p>
              <div className="row">
                <input type="datetime-local" value={rescheduleDate} onChange={(e) => setRescheduleDate(e.target.value)} />
                <button onClick={rescheduleCurrent}>Replanifier</button>
                <button className="btn-danger" onClick={cancelCurrent}>Annuler</button>
              </div>
              <div className="stack">
                <h4>Historique de statut</h4>
                {history.map((item) => (
                  <div className="panel" key={item.id}>
                    <strong>{item.fromStatus ?? 'n/a'} {'->'} {item.toStatus}</strong>
                    <p>{item.reason ?? 'Aucune raison'}</p>
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
