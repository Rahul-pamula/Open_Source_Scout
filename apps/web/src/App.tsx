import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Landing } from './pages/Landing';
import { Setup } from './pages/Setup';
import { Connect } from './pages/Connect';
import { MissionControl } from './pages/MissionControl';
import { Identity } from './pages/Identity';
import { Uplink } from './pages/Uplink';
import { Onboarding } from './pages/Onboarding';
import { Docs } from './pages/Docs';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { hasSupabaseConfig } from './services/supabase';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  
  if (!hasSupabaseConfig()) return <Navigate to="/connect" replace />;
  if (loading) return <div className="flex min-h-screen items-center justify-center text-zinc-500">Loading session...</div>;
  if (!user) return <Navigate to="/connect" replace />;
  
  return <>{children}</>;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/setup" element={<Setup />} />
          <Route path="/connect" element={<Connect />} />
          
          <Route path="/docs" element={<Docs />}>
            <Route index element={<Navigate to="01_welcome_to_scout" replace />} />
            <Route path="*" element={<Docs />} />
          </Route>
          
          <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
          
          <Route path="/app" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route index element={<MissionControl />} />
            <Route path="identity" element={<Identity />} />
            <Route path="uplink" element={<Uplink />} />
          </Route>
          
          {/* Catch-all redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
