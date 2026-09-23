import { useEffect, useMemo, useState } from 'react';
import { MapContainer, Polygon, TileLayer, useMap } from 'react-leaflet';
import { fetchPolygonById, fetchPolygons } from '../api/polygon.js';
import { allBounds, farmPolygons, landAreaHa } from '../utils/geometry.js';
import { displayName, formatHa, formatKg, formatMeter } from '../utils/format.js';

function matchesQuery(item, q) {
  if (!q) return true;
  const hay = [item.namaKml, item.idPolygon, item.pemasok, item.varietas]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return hay.includes(q);
}

function FitView({ points, selected }) {
  const map = useMap();
  useEffect(() => {
    const selectedPts = selected
      ? farmPolygons(selected).flatMap((p) => p.latlngs)
      : [];
    const target = selectedPts.length ? selectedPts : points;
    if (!target?.length) return;
    map.fitBounds(target, { padding: [36, 36], maxZoom: 16 });
  }, [map, points, selected]);
  return null;
}

function FarmMap({ items, selectedId, onSelect }) {
  const points = useMemo(() => allBounds(items), [items]);
  const selected = items.find((i) => i.idPolygon === selectedId || i.id === selectedId);

  return (
    <MapContainer
      className="map-root"
      center={[-7.85, 113.46]}
      zoom={9}
      scrollWheelZoom
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitView points={points} selected={selected} />
      {items.map((item) => {
        const id = item.idPolygon || item.id;
        const active = selectedId === item.idPolygon || selectedId === item.id;
        return farmPolygons(item).map((poly) => (
          <Polygon
            key={poly.key}
            positions={poly.latlngs}
            pathOptions={{
              color: active ? '#004d47' : '#00665D',
              weight: active ? 3.5 : 2,
              fillColor: '#00665D',
              fillOpacity: active ? 0.5 : 0.22,
            }}
            eventHandlers={{
              click: () => onSelect(id),
            }}
          />
        ));
      })}
    </MapContainer>
  );
}

export default function Peta() {
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    let alive = true;
    fetchPolygons()
      .then((data) => {
        if (!alive) return;
        setItems(data);
        setStatus(data.length ? 'ready' : 'empty');
      })
      .catch((err) => {
        if (!alive) return;
        setError(err.message || 'Gagal memuat data polygon.');
        setStatus('error');
      });
    return () => {
      alive = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((item) => matchesQuery(item, q));
  }, [items, query]);

  async function selectFarm(id) {
    setSelectedId(id);
    const fromList = items.find((i) => i.idPolygon === id || i.id === id);
    if (fromList) setSelected(fromList);
    try {
      const detail = await fetchPolygonById(id);
      setSelected(detail);
    } catch {
      /* daftar sudah cukup jika GET by id gagal */
    }
  }

  return (
    <div className="peta-layout">
      <aside className="peta-side">
        <div className="peta-side-head">
          <h2>Kebun</h2>
          <p>Peta kebun mitra Argopuro Walida.</p>
          <input
            className="search"
            type="search"
            placeholder="Cari nama, petani, varietas"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        {status === 'loading' && <div className="status-box">Memuat polygon…</div>}
        {status === 'error' && <div className="status-box error">{error}</div>}
        {status === 'empty' && (
          <div className="status-box">Belum ada data polygon di sistem admin.</div>
        )}
        {status === 'ready' && filtered.length === 0 && (
          <div className="status-box">Tidak ada kebun yang cocok dengan pencarian.</div>
        )}
        {status === 'ready' && (
          <div className="farm-list">
            {filtered.map((item) => {
              const id = item.idPolygon || item.id;
              const active = selectedId === item.idPolygon || selectedId === item.id;
              return (
                <button
                  key={id}
                  type="button"
                  className={`farm-item${active ? ' active' : ''}`}
                  onClick={() => selectFarm(id)}
                >
                  <strong>{displayName(item)}</strong>
                  <span>
                    {[item.pemasok, item.varietas].filter(Boolean).join(' · ') || item.idPolygon}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </aside>

      <div className="map-pane">
        {status === 'ready' ? (
          <FarmMap items={filtered} selectedId={selectedId} onSelect={selectFarm} />
        ) : (
          <div className="map-root" style={{ display: 'grid', placeItems: 'center' }}>
            <p className={status === 'error' ? 'status-box error' : 'status-box'}>
              {status === 'error'
                ? 'Peta belum bisa dimuat.'
                : status === 'empty'
                  ? 'Peta menunggu data polygon dari API.'
                  : 'Menyiapkan peta…'}
            </p>
          </div>
        )}

        {selected && (
          <aside className="detail-panel">
            <header>
              <button type="button" className="detail-close" onClick={() => { setSelected(null); setSelectedId(null); }} aria-label="Tutup">
                ×
              </button>
              <div className="detail-code">{selected.idPolygon}</div>
              <strong>{displayName(selected)}</strong>
            </header>
            <dl>
              <div>
                <dt>Petani</dt>
                <dd>{selected.pemasok || '—'}</dd>
              </div>
              <div>
                <dt>Luas lahan</dt>
                <dd>{formatHa(landAreaHa(selected))}</dd>
              </div>
              <div>
                <dt>Jumlah cherry</dt>
                <dd>{formatKg(selected.jumlahCherry)}</dd>
              </div>
              <div>
                <dt>Potential GB</dt>
                <dd>{formatKg(selected.potentialGb)}</dd>
              </div>
              <div>
                <dt>Varietas</dt>
                <dd>{selected.varietas || '—'}</dd>
              </div>
              <div>
                <dt>MDPL</dt>
                <dd>{formatMeter(selected.mdpl)}</dd>
              </div>
            </dl>
          </aside>
        )}
      </div>
    </div>
  );
}
