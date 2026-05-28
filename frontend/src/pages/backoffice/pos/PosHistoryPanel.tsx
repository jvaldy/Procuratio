import type { PosCustomerSearchResult, Sale } from '../../../types/pos';

type PosHistoryPanelProps = {
  activeSaleId: number | null;
  activeTab: 'progress' | 'issued';
  customerQuery: string;
  customerResults: PosCustomerSearchResult[];
  historyPage: number;
  historyTotalPages: number;
  leftColumnSales: Sale[];
  paginatedLeftColumnSales: Sale[];
  pageSize: number;
  onActiveTabChange: (tab: 'progress' | 'issued') => void;
  onCustomerQueryChange: (value: string) => void;
  onHistoryPageChange: (page: number) => void;
  onOpenSale: (sale: Sale) => void;
  onRefreshHistory: () => void;
  onSelectCustomer: (customer: PosCustomerSearchResult) => void;
  onStartNewGuestDraft: () => void;
};

export function PosHistoryPanel({
  activeSaleId,
  activeTab,
  customerQuery,
  customerResults,
  historyPage,
  historyTotalPages,
  leftColumnSales,
  paginatedLeftColumnSales,
  pageSize,
  onActiveTabChange,
  onCustomerQueryChange,
  onHistoryPageChange,
  onOpenSale,
  onRefreshHistory,
  onSelectCustomer,
  onStartNewGuestDraft,
}: PosHistoryPanelProps) {
  return (
    <aside className="pos-left">
      <div className="pos-tabs">
        <button className={`tab${activeTab === 'progress' ? ' active' : ''}`} onClick={() => onActiveTabChange('progress')}>In Progress</button>
        <button className={`tab${activeTab === 'issued' ? ' active' : ''}`} onClick={() => onActiveTabChange('issued')}>Receipt Issued</button>
      </div>

      <div className="pos-search-row">
        <div className="form-field pos-search-field">
          <label className="sr-only" htmlFor="pos-history-search">Search customer, receipt, amount or email</label>
          <input
            id="pos-history-search"
            data-testid="pos-customer-id"
            value={customerQuery}
            onChange={(event) => onCustomerQueryChange(event.target.value)}
            placeholder="Ethan Petit, RCT-Y26-0090, 42.90, ethan@mail.com"
          />
        </div>
        <button
          className="round-btn"
          data-testid="pos-refresh-history"
          type="button"
          aria-label="Refresh customer history"
          title="Refresh customer history"
          onClick={onRefreshHistory}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M17.65 6.35A7.95 7.95 0 0 0 12 4V1L7 6l5 5V7a5 5 0 1 1-5 5H5a7 7 0 1 0 12.65-5.65Z" fill="currentColor" />
          </svg>
        </button>
      </div>

      <div className="pos-new-row">
        <button className="pos-new-btn" type="button" onClick={onStartNewGuestDraft}>New</button>
      </div>

      {customerResults.length > 0 && (
        <div className="pos-customer-results">
          {customerResults.map((result) => (
            <button key={result.id} className="pos-customer-result" onClick={() => onSelectCustomer(result)}>
              <strong>{result.fullName}</strong>
              <span>{result.email}</span>
            </button>
          ))}
        </div>
      )}

      {customerResults.length === 0 && (
        <>
          <ul data-testid="pos-history" className="pos-history-list">
            {leftColumnSales.length === 0 && (
              <li className="muted">
                {activeTab === 'progress' ? 'No suspended sales.' : 'No issued receipts for this customer.'}
              </li>
            )}
            {leftColumnSales.length > 0 && paginatedLeftColumnSales.length === 0 && (
              <li className="muted">No ticket matches this search.</li>
            )}
            {paginatedLeftColumnSales.map((sale) => (
              <li key={sale.id}>
                <div className={`pos-history-item${activeSaleId === sale.id ? ' is-active' : ''}`} onClick={() => onOpenSale(sale)}>
                  <div className="phi-name">{sale.receiptNumber ?? `Ticket #${sale.id}`}</div>
                  <div className="phi-meta">
                    {sale.customer?.fullName ?? 'Walk-in customer'}
                  </div>
                  <div className="phi-date">{new Date(sale.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                </div>
              </li>
            ))}
          </ul>

          {leftColumnSales.length > pageSize && (
            <div className="list-pagination pos-history-pagination">
              <button type="button" className="btn-ghost btn-xs" disabled={historyPage === 1} onClick={() => onHistoryPageChange(Math.max(1, historyPage - 1))}>
                Previous
              </button>
              <span>Page {historyPage}/{historyTotalPages}</span>
              <button
                type="button"
                className="btn-ghost btn-xs"
                disabled={historyPage >= historyTotalPages}
                onClick={() => onHistoryPageChange(Math.min(historyTotalPages, historyPage + 1))}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </aside>
  );
}
