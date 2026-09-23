(function () {
  var mapEl = document.getElementById("map");
  if (!mapEl || typeof L === "undefined") return;

  var statusEl = document.getElementById("farm-status");
  var listEl = document.getElementById("farm-list");
  var searchEl = document.getElementById("farm-search");
  var panel = document.getElementById("detail-panel");
  var items = [];
  var layers = [];
  var selectedId = null;
  var map = L.map(mapEl).setView([-7.85, 113.46], 9);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }).addTo(map);

  function farmId(item) {
    return item.idPolygon || item.id;
  }

  function displayName(item) {
    if (!item) return "Polygon";
    var nama = (item.namaKml || "").trim();
    return nama || item.idPolygon || "Polygon " + (item.id != null ? item.id : "");
  }

  function formatNumber(value, fractionDigits) {
    if (value === null || value === undefined || value === "") return "—";
    var n = Number(value);
    if (Number.isNaN(n)) return "—";
    return n.toLocaleString("id-ID", {
      minimumFractionDigits: 0,
      maximumFractionDigits: fractionDigits == null ? 2 : fractionDigits,
    });
  }

  function formatKg(value) {
    if (value === null || value === undefined || value === "") return "—";
    return formatNumber(value) + " kg";
  }

  function formatMeter(value) {
    if (value === null || value === undefined || value === "") return "—";
    return formatNumber(value, 0) + " m";
  }

  function formatHa(value) {
    if (value === null || value === undefined || value === "") return "—";
    var n = Number(value);
    if (Number.isNaN(n)) return "—";
    var digits = Math.abs(n) < 1 ? 4 : 2;
    return formatNumber(n, digits) + " Ha";
  }

  function outerRing(coordinates) {
    if (!Array.isArray(coordinates) || !coordinates.length) return null;
    var first = coordinates[0];
    if (Array.isArray(first) && typeof first[0] === "number") return coordinates;
    if (Array.isArray(first) && Array.isArray(first[0])) return first;
    return null;
  }

  function toLatLngs(coordinates) {
    var coords = outerRing(coordinates);
    if (!coords || coords.length < 3) return null;
    var ring = [];
    for (var i = 0; i < coords.length; i += 1) {
      var pt = coords[i];
      if (!Array.isArray(pt) || pt.length < 2) return null;
      var lng = pt[0];
      var lat = pt[1];
      if (typeof lat !== "number" || typeof lng !== "number") return null;
      ring.push([lat, lng]);
    }
    return ring;
  }

  function farmPolygons(item) {
    var geometry = Array.isArray(item && item.geometry) ? item.geometry : [];
    var out = [];
    geometry.forEach(function (g, index) {
      if (!g || g.type !== "Polygon") return;
      var latlngs = toLatLngs(g.coordinates);
      if (!latlngs) return;
      out.push({ key: (farmId(item) || "p") + "-" + index, latlngs: latlngs });
    });
    return out;
  }

  function toRad(deg) {
    return (deg * Math.PI) / 180;
  }

  function ringAreaM2(coordinates) {
    var coords = outerRing(coordinates);
    if (!coords || coords.length < 3) return 0;
    var closed =
      coords[0][0] === coords[coords.length - 1][0] &&
      coords[0][1] === coords[coords.length - 1][1];
    var pts = closed ? coords.slice(0, -1) : coords;
    if (pts.length < 3) return 0;
    var R = 6378137;
    var sum = 0;
    for (var i = 0; i < pts.length; i += 1) {
      var lng1 = pts[i][0];
      var lat1 = pts[i][1];
      var next = pts[(i + 1) % pts.length];
      sum += toRad(next[0] - lng1) * (2 + Math.sin(toRad(lat1)) + Math.sin(toRad(next[1])));
    }
    return Math.abs((sum * R * R) / 2);
  }

  function storedAreaM2(value) {
    if (value === null || value === undefined || value === "") return null;
    var n = Number(value);
    return Number.isNaN(n) ? null : n;
  }

  function landAreaHa(item) {
    var fromDoc = storedAreaM2(
      item && (item.area != null ? item.area : item.luas != null ? item.luas : item.areaM2 != null ? item.areaM2 : item.luasM2)
    );
    var m2 = fromDoc;
    if (m2 === null) {
      var geometry = Array.isArray(item && item.geometry) ? item.geometry : [];
      m2 = geometry.reduce(function (total, g) {
        var gArea = storedAreaM2(g && (g.area != null ? g.area : g.luas));
        if (gArea !== null) return total + gArea;
        if (g && g.type === "Polygon") return total + ringAreaM2(g.coordinates);
        return total;
      }, 0);
    }
    if (!m2) return null;
    return m2 / 10000;
  }

  function matchesQuery(item, q) {
    if (!q) return true;
    var hay = [item.namaKml, item.idPolygon, item.pemasok, item.varietas]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return hay.indexOf(q) !== -1;
  }

  function setStatus(text, isError) {
    statusEl.hidden = !text;
    statusEl.textContent = text || "";
    statusEl.classList.toggle("error", !!isError);
  }

  function clearLayers() {
    layers.forEach(function (layer) {
      map.removeLayer(layer);
    });
    layers = [];
  }

  function fitItems(list, selected) {
    var pts = [];
    if (selected) {
      farmPolygons(selected).forEach(function (poly) {
        poly.latlngs.forEach(function (ll) {
          pts.push(ll);
        });
      });
    }
    if (!pts.length) {
      list.forEach(function (item) {
        farmPolygons(item).forEach(function (poly) {
          poly.latlngs.forEach(function (ll) {
            pts.push(ll);
          });
        });
      });
    }
    if (!pts.length) return;
    map.fitBounds(pts, { padding: [36, 36], maxZoom: 16 });
  }

  function renderMap(list) {
    clearLayers();
    var selected = list.find(function (i) {
      return farmId(i) === selectedId;
    });
    list.forEach(function (item) {
      var id = farmId(item);
      var active = selectedId === id;
      farmPolygons(item).forEach(function (poly) {
        var layer = L.polygon(poly.latlngs, {
          color: active ? "#004d47" : "#00665D",
          weight: active ? 3.5 : 2,
          fillColor: "#00665D",
          fillOpacity: active ? 0.5 : 0.22,
        }).addTo(map);
        layer.on("click", function () {
          selectFarm(id);
        });
        layers.push(layer);
      });
    });
    fitItems(list, selected);
    setTimeout(function () {
      map.invalidateSize();
    }, 80);
  }

  function renderList(list) {
    listEl.innerHTML = "";
    if (!list.length) {
      listEl.hidden = true;
      return;
    }
    listEl.hidden = false;
    list.forEach(function (item) {
      var id = farmId(item);
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "farm-item" + (selectedId === id ? " active" : "");
      var strong = document.createElement("strong");
      strong.textContent = displayName(item);
      var span = document.createElement("span");
      span.textContent =
        [item.pemasok, item.varietas].filter(Boolean).join(" · ") || item.idPolygon || "";
      btn.appendChild(strong);
      btn.appendChild(span);
      btn.addEventListener("click", function () {
        selectFarm(id);
      });
      listEl.appendChild(btn);
    });
  }

  function showDetail(item) {
    if (!item) {
      panel.hidden = true;
      return;
    }
    panel.hidden = false;
    document.getElementById("detail-code").textContent = item.idPolygon || "";
    document.getElementById("detail-name").textContent = displayName(item);
    document.getElementById("detail-petani").textContent = item.pemasok || "—";
    document.getElementById("detail-luas").textContent = formatHa(landAreaHa(item));
    document.getElementById("detail-cherry").textContent = formatKg(item.jumlahCherry);
    document.getElementById("detail-gb").textContent = formatKg(item.potentialGb);
    document.getElementById("detail-varietas").textContent = item.varietas || "—";
    document.getElementById("detail-mdpl").textContent = formatMeter(item.mdpl);
  }

  function filtered() {
    var q = (searchEl.value || "").trim().toLowerCase();
    return items.filter(function (item) {
      return matchesQuery(item, q);
    });
  }

  function refresh() {
    var list = filtered();
    if (!items.length) {
      renderList([]);
      return;
    }
    if (!list.length) {
      setStatus("Tidak ada kebun yang cocok dengan pencarian.", false);
    } else {
      setStatus("", false);
    }
    renderList(list);
    renderMap(list);
  }

  function selectFarm(id) {
    selectedId = id;
    var fromList = items.find(function (i) {
      return farmId(i) === id;
    });
    if (fromList) showDetail(fromList);
    refresh();
    fetch("/api/polygon/" + encodeURIComponent(id))
      .then(function (res) {
        if (!res.ok) return null;
        return res.json();
      })
      .then(function (detail) {
        if (detail && selectedId === id) showDetail(detail);
      })
      .catch(function () {});
  }

  document.getElementById("detail-close").addEventListener("click", function () {
    selectedId = null;
    showDetail(null);
    refresh();
  });

  searchEl.addEventListener("input", refresh);

  fetch("/api/polygon")
    .then(function (res) {
      if (!res.ok) throw new Error("API polygon gagal (" + res.status + "). Periksa MONGODB_URI di .env.");
      return res.json();
    })
    .then(function (data) {
      if (!Array.isArray(data)) throw new Error((data && data.error) || "Respons API polygon tidak berbentuk daftar.");
      items = data;
      if (!items.length) {
        setStatus("Belum ada data polygon di sistem admin.", false);
        return;
      }
      setStatus("", false);
      refresh();
    })
    .catch(function (err) {
      setStatus(err.message || "Tidak bisa memuat data polygon. Jalankan server Flask.", true);
    });
})();
