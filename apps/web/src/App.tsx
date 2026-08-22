import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Radar } from './pages/Radar';
import { Dossier } from './pages/Dossier';
import { Operations } from './pages/Operations';
import { Identity } from './pages/Identity';
import { Uplink } from './pages/Uplink';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Radar />} />
          <Route path="dossier/:id" element={<Dossier />} />
          <Route path="operations" element={<Operations />} />
          <Route path="identity" element={<Identity />} />
          <Route path="uplink" element={<Uplink />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
