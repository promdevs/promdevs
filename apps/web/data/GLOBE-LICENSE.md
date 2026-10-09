# Globe geography

The bundled dot coordinates and static poster are derived from Natural Earth 1:110m land polygons. Natural Earth data is public domain and permits commercial use and modification.

- License: https://www.naturalearthdata.com/about/terms-of-use/
- Source: https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_110m_land.geojson
- Regenerate: `node scripts/assets/prepare-globe.mjs /path/to/ne_110m_land.geojson` from `apps/web`.

Country markers use representative coordinates, not individual client addresses. The location input is empty until verified aggregate country data is supplied. Locations have no implicit association with reviews.
