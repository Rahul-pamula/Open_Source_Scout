import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Radar } from './pages/Radar';
import { Dossier } from './pages/Dossier';
import { Operations } from './pages/Operations';
import { Identity } from './pages/Identity';
import { Uplink } from './pages/Uplink';
import { Login } from './pages/Login';
import { Onboarding } from './pages/Onboarding';
import { AuthProvider, useAuth } from './contexts/AuthContext';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  
  if (loading) return <div className="flex min-h-screen items-center justify-center text-zinc-500">Loading session...</div>;
  if (!user) return <Navigate to="/login" replace />;
  
  return <>{children}</>;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
          <Route path="/" element={<Layout />}>
            <Route index element={<Radar />} />
            <Route path="dossier/:owner/:repo/:number" element={<Dossier />} />
            {/* Protected Routes */}
            <Route path="operations" element={<ProtectedRoute><Operations /></ProtectedRoute>} />
            <Route path="identity" element={<ProtectedRoute><Identity /></ProtectedRoute>} />
            <Route path="uplink" element={<ProtectedRoute><Uplink /></ProtectedRoute>} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
