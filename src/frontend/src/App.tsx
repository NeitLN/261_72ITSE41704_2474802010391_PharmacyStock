import type { ReactNode } from 'react';
import { Route, Routes } from 'react-router-dom';
import { RequireScreen, RequireSignIn, StartPage } from './auth/guards';
import { MainLayout } from './layouts/MainLayout';
import { AdministrationPage } from './pages/AdministrationPage';
import { CataloguePage } from './pages/CataloguePage';
import { DispensingPage } from './pages/DispensingPage';
import { LoginPage } from './pages/LoginPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { ReportsPage } from './pages/ReportsPage';
import { SalesPage } from './pages/SalesPage';
import { SuppliersPage } from './pages/SuppliersPage';

const screens: { path: string; element: ReactNode }[] = [
  { path: '/catalogue', element: <CataloguePage /> },
  { path: '/suppliers', element: <SuppliersPage /> },
  { path: '/dispensing', element: <DispensingPage /> },
  { path: '/sales', element: <SalesPage /> },
  { path: '/reports', element: <ReportsPage /> },
  { path: '/administration', element: <AdministrationPage /> },
];

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <RequireSignIn>
            <MainLayout />
          </RequireSignIn>
        }
      >
        <Route index element={<StartPage />} />
        {screens.map(({ path, element }) => (
          <Route
            key={path}
            path={path.slice(1)}
            element={<RequireScreen path={path}>{element}</RequireScreen>}
          />
        ))}
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
