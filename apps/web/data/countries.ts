export interface WorkCountry {
  code: string;
  name: string;
  latitude: number;
  longitude: number;
  detail?: string;
}

// Replace this input with verified aggregate location data, not review attribution.
// An empty input intentionally makes no claims about countries or client counts.
export function getWorkCountries(): WorkCountry[] {
  return [];
}
