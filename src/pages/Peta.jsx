import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchPolygon, fetchPolygons } from '../api/walida';
import FarmMap from '../components/FarmMap';
import FarmDetailPanel from '../components/FarmDetailPanel';
import { farmId, displayName } from '../utils/polygon';

export default function Peta() {
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState({ text: 'Memuat polygon…', error: false });
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetchPolygons()
      .then((data) => {
        if (cancelled) return;
        setItems(data);
        if (!data.length) {
          setStatus({ text: 'Belum ada data polygon di sistem admin.', error: false });
        } else {
          setStatus({ text: '', error: false });
        }
      })
      .catch((err) => {
        if (cancelled) return;
        setStatus({
          text: err.message || 'Tidak bisa memuat data polygon. Periksa VITE_WALIDA_API.',
          error: true,
        });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => {
      const hay = [item.namaKml, item.idPolygon, item.pemasok, item.varietas]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [items, query]);

  const onSelect = useCallback((id) => {
    setSelectedId(id);
    setItems((prev) => {
      const fromList = prev.find((i) => farmId(i) === id) || null;
      setSelected(fromList);
      return prev;
    });
    if (!id) return;
    fetchPolygon(id)
      .then((detail) => {
        setSelectedId((current) => {
          if (current === id) {
            setSelected(detail);
            setItems((prev) =>
              prev.map((p) => (farmId(p) === id ? { ...p, ...detail } : p)),
            );
          }
          return current;
        });
      })
      .catch(() => {});
  }, []);

  return (
    <div className="peta-layout">
      <aside className="peta-side">
        <div className="peta-side-head">
          <h2>Kebun</h2>
          <p>Peta kebun mitra Argopuro Walida. Klik petak untuk detail & booking.</p>
          <input
            className="search"
            type="search"
            placeholder="Cari nama, petani, varietas"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        {status.text ? (
          <div className={`status-box${status.error ? ' error' : ''}`}>{status.text}</div>
        ) : null}
        {filtered.length > 0 ? (
          <div className="farm-list">
            {filtered.map((item) => {
              const id = farmId(item);
              return (
                <button
                  key={id}
                  type="button"
                  className={`farm-item${selectedId === id ? ' active' : ''}`}
                  onClick={() => onSelect(id)}
                >
                  <strong>{displayName(item)}</strong>
                  <span>
                    {[item.pemasok, item.varietas].filter(Boolean).join(' · ') ||
                      item.idPolygon ||
                      ''}
                  </span>
                </button>
              );
            })}
          </div>
        ) : null}
      </aside>
      <div className="map-pane">
        <FarmMap items={filtered} selectedId={selectedId} onSelect={onSelect} />
        {selected ? (
          <FarmDetailPanel
            item={selected}
            onClose={() => {
              setSelectedId(null);
              setSelected(null);
            }}
          />
        ) : null}
      </div>
    </div>
  );
}
