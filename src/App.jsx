import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './layout/Layout.jsx';
import Home from './pages/Home.jsx';
import Tentang from './pages/Tentang.jsx';
import Proses from './pages/Proses.jsx';
import Peta from './pages/Peta.jsx';
import Kontak from './pages/Kontak.jsx';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/tentang" element={<Tentang />} />
        <Route path="/proses" element={<Proses />} />
        <Route path="/peta" element={<Peta />} />
        <Route path="/kontak" element={<Kontak />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
