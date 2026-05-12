import { useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import AdminPage from './pages/AdminPage';
import ClientePage from './pages/ClientePage';
import GiardinierePage from './pages/GiardinierePage';
import './styles/login.css';

function App() {
  const [authenticatedRole, setAuthenticatedRole] = useState<'admin' | 'cliente' | 'giardiniere' | null>(null);

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/geologin"
          element={<LoginPage onLoginSuccess={(role) => setAuthenticatedRole(role)} />}
        />
        <Route path="/login" element={<Navigate to="/geologin" replace />} />
        <Route
          path="/admin"
          element={
            authenticatedRole === 'admin' ? <AdminPage /> : <Navigate to="/geologin" replace />
          }
        />
        <Route
          path="/cliente"
          element={
            authenticatedRole === 'cliente' ? <ClientePage /> : <Navigate to="/geologin" replace />
          }
        />
        <Route
          path="/giardiniere"
          element={
            authenticatedRole === 'giardiniere' ? <GiardinierePage /> : <Navigate to="/geologin" replace />
          }
        />
        <Route path="/" element={<Navigate to="/geologin" replace />} />
        <Route path="*" element={<Navigate to="/geologin" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
