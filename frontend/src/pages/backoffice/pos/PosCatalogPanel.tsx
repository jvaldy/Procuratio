import { defaultProductImageUrl } from '../../../utils/productVisual';
import { toPriceInclVat } from '../../../utils/pricing';
import type { CatalogEntry } from './posDraft';
import { formatPosCurrency, servicePreviewImage } from './posDraft';

type PosCatalogPanelProps = {
  catalogPage: number;
  catalogTotalPages: number;
  catalogView: 'all' | 'product' | 'service';
  displayClient: string;
  paginatedCatalog: CatalogEntry[];
  search: string;
  totalItems: number;
  hasActiveSale: boolean;
  nameMarqueeThreshold: number;
  pageSize: number;
  onAddToDraft: (itemType: 'product' | 'service', itemId: number) => void;
  onCatalogPageChange: (page: number) => void;
  onCatalogViewChange: (value: 'all' | 'product' | 'service') => void;
  onCreateTicket: () => void;
  onSearchChange: (value: string) => void;
  canCreateTicket: boolean;
};

export function PosCatalogPanel({
  catalogPage,
  catalogTotalPages,
  catalogView,
  displayClient,
  paginatedCatalog,
  search,
  totalItems,
  hasActiveSale,
  nameMarqueeThreshold,
  pageSize,
  onAddToDraft,
  onCatalogPageChange,
  onCatalogViewChange,
  onCreateTicket,
  onSearchChange,
  canCreateTicket,
}: PosCatalogPanelProps) {
  return (
    <>
      <div className="pos-client-header">
        <h2 className="pos-client-name">{displayClient}</h2>
      </div>

      {!hasActiveSale && (
        <>
          <div className="pos-service-panel">
            <div className="pos-service-panel-head">
              <div>
                <h3 data-testid="pos-cart-count">Catalog</h3>
                <p className="muted">Choose the right item quickly, then add it to the current draft.</p>
              </div>
              <span className="catalog-count-pill">{totalItems} item(s)</span>
            </div>
            <div className="pos-catalog-controls">
              <div className="form-field pos-search-field">
                <label className="sr-only" htmlFor="pos-catalog-search">Search products or services</label>
                <input
                  id="pos-catalog-search"
                  value={search}
                  onChange={(event) => onSearchChange(event.target.value)}
                  placeholder="Repair Shampoo, Balayage, SH-REPAIR-250"
                />
              </div>
              <div className="pos-catalog-tabs">
                <button type="button" className={catalogView === 'all' ? '' : 'btn-soft'} onClick={() => onCatalogViewChange('all')}>All</button>
                <button type="button" className={catalogView === 'product' ? '' : 'btn-soft'} onClick={() => onCatalogViewChange('product')}>Products</button>
                <button type="button" className={catalogView === 'service' ? '' : 'btn-soft'} onClick={() => onCatalogViewChange('service')}>Services</button>
              </div>
            </div>
            <div className="pos-catalog-grid">
              {paginatedCatalog.map((item) => (
                <button
                  data-testid={`pos-add-${item.type}-${item.id}`}
                  key={`${item.type}-${item.id}`}
                  className="pos-catalog-card"
                  onClick={() => onAddToDraft(item.type, item.id)}
                  disabled={!item.isAvailable}
                  title={!item.isAvailable ? 'Out of stock' : undefined}
                >
                  <div className="pos-catalog-card-head">
                    <div className={`pos-catalog-thumb pos-catalog-thumb-${item.imageMode}`}>
                      <img
                        src={item.type === 'product' ? (item.imageUrl || defaultProductImageUrl()) : servicePreviewImage(item.name)}
                        alt={item.name}
                        loading="lazy"
                        onError={(event) => {
                          event.currentTarget.onerror = null;
                          event.currentTarget.src = defaultProductImageUrl();
                        }}
                      />
                    </div>
                    <div className="pos-catalog-card-copy">
                      <div className="pos-catalog-card-top">
                        <span className={`pos-catalog-kind pos-catalog-kind-${item.type}`}>{item.type === 'product' ? 'Product' : 'Service'}</span>
                      </div>
                      <div className="pos-catalog-card-pricing">
                        <strong>{formatPosCurrency(toPriceInclVat(item.price))}</strong>
                        <span className="pos-catalog-inline-meta">
                          {item.type === 'product'
                            ? item.stock !== null
                              ? `${item.stock} in stock`
                              : 'Stock unavailable'
                            : 'Bookable'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="pos-catalog-card-meta">
                    <strong className={`pos-catalog-card-name${item.name.length > nameMarqueeThreshold ? ' is-marquee' : ''}`}>
                      {item.name.length > nameMarqueeThreshold ? (
                        <span className="pos-catalog-card-name-track">
                          <span>{item.name}</span>
                          <span aria-hidden="true">{item.name}</span>
                        </span>
                      ) : (
                        <span>{item.name}</span>
                      )}
                    </strong>
                    <span className="pos-catalog-card-subtitle">{item.subtitle}</span>
                  </div>
                </button>
              ))}
            </div>
            {totalItems === 0 && (
              <div className="panel pos-catalog-empty">
                <strong>No catalog result</strong>
                <span className="muted">Try another keyword or switch between products and services.</span>
              </div>
            )}
            {totalItems > pageSize && (
              <div className="pos-catalog-pagination">
                <button type="button" className="btn-soft btn-xs" disabled={catalogPage === 1} onClick={() => onCatalogPageChange(Math.max(1, catalogPage - 1))}>
                  Previous
                </button>
                <span>Page {catalogPage}/{catalogTotalPages}</span>
                <button
                  type="button"
                  className="btn-soft btn-xs"
                  disabled={catalogPage >= catalogTotalPages}
                  onClick={() => onCatalogPageChange(Math.min(catalogTotalPages, catalogPage + 1))}
                >
                  Next
                </button>
              </div>
            )}
          </div>

          <button
            className="pos-add-service-btn"
            data-testid="pos-create-ticket"
            onClick={onCreateTicket}
            disabled={!canCreateTicket}
          >
            Create ticket
          </button>
        </>
      )}
    </>
  );
}
