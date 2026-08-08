import Icon from "@/components/Icon";
import { getOpenStatus } from "@/lib/hours";

function distanceKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function PharmacyList({ pharmacies, userLocation, t }) {
  if (!pharmacies?.length) return null;

  let list = pharmacies;
  const sorted = Boolean(userLocation);
  if (userLocation) {
    list = [...pharmacies]
      .map((p) => ({
        ...p,
        _distance: distanceKm(userLocation.lat, userLocation.lng, p.lat, p.lng),
      }))
      .sort((a, b) => a._distance - b._distance);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-end justify-between">
        <h3 className="font-display font-bold text-lg text-ink">{t.pharmaciesTitle}</h3>
        {sorted && <span className="text-xs text-muted">{t.sortedByDistance}</span>}
      </div>

      <ul className="space-y-3">
        {list.slice(0, 6).map((p) => {
          const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}`;
          const status = getOpenStatus(p.schedule);
          const statusText = status
            ? status.key === "open24h"
              ? t.openNow
              : status.key === "closesAt"
                ? t.closesAt.replace("{time}", status.time)
                : t.opensAt.replace("{time}", status.time)
            : null;

          return (
            <li key={p.id} className="rounded-card bg-surface shadow-card p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-display font-bold text-ink truncate">{p.name}</p>
                  <p className="text-sm text-muted truncate flex items-center gap-1 mt-0.5">
                    <Icon name="location_on" className="text-[15px] shrink-0" />
                    {p.address}
                  </p>
                </div>
                {status && (
                  <span
                    className={`shrink-0 font-mono text-[11px] px-2 py-1 rounded-full border ${
                      status.isOpen ? "border-brand text-brand bg-brand/5" : "border-line text-muted bg-bg"
                    }`}
                  >
                    {statusText}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-4 border-y border-line py-2">
                {sorted && (
                  <>
                    <div className="flex flex-col">
                      <span className="text-[11px] text-muted">Distance</span>
                      <span className="font-mono text-sm text-ink">{p._distance.toFixed(1)} km</span>
                    </div>
                    <div className="h-7 w-px bg-line" />
                  </>
                )}
                <div className="flex flex-col">
                  <span className="text-[11px] text-muted">Hours</span>
                  <span className="font-mono text-sm text-ink">{p.hours}</span>
                </div>
              </div>

              <div className="flex gap-2">
                {p.phone ? (
                  <a
                    href={`tel:${p.phone.replace(/\s+/g, "")}`}
                    className="flex-1 bg-brand text-white rounded-full py-2 text-sm font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-transform"
                  >
                    <Icon name="call" filled className="text-[15px]" />
                    {t.call}
                  </a>
                ) : null}
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 border border-brand text-brand rounded-full py-2 text-sm font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-transform"
                >
                  <Icon name="directions" className="text-[15px]" />
                  {t.route}
                </a>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
