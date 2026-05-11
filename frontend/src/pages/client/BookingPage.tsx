import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  cancelClientAppointment,
  confirmBookingSession,
  getClientAppointment,
  listBookableEmployees,
  listBookingSlots,
  listClientAppointments,
  openBookingSession,
  rescheduleClientAppointment,
} from '../../api/booking';
import { useNavigate } from 'react-router-dom';
import { listPublicStores } from '../../api/stores';
import { listServices } from '../../api/stock';
import { updateCurrentUserPreferences } from '../../auth/auth';
import { useCurrentUser } from '../../auth/useCurrentUser';
import type { AppointmentHistoryItem, BookingSlot, ClientAppointment } from '../../types/booking';
import type { ServiceItem } from '../../types/stock';
import { InlineNotification } from '../../ui/InlineNotification';
import { formatEuro } from '../../utils/pricing';

type Employee = { id: number; fullName: string };
type StoreOption = { id: number; name: string; code: string; city: string | null };
type Filter = 'upcoming' | 'past' | 'cancelled';

function formatSlotDate(startAt: string, endAt: string): string {
  const start = new Date(startAt);
  const end = new Date(endAt);

  return `${start.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' })} · ${start.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })} - ${end.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;
}

function formatAppointmentDate(date: string): string {
  return new Date(date).toLocaleString('en-GB', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatShortTime(date: string): string {
  return new Date(date).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function statusLabel(status: string): string {
  if (status === 'cancelled') return 'Cancelled';
  if (status === 'completed') return 'Completed';
  return 'Scheduled';
}

export function BookingPage() {
  const { user } = useCurrentUser();
  const navigate = useNavigate();
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [stores, setStores] = useState<StoreOption[]>([]);
  const [storeId, setStoreId] = useState<number>(0);
  const [serviceId, setServiceId] = useState<number>(0);
  const [employeeId, setEmployeeId] = useState<number>(0);
  const [date, setDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [paymentMode, setPaymentMode] = useState<'online' | 'in_store'>('in_store');
  const [notes, setNotes] = useState('');
  const [slots, setSlots] = useState<BookingSlot[]>([]);
  const [selectedSlotKey, setSelectedSlotKey] = useState<string | null>(null);
  const [showSlotsModal, setShowSlotsModal] = useState(false);
  const [appointmentsFilter, setAppointmentsFilter] = useState<Filter>('upcoming');
  const [appointments, setAppointments] = useState<ClientAppointment[]>([]);
  const [selectedAppointment, setSelectedAppointment] = useState<ClientAppointment | null>(null);
  const [history, setHistory] = useState<AppointmentHistoryItem[]>([]);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [appointmentsLoading, setAppointmentsLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const [servicesRes, storesRes] = await Promise.all([
        listServices(new URLSearchParams({ page: '1', perPage: '50', active: 'true' })),
        listPublicStores(),
      ]);
      setServices(servicesRes.data.filter((item) => item.isActive));
      setStores(storesRes.data);
      setStoreId(user?.preferredStore?.id ?? storesRes.data[0]?.id ?? 0);
    })().catch((err) => setError((err as Error).message));
  }, [user?.preferredStore?.id]);

  useEffect(() => {
    if (!storeId) {
      setEmployees([]);
      return;
    }

    listBookableEmployees(storeId)
      .then((response) => setEmployees(response.data))
      .catch((err) => setError((err as Error).message));
  }, [storeId]);

  async function loadAppointments(activeFilter = appointmentsFilter) {
    setAppointmentsLoading(true);
    try {
      const response = await listClientAppointments(activeFilter);
      setAppointments(response.data);
      if (selectedAppointment) {
        const refreshed = response.data.find((item) => item.id === selectedAppointment.id) ?? null;
        setSelectedAppointment(refreshed);
      }
    } finally {
      setAppointmentsLoading(false);
    }
  }

  useEffect(() => {
    loadAppointments().catch((err) => setError((err as Error).message));
  }, [appointmentsFilter]);

  const selectedService = useMemo(
    () => services.find((service) => service.id === serviceId) ?? null,
    [services, serviceId],
  );

  const selectedEmployee = useMemo(
    () => employees.find((employee) => employee.id === employeeId) ?? null,
    [employees, employeeId],
  );

  const selectedSlot = slots.find((slot) => `${slot.employee.id}-${slot.startAt}` === selectedSlotKey) ?? null;
  const selectedAppointmentEndTime = selectedAppointment ? formatShortTime(selectedAppointment.endAt) : '';
  const selectedAppointmentTotal = selectedAppointment
    ? selectedAppointment.services.reduce((sum, service) => sum + service.lineTotal, 0)
    : 0;

  async function loadSlots(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setInfo(null);
    setSelectedSlotKey(null);

    if (!serviceId) {
      setError('Choose a service first.');
      return;
    }
    if (!storeId) {
      setError('Choose a store first.');
      return;
    }

    setLoading(true);
    try {
      const response = await listBookingSlots(serviceId, date, date, employeeId || undefined, storeId);
      setSlots(response.data);
      setShowSlotsModal(true);
      if (response.data.length === 0) {
        setInfo('No slot is available for this date. Try another employee or another day.');
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function bookSelectedSlot(): Promise<boolean> {
    if (!selectedSlot || !selectedService) return false;

    setError(null);
    setMessage(null);
    setInfo(null);
    setLoading(true);
    try {
      const session = await openBookingSession({
        serviceId,
        employeeId: selectedSlot.employee.id,
        startAt: selectedSlot.startAt,
        paymentMode,
        storeId,
      });
      const confirmation = await confirmBookingSession(session.token, notes.trim() || undefined);
      const appointment = confirmation.appointment;
      const requiresPayment = paymentMode === 'online' && Boolean(confirmation.order?.orderNumber);
      setMessage(
        requiresPayment
          ? `Appointment booked for ${formatAppointmentDate(appointment.startAt)}. Complete the payment to confirm the order.`
          : `Booking confirmed for ${formatAppointmentDate(appointment.startAt)}.`
      );
      setSlots([]);
      setSelectedSlotKey(null);
      setNotes('');
      setAppointmentsFilter('upcoming');
      await loadAppointments('upcoming');
      const detail = await getClientAppointment(appointment.id);
      setSelectedAppointment(detail.appointment);
      setHistory(detail.history);
      if (requiresPayment) {
        navigate(`/client/orders/${confirmation.order!.orderNumber}`);
      }
      return true;
    } catch (err) {
      setError((err as Error).message);
      return false;
    } finally {
      setLoading(false);
    }
  }

  async function selectAppointment(id: number) {
    setError(null);
    setInfo(null);
    try {
      const response = await getClientAppointment(id);
      setSelectedAppointment(response.appointment);
      setHistory(response.history);
      setRescheduleDate('');
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function cancelCurrent() {
    if (!selectedAppointment) return;

    setError(null);
    setMessage(null);
    setInfo(null);
    try {
      await cancelClientAppointment(selectedAppointment.id, 'Cancellation from the client area.');
      setMessage('Appointment cancelled successfully.');
      await loadAppointments();
      await selectAppointment(selectedAppointment.id);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function rescheduleCurrent() {
    if (!selectedAppointment || !rescheduleDate) return;

    setError(null);
    setMessage(null);
    setInfo(null);
    try {
      await rescheduleClientAppointment(selectedAppointment.id, { startAt: rescheduleDate });
      setMessage('Appointment rescheduled successfully.');
      await loadAppointments();
      await selectAppointment(selectedAppointment.id);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <div className="stack booking-page-shell booking-page-simple">
      <section className="booking-hero booking-hero-simple">
        <h2 className="page-title">Appointments</h2>
        <p className="muted">Book a visit and manage your appointments from one place.</p>
      </section>

      <div className="stack">
        {message && <InlineNotification tone="success" title="Done" message={message} />}
        {info && <InlineNotification tone="info" title="Information" message={info} />}
        {error && <InlineNotification tone="error" title="Action unavailable" message={error} />}
      </div>

      <div className="booking-simple-grid">
        <div className="panel booking-elevated-panel stack">
          <h3>Book a new appointment</h3>
          <form className="booking-search-panel" onSubmit={loadSlots}>
            <div className="form-field">
              <label htmlFor="booking-store">Store</label>
              <select
                id="booking-store"
                value={storeId}
                onChange={async (event) => {
                  const nextStoreId = Number(event.target.value);
                  setStoreId(nextStoreId);
                  setEmployeeId(0);
                  if (nextStoreId > 0) {
                    await updateCurrentUserPreferences({ preferredStoreId: nextStoreId }).catch(() => undefined);
                  }
                }}
              >
                <option value={0}>Choose a store</option>
                {stores.map((store) => (
                  <option key={store.id} value={store.id}>{store.name}{store.city ? ` · ${store.city}` : ''}</option>
                ))}
              </select>
            </div>

            <div className="form-field">
              <label htmlFor="booking-service">Service</label>
              <select id="booking-service" value={serviceId} onChange={(event) => setServiceId(Number(event.target.value))}>
                <option value={0}>Choose a service</option>
                {services.map((service) => (
                  <option key={service.id} value={service.id}>{service.name} ({service.durationMinutes} min - {formatEuro(service.price)})</option>
                ))}
              </select>
            </div>

            <div className="form-field">
              <label htmlFor="booking-employee">Employee</label>
              <select id="booking-employee" value={employeeId} onChange={(event) => setEmployeeId(Number(event.target.value))}>
                <option value={0}>Any available employee</option>
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>{employee.fullName}</option>
                ))}
              </select>
            </div>

            <div className="form-field">
              <label htmlFor="booking-date">Date</label>
              <input id="booking-date" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
            </div>

            <div className="form-field">
              <label htmlFor="booking-payment-mode">Payment mode</label>
              <select id="booking-payment-mode" value={paymentMode} onChange={(event) => setPaymentMode(event.target.value as 'online' | 'in_store')}>
                <option value="in_store">Pay in store</option>
                <option value="online">Pay online</option>
              </select>
            </div>

            <button data-testid="booking-search-submit" type="submit" disabled={loading}>Search availability</button>
          </form>
        </div>
      </div>

      <section className="booking-appointments-section stack">
        <div className="booking-section-header">
          <div>
            <h3>Your appointments</h3>
            <p className="muted">View your upcoming, past, and cancelled appointments.</p>
          </div>
          <div className="booking-filter-pills">
            <button className={appointmentsFilter === 'upcoming' ? '' : 'btn-soft'} onClick={() => setAppointmentsFilter('upcoming')}>Upcoming</button>
            <button className={appointmentsFilter === 'past' ? '' : 'btn-soft'} onClick={() => setAppointmentsFilter('past')}>Past</button>
            <button className={appointmentsFilter === 'cancelled' ? '' : 'btn-soft'} onClick={() => setAppointmentsFilter('cancelled')}>Cancelled</button>
          </div>
        </div>

        <div className="booking-appointments-grid">
          <div className="panel stack booking-elevated-panel">
            {appointmentsLoading ? (
              <p className="muted">Loading appointments...</p>
            ) : appointments.length === 0 ? (
              <p className="muted">No appointments match this filter.</p>
            ) : (
              appointments.map((appointment) => (
                <button
                  key={appointment.id}
                  type="button"
                  className={`booking-slot-card booking-appointment-card${selectedAppointment?.id === appointment.id ? ' is-selected' : ''}`}
                  onClick={() => selectAppointment(appointment.id)}
                >
                  <strong>{formatAppointmentDate(appointment.startAt)}</strong>
                  <span>{appointment.services.map((service) => service.serviceName).join(', ')}</span>
                  <span className="booking-appointment-meta">
                    {formatEuro(appointment.services.reduce((sum, service) => sum + service.lineTotal, 0))} - {statusLabel(appointment.status)}
                  </span>
                </button>
              ))
            )}
          </div>

          <div className="panel stack booking-elevated-panel">
            {!selectedAppointment ? (
              <p className="muted">Select an appointment to view the details.</p>
            ) : (
              <>
                <div className="booking-appointment-detail">
                  <div>
                    <strong>Appointment #{selectedAppointment.id}</strong>
                    <span>{formatAppointmentDate(selectedAppointment.startAt)} - {selectedAppointmentEndTime}</span>
                  </div>
                  <span className={`status-badge ${selectedAppointment.status === 'completed' ? 'active' : selectedAppointment.status === 'cancelled' ? 'inactive' : 'pending'}`}>
                    {statusLabel(selectedAppointment.status)}
                  </span>
                </div>

                <div className="booking-summary-list">
                  <div>
                    <strong>Employee</strong>
                    <span>{selectedAppointment.employee.fullName}</span>
                  </div>
                  <div>
                    <strong>Store</strong>
                    <span>{selectedAppointment.store?.name ?? 'Store not assigned yet'}</span>
                  </div>
                  <div>
                    <strong>Services</strong>
                    <span>{selectedAppointment.services.map((service) => `${service.serviceName} (${service.durationMinutes} min, ${formatEuro(service.lineTotal)})`).join(', ')}</span>
                  </div>
                  <div>
                    <strong>Total</strong>
                    <span>{formatEuro(selectedAppointmentTotal)}</span>
                  </div>
                  <div>
                    <strong>Payment</strong>
                    <span>{selectedAppointment.paymentMode ?? 'Not defined'} / {selectedAppointment.paymentStatus ?? 'Pending'}</span>
                  </div>
                  {selectedAppointment.notes && (
                    <div>
                      <strong>Notes</strong>
                      <span>{selectedAppointment.notes}</span>
                    </div>
                  )}
                </div>

                {selectedAppointment.status === 'scheduled' && (
                  <div className="booking-detail-actions">
                    <div className="form-field">
                      <label htmlFor="reschedule-date">Reschedule date and time</label>
                      <input id="reschedule-date" type="datetime-local" value={rescheduleDate} onChange={(e) => setRescheduleDate(e.target.value)} />
                    </div>
                    <div className="row">
                      <button className="btn-soft" onClick={rescheduleCurrent} disabled={!rescheduleDate}>Reschedule</button>
                      <button className="btn-danger" onClick={cancelCurrent}>Cancel appointment</button>
                    </div>
                  </div>
                )}

                <div className="stack">
                  <h4>Status history</h4>
                  {history.length === 0 ? (
                    <p className="muted">No history available for this appointment yet.</p>
                  ) : (
                    history.map((item) => (
                      <div className="panel booking-history-card" key={item.id}>
                        <strong>{item.fromStatus ?? 'n/a'} → {item.toStatus}</strong>
                        <p>{item.reason ?? 'No reason provided.'}</p>
                        <small>{formatAppointmentDate(item.createdAt)} ({item.changedBy})</small>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      {showSlotsModal && (
        <div className="modal-backdrop" onClick={() => setShowSlotsModal(false)}>
          <div className="modal-card booking-slots-modal" data-testid="booking-slots-modal" onClick={(event) => event.stopPropagation()}>
            <div className="booking-section-header">
              <div>
                <h3>Available slots</h3>
                <p className="muted">Choose the time that suits you best. When several employees are free at the same time, each option stays bookable.</p>
              </div>
              <button className="btn-ghost" type="button" onClick={() => setShowSlotsModal(false)}>Close</button>
            </div>

            <div className="booking-slots-modal-grid">
              <div className="stack">
                {slots.length === 0 ? (
                  <p className="muted">No slot is available for this date. Try another employee or another day.</p>
                ) : (
                  <div className="booking-slot-list booking-slot-list-modal">
                    {slots.map((slot, index) => {
                      const key = `${slot.employee.id}-${slot.startAt}`;
                      const isSelected = selectedSlotKey === key;

                      return (
                        <button
                          key={key}
                          type="button"
                          data-testid={`booking-slot-${index}`}
                          className={`booking-slot-card${isSelected ? ' is-selected' : ''}`}
                          onClick={() => {
                            setSelectedSlotKey(key);
                          }}
                        >
                          <strong>{formatSlotDate(slot.startAt, slot.endAt)}</strong>
                          <span>{slot.employee.name}</span>
                          {selectedService && <span>{formatEuro(selectedService.price)}</span>}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="panel booking-elevated-panel stack booking-modal-selected-panel" data-testid="booking-selected-modal">
                <h3>Selected booking</h3>
                {!selectedSlot ? (
                  <p className="muted">Choose a slot to review and confirm your booking.</p>
                ) : (
                  <>
                    <div className="booking-confirm-card">
                      <strong>{selectedService?.name ?? 'Service'}</strong>
                      {selectedService && <span>{formatEuro(selectedService.price)} - {selectedService.durationMinutes} min</span>}
                      <span>{formatSlotDate(selectedSlot.startAt, selectedSlot.endAt)}</span>
                      <span>{selectedEmployee?.fullName ?? selectedSlot.employee.name}</span>
                      <span>{stores.find((store) => store.id === storeId)?.name ?? 'No store selected'}</span>
                      <span>{paymentMode === 'online' ? 'Payment online' : 'Payment in store'}</span>
                    </div>

                    <div className="form-field">
                      <label htmlFor="booking-notes-modal">Notes</label>
                      <textarea
                        id="booking-notes-modal"
                        placeholder="Optional note for the salon team."
                        value={notes}
                        onChange={(event) => setNotes(event.target.value)}
                      />
                    </div>

                    <div className="row">
                      <button
                        data-testid="booking-confirm-modal"
                        onClick={async () => {
                          const booked = await bookSelectedSlot();
                          if (booked) {
                            setShowSlotsModal(false);
                          }
                        }}
                        disabled={loading}
                      >
                        {paymentMode === 'online' ? 'Continue to payment' : 'Confirm booking'}
                      </button>
                      <button className="btn-ghost" type="button" onClick={() => setShowSlotsModal(false)}>
                        Close
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
