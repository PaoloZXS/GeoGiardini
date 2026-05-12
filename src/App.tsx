import { useState } from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import AdminPage from './pages/AdminPage';
import ClientePage from './pages/ClientePage';
import GiardinierePage from './pages/GiardinierePage';
import './styles/login.css';

function App() {
  const [authenticatedRole, setAuthenticatedRole] = useState<'admin' | 'cliente' | 'giardiniere' | null>(null);

  return (
    <HashRouter>
      <Routes>
        <Route
          path="/"
          element={<LoginPage onLoginSuccess={(role) => setAuthenticatedRole(role)} />}
        />
        <Route
          path="/geologin"
          element={<LoginPage onLoginSuccess={(role) => setAuthenticatedRole(role)} />}
        />
        <Route path="/login" element={<Navigate to="/" replace />} />
        <Route
          path="/admin"
          element={
            authenticatedRole === 'admin' ? <AdminPage /> : <Navigate to="/" replace />
          }
        />
        <Route
          path="/cliente"
          element={
            authenticatedRole === 'cliente' ? <ClientePage /> : <Navigate to="/" replace />
          }
        />
        <Route
          path="/giardiniere"
          element={
            authenticatedRole === 'giardiniere' ? <GiardinierePage /> : <Navigate to="/" replace />
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
