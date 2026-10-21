export interface WorkCountry {
  code: string;
  name: string;
  latitude: number;
  longitude: number;
  markers: number[][];
  detail?: string;
}

// Owner-supplied country-level activity. Spread points are illustrative, not addresses.
export function getWorkCountries(): WorkCountry[] {
  return locations;
}
import locations from "./country-markers.json";
