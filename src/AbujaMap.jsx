import React, { useEffect, useRef, useState } from "react";

/* ============================================================
   ABUJA DISTRESS DEAL MAP — Leaflet / OpenStreetMap
   Shows deal pins for each district; clicking opens a deal card popup.
   ============================================================ */

// District coordinates (lat, lng) for Abuja FCT
const DISTRICT_COORDS = {
  "Jabi":          [9.0732,  7.4238],
  "Guzape":        [9.0358,  7.5072],
  "Wuse 2":        [9.0765,  7.4942],
  "Maitama":       [9.0907,  7.4895],
  "Katampe Ext.":  [9.1121,  7.4625],
  "Katampe Extension": [9.1121, 7.4625],
  "Lugbe":         [8.9938,  7.4064],
  "Kubwa":         [9.1525,  7.3194],
  "Gwarinpa":      [9.1221,  7.4178],
  "Apo":           [9.0236,  7.5401],
  "Wuse":          [9.0765,  7.4890],
  "Central Business District": [9.0579, 7.4823],
  "Idu Industrial": [9.0203, 7.4418],
  "Bwari":         [9.2196, 7.3734],
  "Kuje":          [8.8810, 7.2271],
};

const T = {
  ink:    "#0C2B1F",
  green:  "#0E5A3A",
  mint:   "#E7F2EC",
  gold:   "#C9A227",
  amber:  "#B4540A",
  teal:   "#0E6B75",
  paper:  "#F5F6F2",
  card:   "#FFFFFF",
  line:   "#E2E5DF",
  sub:    "#5B6A61",
  risk:   "#B3261E",
};

const fmtN = (n) => {
  if (n >= 1_000_000) return "₦" + (n / 1_000_000).toFixed(1) + "m";
  return "₦" + n.toLocaleString();
};

/* ── Custom SVG pin icon factory ── */
function makePinSVG(color, trust) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="36" height="44" viewBox="0 0 36 44">
      <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="rgba(0,0,0,0.25)"/>
      </filter>
      <path d="M18 0C8.06 0 0 8.06 0 18c0 13.5 18 26 18 26S36 31.5 36 18C36 8.06 27.94 0 18 0z"
            fill="${color}" filter="url(#shadow)"/>
      <circle cx="18" cy="18" r="9" fill="white" opacity="0.92"/>
      <text x="18" y="22" text-anchor="middle" font-size="9" font-weight="800"
            font-family="system-ui,sans-serif" fill="${color}">${trust}</text>
    </svg>`;
  return "data:image/svg+xml;base64," + btoa(svg);
}

function getPinColor(trust, titleGrade) {
  if (trust >= 85 && titleGrade === "A") return T.green;
  if (trust >= 70) return T.gold;
  return T.amber;
}

/* ── Main component ── */
export default function AbujaMap({ deals = [], onOpenDeal, highlightedDealId }) {
  const mapRef    = useRef(null);
  const leafletRef = useRef(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState(null);

  // Caching Leaflet instance, layer group, and markers mapping
  const LRef = useRef(null);
  const markersLayerRef = useRef(null);
  const markersRef = useRef({});

  // Effect 1: Map Initialization (Mounting tile layer once)
  useEffect(() => {
    let map = null;

    const initMap = async () => {
      try {
        // Dynamic import to avoid SSR issues
        const L = (await import("leaflet")).default;
        LRef.current = L;

        if (leafletRef.current) return; // already initialised
        if (!mapRef.current) return;

        // Fix Leaflet's default icon paths broken by Vite/webpack
        delete L.Icon.Default.prototype._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
          iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
          shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
        });

        // Initialise map centred on Abuja
        map = L.map(mapRef.current, {
          center: [9.072, 7.454],
          zoom: 12,
          zoomControl: true,
          attributionControl: true,
          scrollWheelZoom: false, // prevent accidental zoom on mobile scroll
        });
        leafletRef.current = map;

        // OpenStreetMap tiles (no API key needed)
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19,
          attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        }).addTo(map);

        // Initialize LayerGroup to manage markers reactively
        markersLayerRef.current = L.layerGroup().addTo(map);

        setMapReady(true);
      } catch (err) {
        console.error("Map init failed:", err);
        setMapError(err.message);
      }
    };

    initMap();

    return () => {
      if (leafletRef.current) {
        leafletRef.current.remove();
        leafletRef.current = null;
      }
    };
  }, []); // Only run once on mount

  // Effect 2: Redraw markers when deals or mapReady changes
  useEffect(() => {
    if (!mapReady || !leafletRef.current || !markersLayerRef.current || !LRef.current) return;

    const L = LRef.current;
    const markersLayer = markersLayerRef.current;

    // Clear old markers
    markersLayer.clearLayers();
    markersRef.current = {};

    deals.forEach((deal) => {
      const coords = DISTRICT_COORDS[deal.district];
      if (!coords) return;

      const pinColor = getPinColor(deal.trust, deal.titleGrade);
      const askingPrice = deal.askingPrice || deal.asking || 0;
      const marketValue = deal.marketValue || deal.market || 0;
      const disc = marketValue ? Math.round(((marketValue - askingPrice) / marketValue) * 100) : 0;

      // Deterministic jitter based on deal.id string hash
      const hash = String(deal.id).split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const jitterX = ((hash % 100) / 100 - 0.5) * 0.005;
      const jitterY = (((hash * 7) % 100) / 100 - 0.5) * 0.005;
      const pos = [coords[0] + jitterX, coords[1] + jitterY];

      const icon = L.icon({
        iconUrl:     makePinSVG(pinColor, deal.trust),
        iconSize:    [36, 44],
        iconAnchor:  [18, 44],
        popupAnchor: [0, -44],
      });

      const marker = L.marker(pos, { icon }).addTo(markersLayer);
      markersRef.current[deal.id] = marker;

      // Popup HTML
      const popupHtml = `
        <div style="font-family:'Instrument Sans',system-ui,sans-serif;width:220px;padding:4px 2px;">
          <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;
                      color:${pinColor};margin-bottom:5px;">
            📍 ${deal.district} · ${deal.type}
          </div>
          <div style="font-size:13px;font-weight:700;color:${T.ink};line-height:1.3;margin-bottom:6px;">
            ${deal.name || deal.title || "Distress Deal"}
          </div>
          <div style="display:flex;align-items:baseline;gap:6px;margin-bottom:3px;">
            <span style="font-size:16px;font-weight:800;color:${T.ink};">${fmtN(askingPrice)}</span>
            ${marketValue > askingPrice ? `<span style="font-size:11px;color:${T.sub};text-decoration:line-through;">${fmtN(marketValue)}</span>` : ""}
          </div>
          <div style="display:flex;gap:5px;flex-wrap:wrap;margin-bottom:8px;">
            ${disc > 0 ? `
            <span style="background:${T.amber};color:#fff;border-radius:999px;
                         font-size:10px;font-weight:700;padding:2px 8px;">
              −${disc}% below market
            </span>` : ""}
            <span style="background:${T.mint};color:${T.green};border-radius:999px;
                         font-size:10px;font-weight:700;padding:2px 8px;">
              Trust ${deal.trust || 80}/100
            </span>
          </div>
          <div style="font-size:11px;color:${T.amber};font-weight:600;margin-bottom:8px;">
            ⏱ ${deal.urgency || "Relocation liquidating asset"}
          </div>
          <button
            id="map-open-deal-${deal.id}"
            style="width:100%;background:${T.green};color:#fff;border:none;border-radius:8px;
                   padding:8px;font-weight:700;font-size:12px;cursor:pointer;">
            📷 View Deal →
          </button>
        </div>`;

      const popup = L.popup({ maxWidth: 240, minWidth: 220 }).setContent(popupHtml);
      marker.bindPopup(popup);

      // Wire popup button to onOpenDeal
      marker.on("popupopen", () => {
        setTimeout(() => {
          const btn = document.getElementById(`map-open-deal-${deal.id}`);
          if (btn) btn.onclick = () => { onOpenDeal && onOpenDeal(deal); marker.closePopup(); };
        }, 50);
      });
    });
  }, [deals, mapReady]);

  // Effect 3: Handle highlighted deal updates (panning and opening popup)
  useEffect(() => {
    if (!mapReady || !leafletRef.current || !highlightedDealId || !markersRef.current) return;

    const marker = markersRef.current[highlightedDealId];
    if (marker) {
      const map = leafletRef.current;
      const latLng = marker.getLatLng();
      
      // Center the map at the marker's coordinate and zoom in slightly
      map.setView(latLng, 14, { animate: true });
      
      // Open the marker's info popup
      marker.openPopup();
    }
  }, [highlightedDealId, mapReady]);

  if (mapError) {
    return (
      <div style={{ background: T.paper, border: `1px dashed ${T.line}`, borderRadius: 14,
                    padding: 24, textAlign: "center", color: T.sub }}>
        🗺️ Map could not load ({mapError}). Please check your connection.
      </div>
    );
  }

  return (
    <div style={{ position: "relative" }}>
      {/* Map container */}
      <div
        ref={mapRef}
        className="abuja-map-container"
        style={{
          width: "100%",
          height: "clamp(260px, 40vw, 420px)",
          borderRadius: 16,
          overflow: "hidden",
          border: `1px solid ${T.line}`,
          boxShadow: "0 4px 16px rgba(12,43,31,0.08)",
        }}
      />

      {/* Loading overlay */}
      {!mapReady && !mapError && (
        <div style={{
          position: "absolute", inset: 0, display: "flex", alignItems: "center",
          justifyContent: "center", background: T.mint, borderRadius: 16,
          flexDirection: "column", gap: 12,
        }}>
          <div style={{
            width: 28, height: 28, borderRadius: "50%",
            border: `3px solid ${T.line}`, borderTopColor: T.green,
            animation: "spin .8s linear infinite",
          }} />
          <div style={{ fontSize: 13, color: T.green, fontWeight: 600 }}>
            Loading Abuja map…
          </div>
        </div>
      )}

      {/* Map legend */}
      {mapReady && (
        <div style={{
          position: "absolute", bottom: 10, left: 10, zIndex: 1000,
          background: "rgba(255,255,255,0.92)", backdropFilter: "blur(6px)",
          border: `1px solid ${T.line}`, borderRadius: 10, padding: "8px 12px",
          fontSize: 10.5, fontWeight: 700, display: "flex", flexDirection: "column", gap: 5,
        }}>
          <div style={{ color: T.ink, letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 2 }}>
            Deal Pins
          </div>
          {[
            [T.green, "Trust 85+ · Grade A"],
            [T.gold,  "Trust 70–84"],
            [T.amber, "Trust &lt;70"],
          ].map(([col, label]) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 10, height: 10, borderRadius: "50%", background: col, display: "inline-block" }} />
              <span style={{ color: T.sub }} dangerouslySetInnerHTML={{ __html: label }} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
