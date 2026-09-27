/* Peta polygon bersama (MapLibre GL): mode 2D/3D + peta dasar OSM/Satelit */
(function (global) {
  const MODE_KEY = 'polygonMapMode';
  const BASE_KEY = 'polygonMapBase';
  const DEFAULT_COLOR = '#00665D';
  const DEFAULT_CENTER = [113.46, -7.85];
  const CAMERA = {
    '3d': { pitch: 60, bearing: -20 },
    '2d': { pitch: 0, bearing: 0 },
  };

  function readPref(key, allowed, fallback) {
    try {
      const v = global.localStorage.getItem(key);
      return allowed.includes(v) ? v : fallback;
    } catch (_) {
      return fallback;
    }
  }

  function savePref(key, value) {
    try {
      global.localStorage.setItem(key, value);
    } catch (_) {
      /* private mode / storage penuh */
    }
  }

  function style(base, mode) {
    const vis = (on) => (on ? 'visible' : 'none');
    const demTiles = ['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'];
    return {
      version: 8,
      sources: {
        osm: {
          type: 'raster',
          tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
          tileSize: 256,
          maxzoom: 19,
          attribution: '&copy; OpenStreetMap contributors',
        },
        satellite: {
          type: 'raster',
          tiles: [
            'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
          ],
          tileSize: 256,
          maxzoom: 19,
          attribution: 'Imagery &copy; Esri',
        },
        'terrain-dem': {
          type: 'raster-dem',
          tiles: demTiles,
          tileSize: 256,
          maxzoom: 15,
          encoding: 'terrarium',
          attribution: 'Terrain: Mapzen / AWS Open Data',
        },
        // MapLibre memperingatkan jika hillshade dan terrain memakai source yang sama
        'hillshade-dem': {
          type: 'raster-dem',
          tiles: demTiles,
          tileSize: 256,
          maxzoom: 15,
          encoding: 'terrarium',
        },
      },
      layers: [
        { id: 'base-osm', type: 'raster', source: 'osm', layout: { visibility: vis(base === 'osm') } },
        {
          id: 'base-satellite',
          type: 'raster',
          source: 'satellite',
          layout: { visibility: vis(base === 'satellite') },
        },
        {
          id: 'hillshade',
          type: 'hillshade',
          source: 'hillshade-dem',
          layout: { visibility: vis(mode === '3d') },
          paint: { 'hillshade-exaggeration': 0.35 },
        },
      ],
    };
  }

  function outerRing(coordinates) {
    if (!Array.isArray(coordinates) || !coordinates.length) return null;
    const first = coordinates[0];
    if (Array.isArray(first) && typeof first[0] === 'number') return coordinates;
    if (Array.isArray(first) && Array.isArray(first[0])) return first;
    return null;
  }

  function itemId(item) {
    const id = item && (item.idPolygon ?? item.id);
    return id == null ? '' : String(id);
  }

  function toGeoJson(items, colorFor) {
    const features = [];
    let minLng = Infinity;
    let minLat = Infinity;
    let maxLng = -Infinity;
    let maxLat = -Infinity;

    (items || []).forEach((item) => {
      const geometry = Array.isArray(item && item.geometry) ? item.geometry : [];
      const warna = (colorFor && colorFor(item)) || item.warnaPolygon || DEFAULT_COLOR;
      geometry.forEach((g) => {
        const src = outerRing(g && g.coordinates);
        if (!src) return;
        const ring = src
          .filter((pt) => Array.isArray(pt) && typeof pt[0] === 'number' && typeof pt[1] === 'number')
          .map((pt) => [pt[0], pt[1]]);
        if (ring.length < 3) return;
        const a = ring[0];
        const b = ring[ring.length - 1];
        if (a[0] !== b[0] || a[1] !== b[1]) ring.push([a[0], a[1]]);
        ring.forEach(([lng, lat]) => {
          if (lng < minLng) minLng = lng;
          if (lat < minLat) minLat = lat;
          if (lng > maxLng) maxLng = lng;
          if (lat > maxLat) maxLat = lat;
        });
        features.push({
          type: 'Feature',
          geometry: { type: 'Polygon', coordinates: [ring] },
          properties: { idPolygon: itemId(item), warna },
        });
      });
    });

    const bounds = features.length
      ? [
          [minLng, minLat],
          [maxLng, maxLat],
        ]
      : null;
    return { data: { type: 'FeatureCollection', features }, bounds };
  }

  function showFallback(container) {
    container.innerHTML =
      '<div class="map-fallback">Browser tidak mendukung peta interaktif. Daftar kebun tetap bisa dipakai.</div>';
  }

  function create(containerId, items, options) {
    const opts = options || {};
    const container =
      typeof containerId === 'string' ? document.getElementById(containerId) : containerId;
    const fitMaxZoom = opts.fitMaxZoom || 17;
    if (opts.height && container) container.style.height = opts.height;

    let mode = readPref(MODE_KEY, ['2d', '3d'], '2d');
    let base = readPref(BASE_KEY, ['osm', 'satellite'], 'osm');
    let currentItems = items || [];
    let selectedId = opts.selectedId ? String(opts.selectedId) : '';
    let geo = toGeoJson(currentItems, opts.colorFor);
    let map = null;

    const instance = {
      map: null,
      getMode: () => mode,
      getBase: () => base,
      setMode,
      setBase,
      setItems,
      focus,
      destroy,
    };

    if (!container) return instance;

    try {
      if (!global.maplibregl) throw new Error('maplibre-gl belum dimuat');
      const mapOpts = {
        container,
        style: style(base, mode),
        maxPitch: 75,
        attributionControl: { compact: true },
      };
      if (geo.bounds) {
        mapOpts.bounds = geo.bounds;
        mapOpts.fitBoundsOptions = { padding: 48, maxZoom: fitMaxZoom };
      } else {
        mapOpts.center = DEFAULT_CENTER;
        mapOpts.zoom = 9;
      }
      map = new global.maplibregl.Map(mapOpts);
    } catch (err) {
      console.warn('PolygonMap:', err);
      showFallback(container);
      return instance;
    }
    instance.map = map;

    map.addControl(new global.maplibregl.NavigationControl({ visualizePitch: true }), 'top-right');
    map.addControl(new global.maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-left');

    function selectedFilter() {
      return ['==', ['get', 'idPolygon'], selectedId || ''];
    }

    function applyMode(animate) {
      if (!map || !map.getLayer('polygon-fill')) return;
      const is3d = mode === '3d';
      map.setTerrain(is3d ? { source: 'terrain-dem', exaggeration: 1.5 } : null);
      map.setLayoutProperty('hillshade', 'visibility', is3d ? 'visible' : 'none');
      map.setPaintProperty('polygon-fill', 'fill-opacity', is3d ? 0.5 : 0.4);
      map.setPaintProperty('polygon-line', 'line-width', is3d ? 3 : 2);
      const camera = CAMERA[mode];
      if (animate) map.easeTo({ ...camera, duration: 800 });
      else map.jumpTo(camera);
    }

    function fitTo(bounds, animate) {
      if (!bounds) return;
      map.fitBounds(bounds, {
        padding: 48,
        maxZoom: fitMaxZoom,
        ...CAMERA[mode],
        duration: animate === false ? 0 : 800,
      });
    }

    function featureBounds(id) {
      const feats = geo.data.features.filter((f) => f.properties.idPolygon === id);
      if (!feats.length) return null;
      return toGeoJson(
        [{ geometry: feats.map((f) => ({ type: 'Polygon', coordinates: f.geometry.coordinates })) }],
      ).bounds;
    }

    map.on('load', () => {
      map.addSource('polygon', { type: 'geojson', data: geo.data });
      map.addLayer({
        id: 'polygon-fill',
        type: 'fill',
        source: 'polygon',
        paint: { 'fill-color': ['get', 'warna'], 'fill-opacity': 0.4 },
      });
      map.addLayer({
        id: 'polygon-line',
        type: 'line',
        source: 'polygon',
        paint: { 'line-color': ['get', 'warna'], 'line-width': 2 },
      });
      map.addLayer({
        id: 'polygon-selected',
        type: 'line',
        source: 'polygon',
        filter: selectedFilter(),
        paint: { 'line-color': '#ffffff', 'line-width': 4 },
      });

      map.on('click', 'polygon-fill', (e) => {
        const feat = e.features && e.features[0];
        if (!feat) return;
        const id = feat.properties.idPolygon;
        const item = currentItems.find((it) => itemId(it) === id);
        if (item && typeof opts.onSelect === 'function') opts.onSelect(item, e);
      });
      map.on('mouseenter', 'polygon-fill', () => {
        map.getCanvas().style.cursor = 'pointer';
      });
      map.on('mouseleave', 'polygon-fill', () => {
        map.getCanvas().style.cursor = '';
      });

      applyBase();
      applyMode(false);
      const initial = (selectedId && featureBounds(selectedId)) || (mode === '3d' && geo.bounds);
      if (initial) fitTo(initial, false);
    });

    function applyBase() {
      if (!map || !map.getLayer('base-osm')) return;
      map.setLayoutProperty('base-osm', 'visibility', base === 'osm' ? 'visible' : 'none');
      map.setLayoutProperty('base-satellite', 'visibility', base === 'satellite' ? 'visible' : 'none');
    }

    function setMode(next) {
      if (next !== '2d' && next !== '3d') return;
      mode = next;
      savePref(MODE_KEY, mode);
      applyMode(true);
    }

    function setBase(next) {
      if (next !== 'osm' && next !== 'satellite') return;
      base = next;
      savePref(BASE_KEY, base);
      applyBase();
    }

    function setItems(nextItems, setOpts) {
      currentItems = nextItems || [];
      geo = toGeoJson(currentItems, opts.colorFor);
      if (!map) return;
      const src = map.getSource('polygon');
      if (src) src.setData(geo.data);
      if (setOpts && setOpts.fit) {
        const sel = selectedId && featureBounds(selectedId);
        fitTo(sel || geo.bounds);
      }
    }

    function focus(id) {
      selectedId = id ? String(id) : '';
      if (!map) return;
      if (map.getLayer('polygon-selected')) map.setFilter('polygon-selected', selectedFilter());
      if (selectedId) fitTo(featureBounds(selectedId));
    }

    function destroy() {
      if (map) map.remove();
      map = null;
      instance.map = null;
    }

    return instance;
  }

  /* Hubungkan tombol [data-map-mode] / [data-map-base] dan .map-hint ke instance */
  function bindControls(instance, root) {
    const scope = root || document;
    const modeBtns = scope.querySelectorAll('[data-map-mode]');
    const baseBtns = scope.querySelectorAll('[data-map-base]');
    const hint = scope.querySelector('.map-hint');

    if (!instance.map) {
      scope.querySelectorAll('.map-toggle-group').forEach((el) => {
        el.hidden = true;
      });
      if (hint) hint.hidden = true;
      return;
    }

    function sync() {
      const mode = instance.getMode();
      const base = instance.getBase();
      modeBtns.forEach((b) => {
        const on = b.dataset.mapMode === mode;
        b.classList.toggle('active', on);
        b.setAttribute('aria-pressed', String(on));
      });
      baseBtns.forEach((b) => {
        const on = b.dataset.mapBase === base;
        b.classList.toggle('active', on);
        b.setAttribute('aria-pressed', String(on));
      });
      if (hint) hint.hidden = mode !== '3d';
    }

    modeBtns.forEach((b) =>
      b.addEventListener('click', () => {
        instance.setMode(b.dataset.mapMode);
        sync();
      }),
    );
    baseBtns.forEach((b) =>
      b.addEventListener('click', () => {
        instance.setBase(b.dataset.mapBase);
        sync();
      }),
    );
    sync();
  }

  global.PolygonMap = { create, bindControls, style, toGeoJson };
})(window);
