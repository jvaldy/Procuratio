import { Link } from 'react-router-dom';

export function ClientHomePage() {
  return (
    <div className="client-home-stack">
      <section className="panel ecommerce-home-hero">
        <div className="stack ecommerce-home-copy">
          <span className="eyebrow">Procuratio online</span>
          <h2 className="ecommerce-title">Beauty products and salon bookings, made simple</h2>
          <p className="muted">
            Shop your next routine, reserve key products or book a salon service from one clean customer space.
          </p>
          <div className="row">
            <Link to="/client/catalog" className="cta-link cta-link-primary">Explore products</Link>
            <Link to="/client/booking" className="cta-link cta-link-secondary">Book a service</Link>
          </div>
        </div>
        <div className="ecommerce-home-highlights">
          <div className="summary-tile">
            <span>Online shop</span>
            <strong>Real-time stock</strong>
          </div>
          <div className="summary-tile">
            <span>Easy pickup</span>
            <strong>Store slot selection</strong>
          </div>
          <div className="summary-tile">
            <span>Salon booking</span>
            <strong>Quick availability</strong>
          </div>
        </div>
      </section>

      <section className="client-home-actions">
        <Link to="/client/catalog" className="panel ecommerce-home-tile">
          <span className="eyebrow">Products</span>
          <strong>Shop products</strong>
          <p className="muted">Open the catalog, check stock instantly and add products to your cart in a few seconds.</p>
        </Link>
        <Link to="/client/booking" className="panel ecommerce-home-tile">
          <span className="eyebrow">Services</span>
          <strong>Book a service</strong>
          <p className="muted">Find a free slot, choose your employee if needed and confirm your next appointment smoothly.</p>
        </Link>
      </section>
    </div>
  );
}
