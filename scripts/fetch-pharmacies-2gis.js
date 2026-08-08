#!/usr/bin/env node
/**
 * fetch-pharmacies-2gis.js
 * Fetches pharmacy listings from the 2GIS API for Dushanbe and writes
 * lib/pharmacies.json. Fails loudly if any result has coordinates outside
 * Dushanbe's real bounds — better to crash here than to ship wrong-city routes.
 *
 * Usage: node scripts/fetch-pharmacies-2gis.js
 * Requires: TWOGIS_API_KEY env var
 */

const fs = require("fs");
const path = require("path");

// ── Dushanbe coordinate bounds ─────────────────────────────────────────────
const LAT_MIN = 38.3;
const LAT_MAX = 38.8;
const LNG_MIN = 68.5;
const LNG_MAX = 69.0;

/**
 * Validate that every entry in the array has lat/lng inside Dushanbe bounds.
 * Throws with a descriptive message if anything is out of range, so the caller
 * can decide whether to swap or remove the entry.
 */
function validateBounds(entries) {
  const failing = [];
  for (const p of entries) {
    const latOk = p.lat >= LAT_MIN && p.lat <= LAT_MAX;
    const lngOk = p.lng >= LNG_MIN && p.lng <= LNG_MAX;
    if (!latOk || !lngOk) {
      failing.push({ id: p.id, lat: p.lat, lng: p.lng });
    }
  }
  return failing;
}

/**
 * Attempt to fix coordinate-swapped entries: if swapping lat↔lng brings both
 * within bounds, apply the swap and return true. Otherwise return false.
 */
function trySwapFix(entry) {
  const swappedLat = entry.lng;
  const swappedLng = entry.lat;
  if (
    swappedLat >= LAT_MIN && swappedLat <= LAT_MAX &&
    swappedLng >= LNG_MIN && swappedLng <= LNG_MAX
  ) {
    entry.lat = swappedLat;
    entry.lng = swappedLng;
    return true;
  }
  return false;
}

async function fetchDushanbePharmacies() {
  const apiKey = process.env.TWOGIS_API_KEY;
  if (!apiKey) {
    throw new Error("TWOGIS_API_KEY is not set");
  }

  // 2GIS Catalog API — search for pharmacies in Dushanbe (city_id: 4504222477795869)
  const url = new URL("https://catalog.api.2gis.com/3.0/items");
  url.searchParams.set("q", "аптека");
  url.searchParams.set("city_id", "4504222477795869");
  url.searchParams.set("type", "branch");
  url.searchParams.set("fields", "items.point,items.contact_groups,items.schedule,items.address");
  url.searchParams.set("page_size", "50");
  url.searchParams.set("key", apiKey);

  console.log("Fetching from 2GIS…");
  const res = await fetch(url.toString());
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`2GIS API error ${res.status}: ${body}`);
  }

  const data = await res.json();
  const items = data?.result?.items ?? [];
  console.log(`Got ${items.length} raw results`);

  const pharmacies = [];

  for (const item of items) {
    const point = item.point;
    if (!point?.lat || !point?.lon) continue;

    const phone =
      item.contact_groups
        ?.flatMap((g) => g.contacts ?? [])
        .find((c) => c.type === "phone")?.value ?? null;

    const schedule = item.schedule ?? {};
    const open24h = Object.values(schedule).every(
      (day) => day.working_hours?.some((h) => h.from === "00:00" && h.to === "00:00")
    );

    pharmacies.push({
      id: item.id?.toString() ?? `pharmacy-${pharmacies.length + 1}`,
      name: item.name_ex?.primary ?? item.name ?? "Аптека",
      address: item.address_name ?? "",
      phone: phone ?? "",
      hours: open24h ? "24/7" : "см. расписание",
      schedule: { open24h },
      // 2GIS returns lon (longitude) as `lon`, NOT `lng` — assign correctly
      lat: point.lat,
      lng: point.lon,
    });
  }

  // ── Bounds guard ────────────────────────────────────────────────────────
  // Run this BEFORE writing to disk. A bad coordinate misleads someone in a
  // medical situation — better to fail loudly and let a human check.
  let failing = validateBounds(pharmacies);

  if (failing.length > 0) {
    console.warn(`\n⚠  ${failing.length} entries failed bounds check — attempting lat/lng swap fix:`);
    const removed = [];

    for (const bad of failing) {
      const entry = pharmacies.find((p) => p.id === bad.id);
      if (!entry) continue;

      if (trySwapFix(entry)) {
        console.log(`  ✓ Swapped lat/lng for ${entry.id} → lat=${entry.lat}, lng=${entry.lng}`);
      } else {
        console.warn(`  ✗ Swap didn't fix ${entry.id} (lat=${bad.lat}, lng=${bad.lng}) — removing`);
        removed.push(entry.id);
      }
    }

    // Remove entries that couldn't be salvaged
    for (const id of removed) {
      const idx = pharmacies.findIndex((p) => p.id === id);
      if (idx !== -1) pharmacies.splice(idx, 1);
    }

    // Final bounds check — must be clean before writing
    failing = validateBounds(pharmacies);
    if (failing.length > 0) {
      throw new Error(
        `Bounds check still failing after fixes:\n${JSON.stringify(failing, null, 2)}\n` +
        "Fix the transform or remove these entries manually."
      );
    }
    console.log("  Bounds check now clean.\n");
  } else {
    console.log("Bounds check passed — all entries are within Dushanbe.\n");
  }

  return pharmacies;
}

(async () => {
  try {
    const pharmacies = await fetchDushanbePharmacies();
    const outPath = path.join(__dirname, "../lib/pharmacies.json");
    fs.writeFileSync(outPath, JSON.stringify(pharmacies, null, 2));
    console.log(`Wrote ${pharmacies.length} pharmacies to lib/pharmacies.json`);
  } catch (err) {
    console.error("fetch-pharmacies-2gis.js failed:", err.message);
    process.exit(1);
  }
})();
