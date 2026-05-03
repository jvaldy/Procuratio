import { useEffect, useMemo, useState } from 'react';
import { cancelAppointment, createAppointment, listAppointments, listEmployees } from '../../../api/planning';
import { listServices } from '../../../api/stock';
import type { PlanningAppointment, PlanningEmployee } from '../../../types/planning';
import type { ServiceItem } from '../../../types/stock';

const HOUR_SLOTS = ['8:00', '8:30', '9:00', '9:30', '10:00', '10:30', '11:00', '11:30', '12:00'];
const SLOT_HEIGHT = 56; // px per 30 min
const BASE_HOUR = 8;

function timeToOffset(isoString: string): number {
  const d = new Date(isoString);
  const mins = d.getHours() * 60 + d.getMinutes();
  return ((mins - BASE_HOUR * 60) / 30) * SLOT_HEIGHT;
}

function employeeColumn(empId: number, employees: PlanningEmployee[]): number {
  return employees.findIndex((e) => e.id === empId);
}

function nowOffset(): number {
  const now = new Date();
  const mins = now.getHours() * 60 + now.getMinutes();
  const offset = ((mins - BASE_HOUR * 60) / 30) * SLOT_HEIGHT;
  return Math.max(0, offset);
}

export function PlanningPage() {
  const [view, setView]           = useState<'day' | 'week' | 'month' | 'year'>('week');
  const [anchorDate, setAnchorDate] = useState(new Date().toISOString().slice(0, 10));
  const [employees, setEmployees] = useState<PlanningEmployee[]>([]);
  const [services, setServices]   = useState<ServiceItem[]>([]);
  const [appointments, setAppointments] = useState<PlanningAppointment[]>([]);
  const [error, setError]         = useState<string | null>(null);
  const [form, setForm]           = useState({
    employeeId: '',
    customerId: '',
    startAt: '',
    serviceId: '',
    quantity: '1',
    notes: '',
  });

  const displayDate = useMemo(() => {
    const d = new Date(anchorDate + 'T12:00:00');
    return {
      prevMonth: d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase(),
      month: d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase(),
      day: String(d.getDate()).padStart(2, '0'),
    };
  }, [anchorDate]);

  async function refreshAppointments(employeeId?: number) {
    const params = new URLSearchParams({ view, date: anchorDate });
    if (employeeId) params.set('employeeId', String(employeeId));
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

  function shiftDate(delta: number) {
    const d = new Date(anchorDate + 'T12:00:00');
    d.setDate(d.getDate() + delta);
    setAnchorDate(d.toISOString().slice(0, 10));
  }

  const visibleEmployees = employees.slice(0, 6);
  const colCount = Math.max(visibleEmployees.length, 1);
  const colPct = 100 / colCount;
  const nowLine = nowOffset();
  const showNow = nowLine >= 0 && nowLine <= HOUR_SLOTS.length * SLOT_HEIGHT;

  return (
    <div className="reference-screen planning-reference">
      {/* ── Custom planning topbar ──────────────────────── */}
      <header className="planning-topbar">
        <div className="planning-topbar-left">
          <span className="planning-prev-month">
            {displayDate.prevMonth}
          </span>
          <div className="planning-grid-icon" aria-hidden="true">
            {Array.from({ length: 9 }).map((_, i) => (
              <span key={i} />
            ))}
          </div>
        </div>

        <div className="planning-topbar-center">
          <button className="planning-nav-btn" onClick={() => shiftDate(-7)} title="Semaine précédente">
            ‹
          </button>
          <div className="planning-date-display">
            <span className="planning-curr-month">{displayDate.month}</span>
            <span className="planning-curr-day">{displayDate.day}</span>
          </div>
          <button className="planning-nav-btn" onClick={() => shiftDate(7)} title="Semaine suivante">
            ›
          </button>
        </div>

        <div className="planning-topbar-right">
          <button className="ref-icon-btn" title="Vue calendrier">⊞</button>
          <select
            data-testid="planning-employee"
            className="planning-staff-select"
            value={form.employeeId}
            onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
          >
            <option value="">All staff members</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>{emp.fullName}</option>
            ))}
          </select>
        </div>
      </header>

      {/* View / date controls (accessible for tests) */}
      <div style={{ display: 'none' }}>
        <select data-testid="planning-view" value={view} onChange={(e) => setView(e.target.value as 'day' | 'week' | 'month' | 'year')}>
          <option value="day">Jour</option>
          <option value="week">Semaine</option>
          <option value="month">Mois</option>
          <option value="year">Année</option>
        </select>
        <input data-testid="planning-date" type="date" value={anchorDate} onChange={(e) => setAnchorDate(e.target.value)} />
      </div>

      {/* ── Calendar board ──────────────────────────────── */}
      <div className="planning-board">
        {/* Hour column */}
        <div className="planning-hours">
          {HOUR_SLOTS.map((slot) => (
            <div key={slot}>{slot}</div>
          ))}
        </div>

        {/* Grid */}
        <div className="planning-grid">
          <div
            className="planning-grid-header"
            style={{ gridTemplateColumns: `repeat(${colCount}, minmax(120px, 1fr))` }}
          >
            {visibleEmployees.length > 0
              ? visibleEmployees.map((emp) => (
                  <span key={emp.id}>{emp.fullName}</span>
                ))
              : <span>Aucun employe charge</span>}
          </div>

          <div className="planning-cells">
            {/* Now indicator */}
            {showNow && (
              <div className="planning-now-line" style={{ top: nowLine }}>
                <div className="planning-now-dot" />
              </div>
            )}

            {/* Appointment cards */}
            {appointments.slice(0, 12).map((appt, idx) => {
              const colIdx = employeeColumn(appt.employee.id, visibleEmployees);
              const top = timeToOffset(appt.startAt);
              const left = colIdx >= 0 ? `calc(${colIdx * colPct}% + 5px)` : '5px';
              const width = `calc(${colPct}% - 10px)`;

              return (
                <article
                  key={appt.id}
                  className={`planning-card tint-${idx % 4}`}
                  data-testid={`planning-row-${appt.id}`}
                  style={{ top: Math.max(0, top), left, width }}
                >
                  <strong>{appt.customer?.fullName ?? 'Client'}</strong>
                  <div className="planning-card-service">
                    <div className="planning-card-dot" />
                    {appt.services[0]?.serviceName ?? 'Service'}
                  </div>
                  <div className="planning-card-actions">
                    <button title="Détails">⊞</button>
                    <button title="Infos">ⓘ</button>
                    <button
                      data-testid={`planning-cancel-${appt.id}`}
                      onClick={() => onCancelAppointment(appt.id)}
                      title="Annuler"
                    >
                      ×
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Booking form ───────────────────────────────── */}
      <div className="planning-form-panel">
        <input
          data-testid="planning-customer-id"
          className="grow"
          placeholder="Client ID"
          value={form.customerId}
          onChange={(e) => setForm({ ...form, customerId: e.target.value })}
        />
        <input
          data-testid="planning-start-at"
          className="grow"
          type="datetime-local"
          value={form.startAt}
          onChange={(e) => setForm({ ...form, startAt: e.target.value })}
        />
        <select
          data-testid="planning-service"
          className="grow"
          value={form.serviceId}
          onChange={(e) => setForm({ ...form, serviceId: e.target.value })}
        >
          <option value="">Service</option>
          {services.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        <input
          data-testid="planning-quantity"
          placeholder="Qté"
          value={form.quantity}
          onChange={(e) => setForm({ ...form, quantity: e.target.value })}
          style={{ width: 64 }}
        />
        <select
          value={form.employeeId}
          onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
          style={{ minWidth: 140 }}
        >
          <option value="">Employé</option>
          {employees.map((emp) => (
            <option key={emp.id} value={emp.id}>{emp.fullName}</option>
          ))}
        </select>
        <button data-testid="planning-submit" onClick={submitAppointment}>
          Créer RDV
        </button>
      </div>

      {error && <p className="error" style={{ margin: '0 14px 14px' }}>{error}</p>}
    </div>
  );
}
