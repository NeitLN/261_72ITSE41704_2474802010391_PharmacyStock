import { Navigate, Route, Routes } from 'react-router-dom';
import { MainLayout } from './layouts/MainLayout';
import { CataloguePage } from './pages/CataloguePage';
import { DispensingPage } from './pages/DispensingPage';
import { ReportsPage } from './pages/ReportsPage';
import { SalesPage } from './pages/SalesPage';
import { SuppliersPage } from './pages/SuppliersPage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<MainLayout />}>
        <Route index element={<Navigate to="/catalogue" replace />} />
        <Route path="catalogue" element={<CataloguePage />} />
        <Route path="suppliers" element={<SuppliersPage />} />
        <Route path="dispensing" element={<DispensingPage />} />
        <Route path="sales" element={<SalesPage />} />
        <Route path="reports" element={<ReportsPage />} />
      </Route>
    </Routes>
  );
}
