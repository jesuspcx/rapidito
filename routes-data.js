/**
 * Rapidito PWA - Base de datos de Rutas de Transporte Urbano
 * Cobertura: Barquisimeto, Cabudare, Caracas
 */

const CIUDADES_CONFIG = {
    "Barquisimeto": { lat: 10.0714, lon: -69.3333, zoom: 13 },
    "Caracas": { lat: 10.4806, lon: -66.9036, zoom: 13 },
    "Maracaibo": { lat: 10.6549, lon: -71.6437, zoom: 13 },
    "Valencia": { lat: 10.1623, lon: -68.0077, zoom: 13 },
    "Barinas": { lat: 8.6226, lon: -70.2075, zoom: 13 },
    "Mérida": { lat: 8.5983, lon: -71.1450, zoom: 13 }
};

const RUTAS_DATA = {
    // ---------------- BARQUISIMETO ----------------
    "ruta_av_venezuela": {
        "ciudad": "Barquisimeto",
        "tipo": "Troncal",
        "color": "#305CDE",
        "type": "FeatureCollection",
        "features": [{
            "type": "Feature",
            "properties": { 
                "nombre": "Ruta Av. Venezuela", 
                "origen": "Oeste (Av. Fuerzas Armadas)", 
                "destino": "Este (Sambil / Branger)",
                "paradas_clave": ["Terminal Oeste", "Calle 42", "C.C. Metrópolis", "Av. Vargas", "C.C. Sambil"],
                "frecuencia": "5 - 8 min"
            },
            "geometry": { 
                "type": "LineString", 
                "coordinates": [
                    [-69.3550, 10.0680],
                    [-69.3450, 10.0695],
                    [-69.3333, 10.0714],
                    [-69.3265, 10.0719],
                    [-69.3218, 10.0723],
                    [-69.3141, 10.0729],
                    [-69.3041, 10.0737],
                    [-69.2970, 10.0739],
                    [-69.2906, 10.0731],
                    [-69.2847, 10.0727],
                    [-69.2807, 10.0717],
                    [-69.2745, 10.0702]
                ] 
            }
        }]
    },
    "ruta_carrera_19": {
        "ciudad": "Barquisimeto",
        "tipo": "Urbana",
        "color": "#0ea5e9",
        "type": "FeatureCollection",
        "features": [{
            "type": "Feature",
            "properties": { 
                "nombre": "Ruta 5 - Carrera 19 / Centro", 
                "origen": "El Obelisco", 
                "destino": "Redoma del Sol Naciente",
                "paradas_clave": ["El Obelisco", "Calle 50", "Calle 42", "Plaza Bolívar", "Rectorado UCLA", "Parque Macuto"],
                "frecuencia": "6 - 10 min"
            },
            "geometry": { 
                "type": "LineString", 
                "coordinates": [
                    [-69.3582, 10.0673],
                    [-69.3480, 10.0665],
                    [-69.3385, 10.0661],
                    [-69.3280, 10.0660],
                    [-69.3175, 10.0662],
                    [-69.3070, 10.0668],
                    [-69.2960, 10.0675],
                    [-69.2850, 10.0682],
                    [-69.2780, 10.0690]
                ] 
            }
        }]
    },
    "ruta_transbarca_l1": {
        "ciudad": "Barquisimeto",
        "tipo": "BRT Masivo",
        "color": "#e11d48",
        "type": "FeatureCollection",
        "features": [{
            "type": "Feature",
            "properties": { 
                "nombre": "Transbarca Línea 1 (Troncal)", 
                "origen": "Estación Central Simón Bolívar", 
                "destino": "Redoma de la Estrella del Sur",
                "paradas_clave": ["Terminal Central", "Metrópolis", "Cementerio", "Av. Vargas", "Plaza Miranda", "La Campiña"],
                "frecuencia": "10 - 15 min"
            },
            "geometry": { 
                "type": "LineString", 
                "coordinates": [
                    [-69.3780, 10.0600],
                    [-69.3620, 10.0645],
                    [-69.3450, 10.0695],
                    [-69.3300, 10.0716],
                    [-69.3150, 10.0728],
                    [-69.3000, 10.0740],
                    [-69.2880, 10.0725],
                    [-69.2760, 10.0700],
                    [-69.2670, 10.0650]
                ] 
            }
        }]
    },
    "ruta_cabudare_centro": {
        "ciudad": "Barquisimeto",
        "tipo": "Suburbana",
        "color": "#10b981",
        "type": "FeatureCollection",
        "features": [{
            "type": "Feature",
            "properties": { 
                "nombre": "Ruta 12 (Cabudare - Barquisimeto)", 
                "origen": "Cabudare Centro (Plaza Bolívar)", 
                "destino": "Terminal de Pasajeros de Bqto",
                "paradas_clave": ["Plaza Cabudare", "La Mata", "Distribuidor Valle Hondo", "El Ujano", "Terminal Central"],
                "frecuencia": "8 - 12 min"
            },
            "geometry": { 
                "type": "LineString", 
                "coordinates": [
                    [-69.2612, 10.0305],
                    [-69.2680, 10.0430],
                    [-69.2740, 10.0550],
                    [-69.2850, 10.0682],
                    [-69.3000, 10.0700],
                    [-69.3180, 10.0685],
                    [-69.3333, 10.0670],
                    [-69.3450, 10.0650]
                ] 
            }
        }]
    },

    // ---------------- CARACAS ----------------
    "ruta_caracas_plaza_vzla": {
        "ciudad": "Caracas",
        "tipo": "Troncal",
        "color": "#8b5cf6",
        "type": "FeatureCollection",
        "features": [{
            "type": "Feature",
            "properties": { 
                "nombre": "Troncal Plaza Venezuela - Chacao - Petare", 
                "origen": "Plaza Venezuela", 
                "destino": "Redoma de Petare",
                "paradas_clave": ["Plaza Venezuela", "Chacaíto", "Chacao", "Altamira", "Los Dos Caminos", "Petare"],
                "frecuencia": "4 - 7 min"
            },
            "geometry": { 
                "type": "LineString", 
                "coordinates": [
                    [-66.8830, 10.4965],
                    [-66.8720, 10.4950],
                    [-66.8580, 10.4940],
                    [-66.8480, 10.4970],
                    [-66.8350, 10.4960],
                    [-66.8200, 10.4900],
                    [-66.8080, 10.4810]
                ] 
            }
        }]
    }
};

window.CIUDADES_CONFIG = CIUDADES_CONFIG;
window.RUTAS_DATA = RUTAS_DATA;
