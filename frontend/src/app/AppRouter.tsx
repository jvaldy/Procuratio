import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthGuard } from '../auth/AuthGuard';
import { RoleGuard } from '../auth/RoleGuard';
import { BackOfficeLayout } from '../layouts/BackOfficeLayout';
import { ClientLayout } from '../layouts/ClientLayout';
import { BackOfficeHomePage } from '../pages/backoffice/BackOfficeHomePage';
import { ProductsPage } from '../pages/backoffice/products/ProductsPage';
import { ServicesPage } from '../pages/backoffice/services/ServicesPage';
import { PosPage } from '../pages/backoffice/pos/PosPage';
import { PlanningPage } from '../pages/backoffice/planning/PlanningPage';
import { CrmPage } from '../pages/backoffice/crm/CrmPage';
import { WarehousePage } from '../pages/backoffice/warehouse/WarehousePage';
import { ClientHomePage } from '../pages/client/ClientHomePage';
import { CatalogPage } from '../pages/client/CatalogPage';
import { CartPage } from '../pages/client/CartPage';
import { CheckoutPage } from '../pages/client/CheckoutPage';
import { OrdersPage } from '../pages/client/OrdersPage';
import { OrderDetailPage } from '../pages/client/OrderDetailPage';
import { BookingPage } from '../pages/client/BookingPage';
import { LoginPage } from '../pages/public/LoginPage';

export function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<AuthGuard />}>
        <Route element={<RoleGuard allowed={['ROLE_ADMIN', 'ROLE_EMPLOYEE']} />}>
          <Route path="/backoffice" element={<BackOfficeLayout />}>
            <Route element={<RoleGuard allowed={['ROLE_ADMIN']} redirectTo="/backoffice/pos" />}>
              <Route index element={<BackOfficeHomePage />} />
            </Route>
            <Route path="products" element={<ProductsPage />} />
            <Route path="services" element={<ServicesPage />} />
            <Route path="pos" element={<PosPage />} />
            <Route path="planning" element={<PlanningPage />} />
            <Route path="crm" element={<CrmPage />} />
            <Route path="warehouse" element={<WarehousePage />} />
          </Route>
        </Route>

        <Route element={<RoleGuard allowed={['ROLE_CUSTOMER']} />}>
          <Route path="/client" element={<ClientLayout />}>
            <Route index element={<ClientHomePage />} />
            <Route path="catalog" element={<CatalogPage />} />
            <Route path="cart" element={<CartPage />} />
            <Route path="checkout" element={<CheckoutPage />} />
            <Route path="orders" element={<OrdersPage />} />
            <Route path="orders/:orderNumber" element={<OrderDetailPage />} />
            <Route path="booking" element={<BookingPage />} />
            <Route path="appointments" element={<Navigate to="/client/booking" replace />} />
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
