/**
 * Reads coordinates from what staff copy out of Google Maps (admin supplier form):
 * a place link (…!3d-25.909!4d28.000…, the dropped pin itself), a map link
 * (…/@-25.909,28.000,17z, the centre of the map view), a ?q= / ?query= link,
 * plain "-25.90925, 28.00078", or degrees-minutes-seconds as Google shows them
 * (25°54'33.3"S 28°00'02.8"E). Short links (maps.app.goo.gl) can't be read —
 * open them first and copy the full address.
 */
export type ParsedPin = { latitude: number; longitude: number; precision: "pin" | "map-centre" | "typed" };

const num = "(-?\\d{1,3}(?:\\.\\d+)?)";

function dmsPart(deg: string, min: string, sec: string, hemi: string) {
  const value = Number(deg) + Number(min) / 60 + Number(sec || 0) / 3600;
  return /[SW]/i.test(hemi) ? -value : value;
}

const round = (n: number) => Math.round(n * 1e6) / 1e6;

export function parseMapsInput(raw: string): ParsedPin | { error: string } | null {
  const text = raw.trim();
  if (!text) return null;
  if (/goo\.gl|maps\.app\./i.test(text)) return { error: "Short links can't be read. Open the link, then copy the full address from the browser bar — or right-click the pin in Google Maps and click the coordinates to copy them." };

  let found: ParsedPin | null = null;
  const pin = text.match(new RegExp(`!3d${num}!4d${num}`));
  const centre = text.match(new RegExp(`@${num},${num}`));
  const query = text.match(new RegExp(`[?&](?:q|query|ll|destination)=${num}(?:,|%2C)\\s*${num}`, "i"));
  const dms = text.match(/(\d{1,2})°\s*(\d{1,2})['′]\s*(\d{1,2}(?:\.\d+)?)?["″]?\s*([NS])[\s,]+(\d{1,3})°\s*(\d{1,2})['′]\s*(\d{1,2}(?:\.\d+)?)?["″]?\s*([EW])/i);
  const plain = text.match(new RegExp(`^${num}\\s*[,;\\s]\\s*${num}$`));
  if (pin) found = { latitude: Number(pin[1]), longitude: Number(pin[2]), precision: "pin" };
  else if (query) found = { latitude: Number(query[1]), longitude: Number(query[2]), precision: "pin" };
  else if (dms) found = { latitude: dmsPart(dms[1], dms[2], dms[3], dms[4]), longitude: dmsPart(dms[5], dms[6], dms[7], dms[8]), precision: "typed" };
  else if (plain) found = { latitude: Number(plain[1]), longitude: Number(plain[2]), precision: "typed" };
  else if (centre) found = { latitude: Number(centre[1]), longitude: Number(centre[2]), precision: "map-centre" };
  if (!found) return { error: "No coordinates found. Paste a Google Maps link, or coordinates like -25.90925, 28.00078." };

  let { latitude, longitude } = found;
  // Swapped (longitude first) — easy to do when typing.
  if (latitude > 16 && latitude < 33.5 && longitude < -22 && longitude > -35.5) [latitude, longitude] = [longitude, latitude];
  if (latitude > -22 || latitude < -35.5 || longitude < 16 || longitude > 33.5) {
    return { error: `${latitude}, ${longitude} is outside South Africa — check the link (latitude should be about -22 to -35, longitude 16 to 33).` };
  }
  return { latitude: round(latitude), longitude: round(longitude), precision: found.precision };
}
