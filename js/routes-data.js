/**
 * Rapidito PWA - Base de datos de Rutas de Transporte Urbano y Rapiditos
 * Cobertura geográfica y definición de rutas
 */

const CIUDADES_CONFIG = {
    "Barquisimeto": { lat: 10.0714, lon: -69.3333, zoom: 13 },
    "Caracas": { lat: 10.4806, lon: -66.9036, zoom: 13 },
    "Maracaibo": { lat: 10.6549, lon: -71.6437, zoom: 13 },
    "Valencia": { lat: 10.1623, lon: -68.0077, zoom: 13 },
    "Barinas": { lat: 8.6226, lon: -70.2075, zoom: 13 },
    "Mérida": { lat: 8.5983, lon: -71.1450, zoom: 13 }
};

/**
 * RUTAS_DATA
 * Estructura GeoJSON lista para recibir las rutas reales de Rutas Urbanas y Rapiditos.
 * 
 * Plantilla de ejemplo para incorporar rutas en el futuro:
 * 
 * "id_unico_ruta": {
 *     "ciudad": "Barquisimeto",            // Ciudad (Barquisimeto, Caracas, etc.)
 *     "categoria": "urbana",               // "urbana" para Rutas Urbanas o "rapidito" para Rapiditos
 *     "tipo": "Ruta Urbana",               // "Ruta Urbana" o "Rapidito"
 *     "color": "#305CDE",                  // Color hexadecimal para trazo en mapa
 *     "type": "FeatureCollection",
 *     "features": [{
 *         "type": "Feature",
 *         "properties": {
 *             "nombre": "Nombre de la Línea",
 *             "origen": "Cabecera de salida",
 *             "destino": "Destino final",
 *             "paradas_clave": ["Parada A", "Parada B", "Parada C"],
 *             "frecuencia": "5 - 10 min"
 *         },
 *         "geometry": {
 *             "type": "LineString",
 *             "coordinates": [
 *                 [longitud1, latitud1],
 *                 [longitud2, latitud2]
 *             ]
 *         }
 *     }]
 * }
 */
const RUTAS_DATA = {};

window.CIUDADES_CONFIG = CIUDADES_CONFIG;
window.RUTAS_DATA = RUTAS_DATA;
