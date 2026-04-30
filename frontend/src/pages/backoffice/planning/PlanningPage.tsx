import { useEffect, useMemo, useState } from 'react';
import { cancelAppointment, createAppointment, createAvailability, listAppointments, listAvailability, listEmployees, updateAppointment } from '../../../api/planning';
import { listServices } from '../../../api/stock';
import type { PlanningAppointment, PlanningAvailability, PlanningEmployee } from '../../../types/planning';
import type { ServiceItem } from '../../../types/stock';

export function PlanningPage() {
  const [view, setView] = useState<'day' | 'week' | 'month' | 'year'>('week');
  const [anchorDate, setAnchorDate] = useState(new Date().toISOString().slice(0, 10));
  const [employees, setEmployees] = useState<PlanningEmployee[]>([]);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [appointments, setAppointments] = useState<PlanningAppointment[]>([]);
  const [availability, setAvailability] = useState<PlanningAvailability[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [editingAppointmentId, setEditingAppointmentId] = useState<number | null>(null);

  const [form, setForm] = useState({
    employeeId: '',
    customerId: '',
    startAt: '',
    serviceId: '',
    quantity: '1',
    notes: '',
  });

  const [availabilityForm, setAvailabilityForm] = useState({
    employeeId: '',
    dayOfWeek: '1',
    startTime: '09:00',
    endTime: '18:00',
  });

  const selectedEmployeeId = useMemo(() => (form.employeeId ? Number(form.employeeId) : undefined), [form.employeeId]);

  async function refreshAppointments(employeeId = selectedEmployeeId) {
    const params = new URLSearchParams({ view, date: anchorDate });
    if (employeeId) params.set('employeeId', String(employeeId));
    const result = await listAppointments(params);
    setAppointments(result.data);
  }

  async function refreshAvailability(employeeId: number) {
    setAvailability(await listAvailability(employeeId));
  }

  useEffect(() => {
    (async () => {
      try {
        const emps = await listEmployees();
        setEmployees(emps);
        const srv = await listServices(new URLSearchParams({ page: '1', perPage: '100', active: 'true' }));
        setServices(srv.data);
        await refreshAppointments();
      } catch (e) {
        setError((e as Error).message);
      }
    })();
  }, []);

  useEffect(() => {
    refreshAppointments().catch((e) => setError((e as Error).message));
  }, [view, anchorDate]);

  async function submitAppointment() {
    setError(null);
    const payload = {
      employeeId: Number(form.employeeId),
      customerId: form.customerId ? Number(form.customerId) : null,
      startAt: form.startAt,
      notes: form.notes,
      services: [{ serviceId: Number(form.serviceId), quantity: Number(form.quantity) }],
    };

    try {
      if (editingAppointmentId) {
        await updateAppointment(editingAppointmentId, payload);
      } else {
        await createAppointment(payload);
      }
      await refreshAppointments();
      setEditingAppointmentId(null);
      setForm({ employeeId: '', customerId: '', startAt: '', serviceId: '', quantity: '1', notes: '' });
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function startEdit(appointment: PlanningAppointment) {
    setEditingAppointmentId(appointment.id);
    setForm({
      employeeId: String(appointment.employee.id),
      customerId: appointment.customer?.id ? String(appointment.customer.id) : '',
      startAt: appointment.startAt.slice(0, 16),
      serviceId: String(appointment.services[0]?.serviceId ?? ''),
      quantity: String(appointment.services[0]?.quantity ?? 1),
      notes: appointment.notes ?? '',
    });
  }

  async function onCancelAppointment(appointmentId: number) {
    setError(null);
    try {
      await cancelAppointment(appointmentId);
      await refreshAppointments();
      if (editingAppointmentId === appointmentId) {
        setEditingAppointmentId(null);
      }
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function submitAvailability() {
    setError(null);
    try {
      await createAvailability({
        employeeId: Number(availabilityForm.employeeId),
        dayOfWeek: Number(availabilityForm.dayOfWeek),
        startTime: availabilityForm.startTime,
        endTime: availabilityForm.endTime,
        isAvailable: true,
      });
      if (availabilityForm.employeeId) {
        await refreshAvailability(Number(availabilityForm.employeeId));
      }
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <div className="stack">
      <h1 className="page-title">Planning Interne</h1>
      <div className="panel row">
        <label>Vue</label>
        <select data-testid="planning-view" value={view} onChange={(e) => setView(e.target.value as 'day' | 'week' | 'month' | 'year')}>
          <option value="day">Jour</option>
          <option value="week">Semaine</option>
          <option value="month">Mois</option>
          <option value="year">Annee</option>
        </select>
        <input data-testid="planning-date" type="date" value={anchorDate} onChange={(e) => setAnchorDate(e.target.value)} />
      </div>

      <div className="panel stack">
        <h3>{editingAppointmentId ? `Modifier rendez-vous #${editingAppointmentId}` : 'Nouveau rendez-vous'}</h3>
        <div className="row">
          <select data-testid="planning-employee" className="grow" value={form.employeeId} onChange={(e) => setForm({ ...form, employeeId: e.target.value })}>
            <option value="">Employe</option>
            {employees.map((e) => <option key={e.id} value={e.id}>{e.fullName}</option>)}
          </select>
          <input data-testid="planning-customer-id" className="grow" placeholder="Client ID (optionnel)" value={form.customerId} onChange={(e) => setForm({ ...form, customerId: e.target.value })} />
          <input data-testid="planning-start-at" className="grow" type="datetime-local" value={form.startAt} onChange={(e) => setForm({ ...form, startAt: e.target.value })} />
        </div>
        <div className="row">
          <select data-testid="planning-service" className="grow" value={form.serviceId} onChange={(e) => setForm({ ...form, serviceId: e.target.value })}>
            <option value="">Service</option>
            {services.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.durationMinutes ?? 45} min)</option>)}
          </select>
          <input data-testid="planning-quantity" className="grow" placeholder="Quantite" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
          <input data-testid="planning-notes" className="grow" placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          <button data-testid="planning-submit" onClick={submitAppointment}>{editingAppointmentId ? 'Enregistrer' : 'Creer RDV'}</button>
          {editingAppointmentId && <button onClick={() => {
            setEditingAppointmentId(null);
            setForm({ employeeId: '', customerId: '', startAt: '', serviceId: '', quantity: '1', notes: '' });
          }}>Annuler edition</button>}
        </div>
      </div>

      <div className="panel stack">
        <h3>Disponibilites employe</h3>
        <div className="row">
          <select data-testid="availability-employee" className="grow" value={availabilityForm.employeeId} onChange={async (e) => {
            setAvailabilityForm({ ...availabilityForm, employeeId: e.target.value });
            if (e.target.value) await refreshAvailability(Number(e.target.value));
          }}>
            <option value="">Employe</option>
            {employees.map((e) => <option key={e.id} value={e.id}>{e.fullName}</option>)}
          </select>
          <select data-testid="availability-day" value={availabilityForm.dayOfWeek} onChange={(e) => setAvailabilityForm({ ...availabilityForm, dayOfWeek: e.target.value })}>
            <option value="1">Lundi</option><option value="2">Mardi</option><option value="3">Mercredi</option><option value="4">Jeudi</option>
            <option value="5">Vendredi</option><option value="6">Samedi</option><option value="7">Dimanche</option>
          </select>
          <input data-testid="availability-start" type="time" value={availabilityForm.startTime} onChange={(e) => setAvailabilityForm({ ...availabilityForm, startTime: e.target.value })} />
          <input data-testid="availability-end" type="time" value={availabilityForm.endTime} onChange={(e) => setAvailabilityForm({ ...availabilityForm, endTime: e.target.value })} />
          <button data-testid="availability-submit" onClick={submitAvailability}>Ajouter</button>
        </div>
        <table data-testid="planning-appointments-table">
          <thead><tr><th>Jour</th><th>Debut</th><th>Fin</th></tr></thead>
          <tbody>
            {availability.map((a) => (
              <tr key={a.id}><td>{a.dayOfWeek}</td><td>{a.startTime}</td><td>{a.endTime}</td></tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="panel stack">
        <h3>Rendez-vous ({appointments.length})</h3>
        <table>
          <thead><tr><th>Debut</th><th>Fin</th><th>Employe</th><th>Client</th><th>Statut</th><th>Services</th><th>Actions</th></tr></thead>
          <tbody>
            {appointments.map((a) => (
              <tr key={a.id} data-testid={`planning-row-${a.id}`}>
                <td>{new Date(a.startAt).toLocaleString()}</td>
                <td>{new Date(a.endAt).toLocaleString()}</td>
                <td>{a.employee.fullName}</td>
                <td>{a.customer?.fullName ?? '-'}</td>
                <td>{a.status}</td>
                <td>{a.services.map((s) => `${s.serviceName} x${s.quantity}`).join(', ')}</td>
                <td className="row">
                  <button data-testid={`planning-edit-${a.id}`} onClick={() => startEdit(a)}>Modifier</button>
                  <button data-testid={`planning-cancel-${a.id}`} onClick={() => onCancelAppointment(a.id)} disabled={a.status === 'cancelled'}>Annuler</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {error && <p className="error">{error}</p>}
    </div>
  );
}
