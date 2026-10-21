# Globe geography

The bundled dot coordinates and static poster are derived from Natural Earth 1:110m land polygons. Natural Earth data is public domain and permits commercial use and modification.

- License: https://www.naturalearthdata.com/about/terms-of-use/
- Source: https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_110m_land.geojson
- Regenerate: `node scripts/assets/prepare-globe.mjs /path/to/ne_110m_land.geojson` from `apps/web`.

Country/territory markers use owner-supplied activity and representative coordinates, not individual client addresses. Locations have no implicit association with reviews, and dot counts are not project counts.

The 71 marker positions are deterministically spread within Natural Earth's country boundaries (mainland US and metropolitan France). The supplied distribution is US 50, United Kingdom 10, Australia 3, India 2, and Germany, Puerto Rico, France, Slovenia, Nigeria, and United Arab Emirates 1 each.

- Boundary source: https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_110m_admin_0_countries.geojson
- Regenerate markers and the matching poster: `node scripts/assets/prepare-work-markers.mjs /path/to/ne_110m_admin_0_countries.geojson` from `apps/web`.
- Generated input: `data/country-markers.json`. No runtime map-data downloads are required.
