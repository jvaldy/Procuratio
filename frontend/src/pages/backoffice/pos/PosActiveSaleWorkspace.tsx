import type { Sale } from '../../../types/pos';

type PosActiveSaleWorkspaceProps = {
  activeCreatedAt: string | null;
  activeSale: Sale;
  displayClient: string;
  latestPayment: Sale['payments'][number] | null;
  onPrintReceipt: () => void;
  onRequestReturnToDraft: () => void;
  onCancelSale: () => void;
  onResume: () => void;
  onSuspend: () => void;
  paymentMethodLabel: (method: string) => string;
  sellerLabel: (sale: Sale | null) => string;
};

export function PosActiveSaleWorkspace({
  activeCreatedAt,
  activeSale,
  displayClient,
  latestPayment,
  onPrintReceipt,
  onRequestReturnToDraft,
  onCancelSale,
  onResume,
  onSuspend,
  paymentMethodLabel,
  sellerLabel,
}: PosActiveSaleWorkspaceProps) {
  function saleStatusBadgeTone(status: string): 'active' | 'inactive' | 'pending' {
    if (status === 'completed') {
      return 'active';
    }

    if (status === 'cancelled') {
      return 'inactive';
    }

    return 'pending';
  }

  function paymentStatusBadgeTone(status: string): 'active' | 'inactive' | 'pending' {
    if (status === 'paid') {
      return 'active';
    }

    if (status === 'cancelled' || status === 'failed') {
      return 'inactive';
    }

    return 'pending';
  }

  function formatStatusLabel(value: string): string {
    return value
      .split('_')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  const isCancelledSale = activeSale.status === 'cancelled';
  const isCompletedSale = activeSale.status === 'completed';

  return (
    <div className="pos-active-workspace">
      <div className="panel pos-ticket-card" data-testid="pos-active-ticket">
        <div className="row">
          <strong>Ticket #{activeSale.id}</strong>
          <div className="pos-ticket-status-badges">
            <span className={`status-badge ${saleStatusBadgeTone(activeSale.status)}`}>{formatStatusLabel(activeSale.status)}</span>
            <span className={`status-badge ${paymentStatusBadgeTone(activeSale.paymentStatus)}`}>{formatStatusLabel(activeSale.paymentStatus)}</span>
          </div>
        </div>
        <div className="row" style={{ marginTop: 8 }}>
          <span className="muted">Seller: {sellerLabel(activeSale)}</span>
          {activeSale.receiptNumber && <span className="muted">Receipt: {activeSale.receiptNumber}</span>}
        </div>
        {activeCreatedAt && (
          <div className="row" style={{ marginTop: 6 }}>
            <span className="muted">Created at: {activeCreatedAt}</span>
          </div>
        )}
        <div className="row" style={{ marginTop: 8 }}>
          <button className="btn-soft" type="button" onClick={onRequestReturnToDraft}>Back</button>
          <button className="btn-soft" data-testid="pos-suspend" onClick={onSuspend} disabled={activeSale.status === 'suspended' || isCompletedSale || isCancelledSale}>Suspend</button>
          <button className="btn-soft" data-testid="pos-resume" onClick={onResume} disabled={activeSale.status !== 'suspended'}>Resume</button>
          {activeSale.canCancel && (
            <button className="btn-soft" type="button" onClick={onCancelSale}>Cancel sale</button>
          )}
          {(isCompletedSale || isCancelledSale) && (
            <button className="btn-soft" type="button" onClick={onPrintReceipt}>Print receipt</button>
          )}
        </div>
      </div>

      <div className="pos-active-overview-grid">
        <div className="panel pos-active-overview-card">
          <small>Customer</small>
          <strong>{displayClient}</strong>
          <span>{activeSale.customer ? 'Linked customer profile' : 'Guest sale / walk-in'}</span>
        </div>
        <div className="panel pos-active-overview-card">
          <small>Seller</small>
          <strong>{sellerLabel(activeSale)}</strong>
          <span>{activeSale.store?.name ?? 'No store attached'}</span>
        </div>
        <div className="panel pos-active-overview-card">
          <small>Receipt</small>
          <strong>{activeSale.receiptNumber ?? `Ticket #${activeSale.id}`}</strong>
          <span>{activeSale.status === 'completed' || activeSale.status === 'cancelled' ? 'Receipt available' : 'Receipt pending payment'}</span>
        </div>
        <div className="panel pos-active-overview-card">
          <small>Payment</small>
          <strong>{latestPayment ? paymentMethodLabel(latestPayment.method) : 'Not charged yet'}</strong>
          <span>{latestPayment ? new Date(latestPayment.paidAt).toLocaleString('en-GB') : 'Waiting for checkout'}</span>
        </div>
      </div>
    </div>
  );
}
