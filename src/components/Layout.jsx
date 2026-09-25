import { Outlet, useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';

export default function Layout() {
  const { pathname } = useLocation();
  const mapMode = pathname === '/peta' || pathname.startsWith('/peta/');

  return (
    <div className={`site${mapMode ? ' map-mode' : ''}`}>
      <Navbar />
      <div className={mapMode ? 'main-map' : 'main'}>
        <Outlet />
      </div>
      {!mapMode && <Footer />}
    </div>
  );
}
