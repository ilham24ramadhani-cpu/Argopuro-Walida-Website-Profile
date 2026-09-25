import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchPolygon, fetchPolygons } from '../api/walida';
import FarmMap from '../components/FarmMap';
import FarmDetailPanel from '../components/FarmDetailPanel';
import {
  farmId,
  displayName,
  petaniNama,
  processNames,
} from '../utils/polygon';

const MDPL_OPTIONS = [1200, 1600, 1800];

export default function Peta() {
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState({ text: 'Memuat polygon…', error: false });
  const [mdplFilter, setMdplFilter] = useState('');
  const [prosesFilter, setProsesFilter] = useState('');
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

  const prosesOptions = useMemo(() => {
    const set = new Set();
    items.forEach((item) => {
      processNames(item).forEach((p) => set.add(p));
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'id'));
  }, [items]);

  const filtered = useMemo(() => {
    return items.filter((item) => {
      if (mdplFilter !== '') {
        const mdpl = Number(item.mdpl);
        if (Number.isNaN(mdpl) || mdpl !== Number(mdplFilter)) return false;
      }
      if (prosesFilter) {
        if (!processNames(item).includes(prosesFilter)) return false;
      }
      return true;
    });
  }, [items, mdplFilter, prosesFilter]);

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
          <div className="peta-filters">
            <label>
              MDPL
              <select
                value={mdplFilter}
                onChange={(e) => setMdplFilter(e.target.value)}
              >
                <option value="">Semua</option>
                {MDPL_OPTIONS.map((m) => (
                  <option key={m} value={m}>
                    {m} m
                  </option>
                ))}
              </select>
            </label>
            <label>
              Proses pengolahan
              <select
                value={prosesFilter}
                onChange={(e) => setProsesFilter(e.target.value)}
              >
                <option value="">Semua</option>
                {prosesOptions.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
        {status.text ? (
          <div className={`status-box${status.error ? ' error' : ''}`}>{status.text}</div>
        ) : null}
        {filtered.length > 0 ? (
          <div className="farm-list">
            {filtered.map((item) => {
              const id = farmId(item);
              const petani = petaniNama(item);
              return (
                <button
                  key={id}
                  type="button"
                  className={`farm-item${selectedId === id ? ' active' : ''}`}
                  onClick={() => onSelect(id)}
                >
                  <strong>{displayName(item)}</strong>
                  <span>
                    {[petani, item.varietas].filter(Boolean).join(' · ') ||
                      item.idPolygon ||
                      ''}
                  </span>
                </button>
              );
            })}
          </div>
        ) : !status.text ? (
          <div className="status-box">Tidak ada petak yang cocok dengan filter.</div>
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
