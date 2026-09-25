import { Link } from 'react-router-dom';
import { formatHa, formatKg, formatMeter, formatRp } from '../utils/format';
import {
  availableStock,
  displayName,
  isSoldOut,
  landAreaHa,
  processNames,
} from '../utils/polygon';

export default function FarmDetailPanel({ item, onClose }) {
  if (!item) return null;

  const proses = processNames(item);
  const stock = availableStock(item);
  const soldOut = isSoldOut(item);
  const pembeli = Array.isArray(item.pembeliBooking) ? item.pembeliBooking : [];
  const id = item.idPolygon || item.id;

  return (
    <aside className="detail-panel">
      <header>
        <button type="button" className="detail-close" onClick={onClose} aria-label="Tutup">
          ×
        </button>
        <div className="detail-code">{item.idPolygon || ''}</div>
        <strong>{displayName(item)}</strong>
        {soldOut ? <span className="badge-habis">Habis</span> : null}
      </header>

      <dl>
        <div>
          <dt>Pemasok</dt>
          <dd>{item.pemasok || '—'}</dd>
        </div>
        <div>
          <dt>Jumlah cherry</dt>
          <dd>{formatKg(item.jumlahCherry)}</dd>
        </div>
        <div>
          <dt>Potential GB</dt>
          <dd>{formatKg(item.potentialGb)}</dd>
        </div>
        <div>
          <dt>Potential GB tersedia</dt>
          <dd>{stock == null ? '—' : formatKg(stock)}</dd>
        </div>
        {item.hargaPerKg != null && item.hargaPerKg !== '' ? (
          <div>
            <dt>Harga / kg</dt>
            <dd>{formatRp(item.hargaPerKg)}</dd>
          </div>
        ) : null}
        <div>
          <dt>Varietas</dt>
          <dd>{item.varietas || '—'}</dd>
        </div>
        <div>
          <dt>Proses pengolahan</dt>
          <dd>
            {proses.length
              ? proses.map((p, i) => (
                  <span key={`${p}-${i}`} className="proses-chip">
                    {proses.length > 1 ? `${i + 1}. ` : ''}
                    {p}
                  </span>
                ))
              : '—'}
          </dd>
        </div>
        <div>
          <dt>MDPL</dt>
          <dd>{formatMeter(item.mdpl)}</dd>
        </div>
        <div>
          <dt>Luas lahan</dt>
          <dd>{formatHa(landAreaHa(item))}</dd>
        </div>
      </dl>

      {pembeli.length > 0 ? (
        <div className="pembeli-block">
          <h4>Pembeli booking</h4>
          <ul>
            {pembeli.map((p, i) => (
              <li key={p.idPembelian || `${p.namaPembeli}-${i}`}>
                <strong>{p.namaPembeli || '—'}</strong>
                <span>{p.prosesPengolahan || '—'}</span>
                <span>{formatKg(p.jumlahPesananKg)}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="detail-actions">
        <Link className="btn btn-block" to={`/lahan/${encodeURIComponent(id)}`}>
          Check
        </Link>
      </div>
    </aside>
  );
}
