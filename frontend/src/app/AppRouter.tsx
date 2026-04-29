import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthGuard } from '../auth/AuthGuard';
import { BackOfficeLayout } from '../layouts/BackOfficeLayout';
import { ClientLayout } from '../layouts/ClientLayout';
import { BackOfficeHomePage } from '../pages/backoffice/BackOfficeHomePage';
import { ProductsPage } from '../pages/backoffice/products/ProductsPage';
import { ServicesPage } from '../pages/backoffice/services/ServicesPage';
import { ClientHomePage } from '../pages/client/ClientHomePage';
import { LoginPage } from '../pages/public/LoginPage';

export function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<AuthGuard />}>
        <Route path="/backoffice" element={<BackOfficeLayout />}>
          <Route index element={<BackOfficeHomePage />} />
          <Route path="products" element={<ProductsPage />} />
          <Route path="services" element={<ServicesPage />} />
        </Route>
        <Route path="/client" element={<ClientLayout />}>
          <Route index element={<ClientHomePage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
