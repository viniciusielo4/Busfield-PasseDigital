const { query } = require('../db');
const { AppError } = require('../errors');

const toStop = (r) => ({
  id: r.id, name: r.name, latitude: r.latitude, longitude: r.longitude, lines: r.lines,
  ...(r.distance_m !== undefined && { distanceMeters: Math.round(r.distance_m) }),
});

// Pontos dentro do raio informado (fórmula de Haversine, sem depender de PostGIS), do mais perto ao mais longe.
async function nearby({ lat, lng, radiusMeters, limit }) {
  const { rows } = await query(
    `SELECT * FROM (
       SELECT s.*, 6371000 * acos(LEAST(1,
         cos(radians($1)) * cos(radians(latitude)) * cos(radians(longitude) - radians($2)) +
         sin(radians($1)) * sin(radians(latitude)))) AS distance_m
         FROM bus_stops s
     ) x WHERE distance_m <= $3 ORDER BY distance_m LIMIT $4`,
    [lat, lng, radiusMeters, limit]
  );
  return rows.map(toStop);
}

async function getById(id) {
  const { rows } = await query('SELECT * FROM bus_stops WHERE id = $1', [id]);
  if (!rows[0]) throw new AppError(404, 'BUS_STOP_NOT_FOUND', 'Ponto de ônibus não encontrado.');
  return toStop(rows[0]);
}

module.exports = { nearby, getById };
