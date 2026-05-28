import type { CustomerFile } from '../../../types/customers';
import { formatDateOnly, formatDateTime, formatEuro, formatOrderStatus } from '../../../utils/pricing';

export type CustomerFileSection = 'overview' | 'appointments' | 'loyalty' | 'purchases' | 'notifications';

type CustomerTabStripProps = {
  activeSection: CustomerFileSection;
  onSectionChange: (section: CustomerFileSection) => void;
};

type CustomerSectionProps = {
  customerFile: CustomerFile;
};

function serviceListLabel(services: CustomerFile['appointments']['upcoming'][number]['services']): string {
  return services.map((item) => item.serviceName).join(', ');
}

export function CustomerTabStrip({ activeSection, onSectionChange }: CustomerTabStripProps) {
  return (
    <div className="profile-kpi-tabs customer-file-tabs">
      <button type="button" className={`profile-kpi-tab ${activeSection === 'overview' ? 'is-active' : ''}`} onClick={() => onSectionChange('overview')}>
        <span>Focus</span>
        <strong>Overview</strong>
      </button>
      <button type="button" className={`profile-kpi-tab ${activeSection === 'appointments' ? 'is-active' : ''}`} onClick={() => onSectionChange('appointments')}>
        <span>Visits</span>
        <strong>Appointments</strong>
      </button>
      <button type="button" className={`profile-kpi-tab ${activeSection === 'loyalty' ? 'is-active' : ''}`} onClick={() => onSectionChange('loyalty')}>
        <span>Credit</span>
        <strong>Loyalty</strong>
      </button>
      <button type="button" className={`profile-kpi-tab ${activeSection === 'purchases' ? 'is-active' : ''}`} onClick={() => onSectionChange('purchases')}>
        <span>Orders</span>
        <strong>Purchases</strong>
      </button>
      <button type="button" className={`profile-kpi-tab ${activeSection === 'notifications' ? 'is-active' : ''}`} onClick={() => onSectionChange('notifications')}>
        <span>CRM</span>
        <strong>Notifications</strong>
      </button>
    </div>
  );
}

export function CustomerOverviewSection({ customerFile }: CustomerSectionProps) {
  return (
    <>
      <section className="panel stack">
        <div className="profile-section-head">
          <div>
            <h3>Next customer actions</h3>
            <p className="muted">The most useful signals first.</p>
          </div>
        </div>
        <div className="customer-file-columns">
          <article className="customer-file-item-card">
            <strong>Next appointment</strong>
            {customerFile.appointments.upcoming[0] ? (
              <>
                <span>{formatDateTime(customerFile.appointments.upcoming[0].startAt)}</span>
                <small>{customerFile.appointments.upcoming[0].employee.fullName} · {serviceListLabel(customerFile.appointments.upcoming[0].services)}</small>
              </>
            ) : (
              <>
                <span>No upcoming appointment</span>
                <small>Nothing scheduled yet.</small>
              </>
            )}
          </article>
          <article className="customer-file-item-card">
            <strong>Latest web order</strong>
            {customerFile.orders[0] ? (
              <>
                <span>{customerFile.orders[0].orderNumber} · {formatEuro(customerFile.orders[0].total)}</span>
                <small>{formatOrderStatus(customerFile.orders[0].status)} · {formatDateTime(customerFile.orders[0].createdAt)}</small>
              </>
            ) : (
              <>
                <span>No web order yet</span>
                <small>No ecommerce activity recorded.</small>
              </>
            )}
          </article>
          <article className="customer-file-item-card">
            <strong>Loyalty snapshot</strong>
            <span>{customerFile.loyalty.account?.pointsBalance ?? 0} pts</span>
            <small>{customerFile.loyalty.account?.subscriptionName || customerFile.loyalty.account?.visitCardName || 'No active programme'}</small>
          </article>
          <article className="customer-file-item-card">
            <strong>Latest notification</strong>
            {customerFile.notifications[0] ? (
              <>
                <span>{customerFile.notifications[0].kind} · {customerFile.notifications[0].status}</span>
                <small>{formatDateTime(customerFile.notifications[0].createdAt)}</small>
              </>
            ) : (
              <>
                <span>No notification log yet</span>
                <small>No CRM event recorded for this customer.</small>
              </>
            )}
          </article>
        </div>
      </section>

      <section className="panel stack">
        <div className="profile-section-head">
          <div>
            <h3>Recent activity</h3>
            <p className="muted">A compact cross-channel summary.</p>
          </div>
        </div>
        <div className="customer-file-columns">
          <div>
            <h4>Appointments</h4>
            {customerFile.appointments.upcoming.slice(0, 3).map((appointment) => (
              <article key={appointment.id} className="customer-file-item-card">
                <strong>{formatDateTime(appointment.startAt)}</strong>
                <span>{appointment.employee.fullName}</span>
                <small>{serviceListLabel(appointment.services)}</small>
              </article>
            ))}
            {customerFile.appointments.upcoming.length === 0 && <div className="empty-state-card">No upcoming appointment.</div>}
          </div>
          <div>
            <h4>Orders and receipts</h4>
            {customerFile.orders.slice(0, 2).map((order) => (
              <article key={order.id} className="customer-file-item-card">
                <strong>{order.orderNumber}</strong>
                <span>{formatEuro(order.total)} · {formatOrderStatus(order.status)}</span>
                <small>{formatDateTime(order.createdAt)}</small>
              </article>
            ))}
            {customerFile.sales.slice(0, 2).map((sale) => (
              <article key={sale.id} className="customer-file-item-card">
                <strong>{sale.receiptNumber || `Sale #${sale.id}`}</strong>
                <span>{formatEuro(sale.total)} · {formatOrderStatus(sale.paymentStatus)}</span>
                <small>{formatDateTime(sale.createdAt)}</small>
              </article>
            ))}
            {customerFile.orders.length === 0 && customerFile.sales.length === 0 && <div className="empty-state-card">No purchase history yet.</div>}
          </div>
        </div>
      </section>
    </>
  );
}

export function CustomerAppointmentsSection({ customerFile }: CustomerSectionProps) {
  return (
    <section className="panel stack">
      <div className="profile-section-head">
        <div>
          <h3>Appointments</h3>
          <p className="muted">Upcoming and recent visits for this customer.</p>
        </div>
      </div>
      <div className="customer-file-columns">
        <div>
          <h4>Upcoming</h4>
          {customerFile.appointments.upcoming.length === 0 ? <div className="empty-state-card">No upcoming appointment.</div> : customerFile.appointments.upcoming.map((appointment) => (
            <article key={appointment.id} className="customer-file-item-card">
              <strong>{formatDateTime(appointment.startAt)}</strong>
              <span>{appointment.employee.fullName}</span>
              <small>{serviceListLabel(appointment.services)}</small>
            </article>
          ))}
        </div>
        <div>
          <h4>Recent history</h4>
          {customerFile.appointments.history.length === 0 ? <div className="empty-state-card">No appointment history.</div> : customerFile.appointments.history.slice(0, 6).map((entry) => (
            <article key={entry.id} className="customer-file-item-card">
              <strong>{entry.toStatus}</strong>
              <span>{formatDateTime(entry.createdAt)}</span>
              <small>{entry.reason || entry.changedBy}</small>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function CustomerLoyaltySection({ customerFile }: CustomerSectionProps) {
  return (
    <section className="panel stack">
      <div className="profile-section-head">
        <div>
          <h3>Loyalty and gift vouchers</h3>
          <p className="muted">Track points, gift cards and customer credit at a glance.</p>
        </div>
      </div>
      <div className="customer-file-columns">
        <div>
          <h4>Loyalty</h4>
          <div className="summary-tile customer-loyalty-tile">
            <span>Points balance</span>
            <strong>{customerFile.loyalty.account?.pointsBalance ?? 0}</strong>
          </div>
          {customerFile.loyalty.account?.subscriptionName && (
            <article className="customer-file-item-card">
              <strong>{customerFile.loyalty.account.subscriptionName}</strong>
              <span>Subscription {customerFile.loyalty.account.subscriptionStatus}</span>
              <small>
                {customerFile.loyalty.account.subscriptionEndsAt
                  ? `Ends ${formatDateOnly(customerFile.loyalty.account.subscriptionEndsAt)}`
                  : 'No subscription end date'}
              </small>
            </article>
          )}
          {customerFile.loyalty.account?.visitCardName && (
            <article className="customer-file-item-card">
              <strong>{customerFile.loyalty.account.visitCardName}</strong>
              <span>
                {customerFile.loyalty.account.visitCardUsed}/{customerFile.loyalty.account.visitCardTarget ?? 0} visits used
              </span>
              <small>{customerFile.loyalty.account.visitCardActive ? 'Visit card active' : 'Visit card inactive'}</small>
            </article>
          )}
          {customerFile.loyalty.events.slice(0, 6).map((event) => (
            <article key={event.id} className="customer-file-item-card">
              <strong>{event.eventType}</strong>
              <span>{event.pointsDelta > 0 ? `+${event.pointsDelta}` : event.pointsDelta} pts</span>
              <small>{event.reason || formatDateTime(event.createdAt)}</small>
            </article>
          ))}
        </div>
        <div>
          <h4>Gift vouchers</h4>
          {customerFile.giftVouchers.length === 0 ? <div className="empty-state-card">No gift voucher linked.</div> : customerFile.giftVouchers.slice(0, 6).map((voucher) => (
            <article key={voucher.id} className="customer-file-item-card">
              <strong>{voucher.code}</strong>
              <span>{formatEuro(voucher.balanceAmount)} available</span>
              <small>{voucher.recipientName || voucher.serviceLabel || voucher.status}</small>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function CustomerPurchasesSection({ customerFile }: CustomerSectionProps) {
  return (
    <section className="panel stack">
      <div className="profile-section-head">
        <div>
          <h3>Purchases</h3>
          <p className="muted">Recent POS receipts and web orders.</p>
        </div>
      </div>
      <div className="customer-file-columns">
        <div>
          <h4>POS receipts</h4>
          {customerFile.sales.length === 0 ? <div className="empty-state-card">No POS sale yet.</div> : customerFile.sales.slice(0, 6).map((sale) => (
            <article key={sale.id} className="customer-file-item-card">
              <strong>{sale.receiptNumber || `Sale #${sale.id}`}</strong>
              <span>{formatEuro(sale.total)} - {formatOrderStatus(sale.paymentStatus)}</span>
              <small>{formatDateTime(sale.createdAt)}</small>
            </article>
          ))}
        </div>
        <div>
          <h4>Web orders</h4>
          {customerFile.orders.length === 0 ? <div className="empty-state-card">No web order yet.</div> : customerFile.orders.slice(0, 6).map((order) => (
            <article key={order.id} className="customer-file-item-card">
              <strong>{order.orderNumber}</strong>
              <span>{formatEuro(order.total)} - {formatOrderStatus(order.status)}</span>
              <small>{formatDateTime(order.createdAt)}</small>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function CustomerNotificationsSection({ customerFile }: CustomerSectionProps) {
  return (
    <section className="panel stack">
      <div className="profile-section-head">
        <div>
          <h3>Notification history</h3>
          <p className="muted">Latest campaign, reminder or birthday communication logs.</p>
        </div>
      </div>
      {customerFile.notifications.length === 0 ? <div className="empty-state-card">No notification log for this customer.</div> : (
        <div className="customer-file-columns">
          {customerFile.notifications.slice(0, 8).map((log) => (
            <article key={log.id} className="customer-file-item-card">
              <strong>{log.kind}</strong>
              <span>{log.channel} - {log.status}</span>
              <small>{formatDateTime(log.createdAt)}</small>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
