import { Link } from 'react-router-dom';
import ImageCarousel from '../components/ImageCarousel.jsx';
import { company } from '../content/company.js';

export default function Home() {
  return (
    <ImageCarousel slides={company.galeri}>
      <h1>{company.nama}</h1>
      <div className="actions">
        <Link className="btn" to="/peta">Lihat peta kebun</Link>
        <Link className="btn btn-ghost" to="/tentang">Tentang kami</Link>
      </div>
    </ImageCarousel>
  );
}
