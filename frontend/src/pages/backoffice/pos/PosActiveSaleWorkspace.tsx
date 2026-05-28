import type { Sale } from '../../../types/pos';

type PosActiveSaleWorkspaceProps = {
  activeCreatedAt: string | null;
  activeSale: Sale;
  activeStatus: string;
  displayClient: string;
  latestPayment: Sale['payments'][number] | null;
  onPrintReceipt: () => void;
  onRequestReturnToDraft: () => void;
  onResume: () => void;
  onSuspend: () => void;
  paymentMethodLabel: (method: string) => string;
  sellerLabel: (sale: Sale | null) => string;
};

export function PosActiveSaleWorkspace({
  activeCreatedAt,
  activeSale,
  activeStatus,
  displayClient,
  latestPayment,
  onPrintReceipt,
  onRequestReturnToDraft,
  onResume,
  onSuspend,
  paymentMethodLabel,
  sellerLabel,
}: PosActiveSaleWorkspaceProps) {
  return (
    <div className="pos-active-workspace">
      <div className="panel pos-ticket-card" data-testid="pos-active-ticket">
        <div className="row"><strong>Ticket #{activeSale.id}</strong><span className="muted">{activeStatus}</span></div>
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
          <button className="btn-soft" data-testid="pos-suspend" onClick={onSuspend} disabled={activeSale.status === 'suspended' || activeSale.status === 'completed'}>Suspend</button>
          <button className="btn-soft" data-testid="pos-resume" onClick={onResume} disabled={activeSale.status !== 'suspended'}>Resume</button>
          {activeSale.status === 'completed' && (
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
          <span>{activeSale.status === 'completed' ? 'Receipt available' : 'Receipt pending payment'}</span>
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
