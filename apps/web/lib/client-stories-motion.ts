export function reviewReadingTime(body: string) {
  const words = body.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(12000, 7000 + words * 350);
}

export function countryPoint(latitude: number, longitude: number) {
  const lat = (latitude * Math.PI) / 180;
  const lon = (longitude * Math.PI) / 180;
  return [
    Math.cos(lat) * Math.sin(lon),
    Math.sin(lat),
    Math.cos(lat) * Math.cos(lon),
  ] as const;
}

export function markerVisibility(z: number, cameraDistance: number) {
  // Perspective occlusion starts before the equator; fade before the limb.
  const edge = 1 / cameraDistance;
  return Math.min(1, Math.max(0, (z - edge - 0.025) / 0.16));
}
