import { Navigate, Route, Routes } from 'react-router-dom';
import Login from './pages/Login';
import RegisterPage from './pages/RegisterPage';
import Dashboard from './pages/Dashboard';
import Vote from './pages/Vote';
import Admin from './pages/Admin';
import Results from './pages/Results';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute requiredRole="voter">
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/vote"
        element={
          <ProtectedRoute requiredRole="voter">
            <Vote />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <ProtectedRoute requiredRole="admin">
            <Admin />
          </ProtectedRoute>
        }
      />
      <Route
        path="/results"
        element={
          <ProtectedRoute>
            <Results />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default App;
