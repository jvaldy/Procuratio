import { useEffect, useMemo, useState } from 'react';
import { cancelAppointment, createAppointment, listAppointments, listEmployees } from '../../../api/planning';
import { listServices } from '../../../api/stock';
import type { PlanningAppointment, PlanningEmployee } from '../../../types/planning';
import type { ServiceItem } from '../../../types/stock';

export function PlanningPage() {
  const [view, setView] = useState<'day' | 'week' | 'month' | 'year'>('week');
  const [anchorDate, setAnchorDate] = useState(new Date().toISOString().slice(0, 10));
  const [employees, setEmployees] = useState<PlanningEmployee[]>([]);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [appointments, setAppointments] = useState<PlanningAppointment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    employeeId: '',
    customerId: '',
    startAt: '',
    serviceId: '',
    quantity: '1',
    notes: '',
  });

  const slots = useMemo(() => ['08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00'], []);

  async function refreshAppointments(employeeId?: number) {
    const params = new URLSearchParams({ view, date: anchorDate });
    if (employeeId) {
      params.set('employeeId', String(employeeId));
    }
    const result = await listAppointments(params);
    setAppointments(result.data);
  }

  useEffect(() => {
    (async () => {
      try {
        const emps = await listEmployees();
        setEmployees(emps);
        const srv = await listServices(new URLSearchParams({ page: '1', perPage: '50', active: 'true' }));
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
    try {
      await createAppointment({
        employeeId: Number(form.employeeId),
        customerId: form.customerId ? Number(form.customerId) : null,
        startAt: form.startAt,
        notes: form.notes,
        services: [{ serviceId: Number(form.serviceId), quantity: Number(form.quantity) }],
      });
      setForm({ employeeId: '', customerId: '', startAt: '', serviceId: '', quantity: '1', notes: '' });
      await refreshAppointments();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function onCancelAppointment(id: number) {
    try {
      await cancelAppointment(id);
      await refreshAppointments();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <div className="reference-screen planning-reference stack">
      <header className="ref-topbar">
        <div className="ref-topbar-left">FEB</div>
        <div className="ref-time">09:15</div>
        <div className="ref-topbar-right">|||</div>
      </header>

      <div className="panel row">
        <select data-testid="planning-view" value={view} onChange={(e) => setView(e.target.value as 'day' | 'week' | 'month' | 'year')}>
          <option value="day">Jour</option>
          <option value="week">Semaine</option>
          <option value="month">Mois</option>
          <option value="year">Annee</option>
        </select>
        <input data-testid="planning-date" type="date" value={anchorDate} onChange={(e) => setAnchorDate(e.target.value)} />
        <select data-testid="planning-employee" className="grow" value={form.employeeId} onChange={(e) => setForm({ ...form, employeeId: e.target.value })}>
          <option value="">All staff members</option>
          {employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.fullName}</option>)}
        </select>
      </div>

      <div className="planning-board">
        <div className="planning-hours">
          {slots.map((slot) => <div key={slot}>{slot}</div>)}
        </div>
        <div className="planning-grid">
          <div className="planning-grid-header">
            {employees.slice(0, 6).map((employee) => <span key={employee.id}>{employee.fullName}</span>)}
          </div>
          <div className="planning-cells">
            {appointments.slice(0, 8).map((appointment, idx) => (
              <article key={appointment.id} className={`planning-card tint-${idx % 4}`} data-testid={`planning-row-${appointment.id}`}>
                <strong>{appointment.customer?.fullName ?? 'Client'}</strong>
                <span>{appointment.services[0]?.serviceName ?? 'Service'}</span>
                <div className="planning-card-actions">
                  <button data-testid={`planning-cancel-${appointment.id}`} onClick={() => onCancelAppointment(appointment.id)}>x</button>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>

      <div className="panel row">
        <input data-testid="planning-customer-id" className="grow" placeholder="Client ID" value={form.customerId} onChange={(e) => setForm({ ...form, customerId: e.target.value })} />
        <input data-testid="planning-start-at" className="grow" type="datetime-local" value={form.startAt} onChange={(e) => setForm({ ...form, startAt: e.target.value })} />
        <select data-testid="planning-service" className="grow" value={form.serviceId} onChange={(e) => setForm({ ...form, serviceId: e.target.value })}>
          <option value="">Service</option>
          {services.map((service) => <option key={service.id} value={service.id}>{service.name}</option>)}
        </select>
        <input data-testid="planning-quantity" placeholder="Qte" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
        <button data-testid="planning-submit" onClick={submitAppointment}>Creer RDV</button>
      </div>
      {error && <p className="error">{error}</p>}
    </div>
  );
}

