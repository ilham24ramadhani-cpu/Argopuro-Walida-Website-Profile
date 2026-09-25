import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import Tentang from './pages/Tentang';
import Proses from './pages/Proses';
import Kontak from './pages/Kontak';
import Peta from './pages/Peta';
import Lahan from './pages/Lahan';
import BookingForm from './pages/BookingForm';
import Checkout from './pages/Checkout';
import Invoice from './pages/Invoice';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="tentang" element={<Tentang />} />
          <Route path="proses" element={<Proses />} />
          <Route path="kontak" element={<Kontak />} />
          <Route path="peta" element={<Peta />} />
          <Route path="lahan/:idPolygon" element={<Lahan />} />
          <Route path="lahan/:idPolygon/booking" element={<BookingForm />} />
          <Route path="lahan/:idPolygon/checkout" element={<Checkout />} />
          <Route path="invoice/:idPembelian" element={<Invoice />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
