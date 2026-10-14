/**
 * Rapidito PWA - Módulo Geográfico y Navegación (Leaflet + GPS + OSRM)
 */

const GeoManager = {
    map: null,
    rutaDibujada: null,
    marcadorOrigen: null,
    marcadorDestino: null,
    marcadorLive: null,
    circuloPrecisionLive: null,
    capasCaminata: null,
    marcadoresRuta: null,
    watchId: null,
    isLiveTracking: false,
    currentLat: 10.0714,
    currentLon: -69.3333,
    abortControllerGeo: null,
    lastProximityAlertStop: null,

    init(mapElementId = 'map') {
        const ciudadActual = localStorage.getItem('rapidito_ciudad') || 'Barquisimeto';
        if (window.CIUDADES_CONFIG && window.CIUDADES_CONFIG[ciudadActual]) {
            this.currentLat = window.CIUDADES_CONFIG[ciudadActual].lat;
            this.currentLon = window.CIUDADES_CONFIG[ciudadActual].lon;
        }

        this.map = L.map(mapElementId, { zoomControl: false }).setView([this.currentLat, this.currentLon], 14);
        this.capasCaminata = L.layerGroup().addTo(this.map);
        this.marcadoresRuta = L.layerGroup().addTo(this.map);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; OpenStreetMap'
        }).addTo(this.map);

        this.map.on('click', (e) => this.onMapClick(e));
    },

    setCenter(lat, lon, zoom = 14) {
        this.currentLat = lat;
        this.currentLon = lon;
        if (this.map) {
            this.map.setView([lat, lon], zoom);
        }
    },

    limpiarMapa() {
        if (!this.map) return;
        if (this.rutaDibujada && this.map.hasLayer(this.rutaDibujada)) {
            this.map.removeLayer(this.rutaDibujada);
            this.rutaDibujada = null;
        }
        if (this.marcadorDestino && this.map.hasLayer(this.marcadorDestino)) {
            this.map.removeLayer(this.marcadorDestino);
            this.marcadorDestino = null;
        }
        if (this.marcadorOrigen && this.map.hasLayer(this.marcadorOrigen)) {
            this.map.removeLayer(this.marcadorOrigen);
            this.marcadorOrigen = null;
        }
        if (this.capasCaminata) this.capasCaminata.clearLayers();
        if (this.marcadoresRuta) this.marcadoresRuta.clearLayers();

        const resultsContainer = document.getElementById('route-results');
        const autocompleteContainer = document.getElementById('autocomplete-container');
        const originInput = document.getElementById('input-origen');
        const searchInput = document.getElementById('map-search-input');

        if (resultsContainer) {
            resultsContainer.style.display = 'none';
            resultsContainer.innerHTML = '';
        }
        if (autocompleteContainer) autocompleteContainer.style.display = 'none';
        if (originInput) originInput.value = '';
        if (searchInput) searchInput.value = '';

        this.map.setView([this.currentLat, this.currentLon], 14);
    },

    async onMapClick(e) {
        const esOrigen = (window.AppManager?.inputActivo === 'origen');
        const targetInput = esOrigen 
            ? document.getElementById('input-origen') 
            : document.getElementById('map-search-input');

        if (esOrigen) {
            if (this.marcadorOrigen && this.map.hasLayer(this.marcadorOrigen)) {
                this.map.removeLayer(this.marcadorOrigen);
            }
            this.marcadorOrigen = L.circleMarker(e.latlng, {
                radius: 7,
                fillColor: "var(--primary-brand)",
                color: "#fff",
                weight: 2,
                fillOpacity: 1
            }).addTo(this.map);
        } else {
            if (this.marcadorDestino && this.map.hasLayer(this.marcadorDestino)) {
                this.map.removeLayer(this.marcadorDestino);
            }
            this.marcadorDestino = L.marker(e.latlng).addTo(this.map);
        }

        this.centrarMapaConMenu(L.latLngBounds([e.latlng, e.latlng]), 15);
        if (targetInput) targetInput.value = "Identificando lugar...";
        
        const auto = document.getElementById('autocomplete-container');
        if (auto) auto.style.display = 'none';

        try {
            const dir = await this.reverseGeocode(e.latlng.lat, e.latlng.lng);
            if (targetInput) targetInput.value = dir || "Punto en el mapa";
            if (!esOrigen && targetInput && dir) {
                window.AppManager?.guardarEnHistorial(dir);
            }
        } catch (error) {
            if (targetInput) targetInput.value = "Punto en el mapa";
        }

        this.procesarIntersecciones();
    },

    async reverseGeocode(lat, lon) {
        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18`);
            if (!res.ok) return null;
            const data = await res.json();
            return data?.address?.road || data?.address?.suburb || data?.display_name?.split(',')[0] || null;
        } catch (e) {
            return null;
        }
    },

    toggleLiveTracking(callbackOnUpdate) {
        if (!navigator.geolocation) {
            window.AppManager?.showToast('Tu navegador no soporta geolocalización', 'warning');
            return;
        }

        const liveBtn = document.getElementById('gps-live-btn');

        if (this.isLiveTracking) {
            // Detener seguimiento
            if (this.watchId !== null) {
                navigator.geolocation.clearWatch(this.watchId);
                this.watchId = null;
            }
            this.isLiveTracking = false;
            if (this.marcadorLive && this.map.hasLayer(this.marcadorLive)) {
                this.map.removeLayer(this.marcadorLive);
            }
            if (this.circuloPrecisionLive && this.map.hasLayer(this.circuloPrecisionLive)) {
                this.map.removeLayer(this.circuloPrecisionLive);
            }
            if (liveBtn) {
                liveBtn.classList.remove('active-tracking');
                liveBtn.innerHTML = 'Seguimiento en vivo';
            }
            window.AppManager?.showToast('Seguimiento GPS detenido', 'info');
        } else {
            // Iniciar seguimiento
            this.isLiveTracking = true;
            if (liveBtn) {
                liveBtn.classList.add('active-tracking');
                liveBtn.innerHTML = 'En vivo (activo)';
            }
            window.AppManager?.showToast('Seguimiento GPS en tiempo real activado', 'success');

            this.watchId = navigator.geolocation.watchPosition(
                (pos) => {
                    const latlng = L.latLng(pos.coords.latitude, pos.coords.longitude);
                    this.actualizarMarcadorLive(latlng, pos.coords.accuracy);
                    this.verificarAlertaProximidad(latlng);
                    if (callbackOnUpdate) callbackOnUpdate(latlng);
                },
                (err) => {
                    console.warn('Error en GPS watch:', err);
                    window.AppManager?.showToast('Señal GPS intermitente', 'warning');
                },
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 2000 }
            );
        }
    },

    actualizarMarcadorLive(latlng, accuracy) {
        if (!this.map) return;

        if (!this.marcadorLive) {
            const liveIcon = L.divIcon({
                className: 'custom-live-icon',
                html: `<div class="user-live-marker"><div class="user-live-pulse"></div><div class="user-live-dot"></div></div>`,
                iconSize: [28, 28],
                iconAnchor: [14, 14]
            });
            this.marcadorLive = L.marker(latlng, { icon: liveIcon, zIndexOffset: 1000 }).addTo(this.map);
        } else {
            this.marcadorLive.setLatLng(latlng);
        }

        if (accuracy && accuracy < 200) {
            if (!this.circuloPrecisionLive) {
                this.circuloPrecisionLive = L.circle(latlng, {
                    radius: accuracy,
                    color: '#305CDE',
                    weight: 1,
                    fillColor: '#305CDE',
                    fillOpacity: 0.1
                }).addTo(this.map);
            } else {
                this.circuloPrecisionLive.setLatLng(latlng);
                this.circuloPrecisionLive.setRadius(accuracy);
            }
        }
    },

    verificarAlertaProximidad(userLatlng) {
        if (!this.rutaDibujada || !window.RUTAS_DATA) return;

        // Comprueba si hay paradas en la ruta activa y si estamos a menos de 120 metros
        for (const rutaKey of Object.keys(window.RUTAS_DATA)) {
            const ruta = window.RUTAS_DATA[rutaKey];
            const dist = this.calcularDistanciaMinima(userLatlng, ruta);
            if (dist < 120 && this.lastProximityAlertStop !== rutaKey) {
                this.lastProximityAlertStop = rutaKey;
                const nombre = ruta.features[0].properties.nombre;
                window.AppManager?.showToast(`Estás cerca de la ruta: ${nombre}`, 'success');
                // Vibración háptica en móvil si está soportado
                if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
                break;
            }
        }
    },

    obtenerPuntoMasCercano(latlngRef, datosGeoJSON) {
        let minDistancia = Infinity, puntoCercano = null;
        const coordenadas = datosGeoJSON.features[0].geometry.coordinates;
        const ptRef = this.map.project(latlngRef, 18);

        for (let i = 0; i < coordenadas.length - 1; i++) {
            let p1 = this.map.project(L.latLng(coordenadas[i][1], coordenadas[i][0]), 18);
            let p2 = this.map.project(L.latLng(coordenadas[i+1][1], coordenadas[i+1][0]), 18);
            let closestPt = L.LineUtil.closestPointOnSegment(ptRef, p1, p2);
            let closestLatLng = this.map.unproject(closestPt, 18);
            let d = this.map.distance(latlngRef, closestLatLng);
            if (d < minDistancia) { minDistancia = d; puntoCercano = closestLatLng; }
        }
        return puntoCercano;
    },

    calcularDistanciaMinima(latlngRef, datosGeoJSON) {
        let puntoOptimo = this.obtenerPuntoMasCercano(latlngRef, datosGeoJSON);
        return puntoOptimo ? Math.round(this.map.distance(latlngRef, puntoOptimo)) : Infinity;
    },

    evaluarSentidoRuta(origenLatlng, destinoLatlng, datosGeoJSON) {
        let coords = datosGeoJSON.features[0].geometry.coordinates;
        let ptOrigen = this.map.project(origenLatlng, 18);
        let ptDestino = this.map.project(destinoLatlng, 18);
        
        let minDOrigen = Infinity, idxOrigen = -1;
        let minDDestino = Infinity, idxDestino = -1;

        for (let i = 0; i < coords.length - 1; i++) {
            let p1 = this.map.project(L.latLng(coords[i][1], coords[i][0]), 18);
            let p2 = this.map.project(L.latLng(coords[i+1][1], coords[i+1][0]), 18);
            
            let cOrigen = L.LineUtil.closestPointOnSegment(ptOrigen, p1, p2);
            let dOrigen = ptOrigen.distanceTo(cOrigen);
            if (dOrigen < minDOrigen) {
                minDOrigen = dOrigen;
                let segLength = p1.distanceTo(p2);
                let distToP1 = p1.distanceTo(cOrigen);
                idxOrigen = i + (segLength > 0 ? distToP1 / segLength : 0);
            }
            
            let cDestino = L.LineUtil.closestPointOnSegment(ptDestino, p1, p2);
            let dDestino = ptDestino.distanceTo(cDestino);
            if (dDestino < minDDestino) {
                minDDestino = dDestino;
                let segLength = p1.distanceTo(p2);
                let distToP1 = p1.distanceTo(cDestino);
                idxDestino = i + (segLength > 0 ? distToP1 / segLength : 0);
            }
        }
        return idxDestino >= (idxOrigen - 0.05); 
    },

    async trazarRutaCaminando(inicio, fin, capa) {
        if (!inicio || !fin || !capa) return;
        try {
            const url = `https://router.project-osrm.org/route/v1/foot/${inicio.lng},${inicio.lat};${fin.lng},${fin.lat}?geometries=geojson`;
            const res = await fetch(url);
            const data = await res.json();
            if (data?.routes?.[0]?.geometry) {
                L.geoJSON(data.routes[0].geometry, { 
                    style: { color: '#305CDE', weight: 4, dashArray: '4, 8' } 
                }).addTo(capa);
                return;
            }
        } catch (e) {}
        // Fallback si no hay conexión a internet con OSRM
        L.polyline([inicio, fin], { color: '#305CDE', weight: 4, dashArray: '4, 8' }).addTo(capa);
    },

    centrarMapaConMenu(bounds, zoomLimite = null) {
        const bottomSheet = document.querySelector('.map-bottom-sheet');
        const sheetHeight = bottomSheet ? bottomSheet.offsetHeight : 200;
        setTimeout(() => {
            let opts = { 
                paddingTopLeft: [18, 70], 
                paddingBottomRight: [18, sheetHeight + 20] 
            };
            if (zoomLimite) opts.maxZoom = zoomLimite;
            if (this.map) this.map.fitBounds(bounds, opts);
        }, 80);
    },

    dibujarRutaYPasos(nombre, colorHex, idRuta) {
        if (!this.map) return;
        if (this.rutaDibujada && this.map.hasLayer(this.rutaDibujada)) {
            this.map.removeLayer(this.rutaDibujada);
        }
        if (this.capasCaminata) this.capasCaminata.clearLayers();
        if (this.marcadoresRuta) this.marcadoresRuta.clearLayers();

        const datosRuta = window.RUTAS_DATA[idRuta];
        if (!datosRuta) return;

        this.rutaDibujada = L.geoJSON(datosRuta, { 
            style: { color: colorHex || '#305CDE', weight: 5, opacity: 0.9, lineCap: 'round' } 
        }).addTo(this.map);

        const coords = datosRuta.features[0].geometry.coordinates;
        if (coords?.length >= 2) {
            // Marcador de inicio
            L.marker([coords[0][1], coords[0][0]], { 
                icon: L.divIcon({ 
                    className: 'custom-start-icon', 
                    html: `<div style="width: 18px; height: 18px; background: white; border: 4px solid ${colorHex}; border-radius: 50%; box-sizing: border-box;"></div>`, 
                    iconSize: [18, 18],
                    iconAnchor: [9, 9]
                }) 
            }).addTo(this.marcadoresRuta);

            // Marcador de final con flecha apuntando hacia la dirección del recorrido
            const p1 = this.map.project(L.latLng(coords[coords.length - 2][1], coords[coords.length - 2][0]), 18);
            const p2 = this.map.project(L.latLng(coords[coords.length - 1][1], coords[coords.length - 1][0]), 18);
            const angleDeg = Math.atan2(p2.y - p1.y, p2.x - p1.x) * 180 / Math.PI;

            L.marker([coords[coords.length - 1][1], coords[coords.length - 1][0]], {
                icon: L.divIcon({
                    className: 'custom-end-arrow',
                    html: `<div style="transform: rotate(${angleDeg}deg); width: 22px; height: 22px; display: flex; justify-content: center; align-items: center;">
                             <svg width="18" height="18" viewBox="0 0 24 24" fill="${colorHex}" stroke="#ffffff" stroke-width="2" stroke-linejoin="round">
                               <polygon points="3,3 21,12 3,21 7,12" />
                             </svg>
                           </div>`,
                    iconSize: [22, 22],
                    iconAnchor: [11, 11]
                })
            }).addTo(this.marcadoresRuta);
        }

        // Trazado de caminata si origen y destino están fijados
        if (this.marcadorOrigen && this.marcadorDestino) {
            let ptInicio = this.obtenerPuntoMasCercano(this.marcadorOrigen.getLatLng(), datosRuta);
            let ptFin = this.obtenerPuntoMasCercano(this.marcadorDestino.getLatLng(), datosRuta);
            if (ptInicio) this.trazarRutaCaminando(this.marcadorOrigen.getLatLng(), ptInicio, this.capasCaminata);
            if (ptFin) this.trazarRutaCaminando(this.marcadorDestino.getLatLng(), ptFin, this.capasCaminata);
        }
    },

    procesarIntersecciones() {
        const resultsContainer = document.getElementById('route-results');
        if (!resultsContainer) return;
        if (!this.marcadorOrigen || !this.marcadorDestino) return;

        let origenLatlng = this.marcadorOrigen.getLatLng();
        let destinoLatlng = this.marcadorDestino.getLatLng();
        resultsContainer.style.display = 'block';

        let opciones = [];
        let rutasDescartadas = 0;
        const ciudadActual = localStorage.getItem('rapidito_ciudad') || "Barquisimeto";

        for (const [idRuta, datosRuta] of Object.entries(window.RUTAS_DATA || {})) {
            // Filtrar por ciudad si coincide
            if (datosRuta.ciudad && datosRuta.ciudad !== ciudadActual) continue;

            let sentidoValido = this.evaluarSentidoRuta(origenLatlng, destinoLatlng, datosRuta);
            if (!sentidoValido) { 
                rutasDescartadas++; 
                continue; 
            }

            let dist = this.calcularDistanciaMinima(destinoLatlng, datosRuta);
            let props = datosRuta.features[0].properties;
            opciones.push({ 
                idVar: idRuta, 
                nombre: props.nombre, 
                distanciaDestino: dist, 
                origen: props.origen, 
                destino: props.destino, 
                colorLinea: datosRuta.color || '#305CDE',
                frecuencia: props.frecuencia || '5-10 min',
                categoria: datosRuta.categoria || datosRuta.tipo || 'urbana'
            });
        }

        if (opciones.length === 0) {
            if (rutasDescartadas > 0) {
                resultsContainer.innerHTML = `<div class="result-title" style="text-align:center; padding: 12px 8px; color: var(--text-gray); line-height: 1.45; text-transform:none;">Ninguna ruta directa te sirve.<br>Las opciones cercanas van en <strong style="color:var(--text-dark);">sentido contrario</strong> a tu destino.</div>`;
            } else {
                resultsContainer.innerHTML = `<div class="result-title" style="text-align:center; padding: 12px 8px; color: var(--text-muted); text-transform:none; font-size:12px; line-height:1.4;">No se encontraron rutas registradas para este tramo en ${ciudadActual}.<br><span style="font-size:11px; opacity:0.75;">Próximamente se integrarán nuevas rutas a la base de datos.</span></div>`;
            }
            this.centrarMapaConMenu(L.latLngBounds([origenLatlng, destinoLatlng]));
            return;
        }

        opciones.sort((a, b) => a.distanciaDestino - b.distanciaDestino);
        let htmlContent = `<div class="result-title">Opciones sugeridas (${ciudadActual})</div>`;

        const tarifaStr = window.RatesManager?.pasajeNormalBs 
            ? `${window.RatesManager.pasajeNormalBs.toFixed(2)} Bs` 
            : 'Tarifa oficial';

        opciones.forEach((ruta, index) => {
            let textoDist = ruta.distanciaDestino > 1000 
                ? (ruta.distanciaDestino / 1000).toFixed(1) + ' km' 
                : ruta.distanciaDestino + ' m';
            let etiquetaGanadora = index === 0 ? `<span class="badge-cercana">Más óptima</span>` : '';
            
            const esRapidito = ruta.categoria === 'rapidito' || ruta.categoria === 'Rapidito';
            const tarifaItem = esRapidito
                ? `${(window.RatesManager?.pasajeRapiditoBs || 500).toFixed(0)} Bs (Rapidito)`
                : tarifaStr;

            htmlContent += `
                <div class="route-option interactive" onclick='GeoManager.dibujarRutaYPasos("${ruta.nombre}", "${ruta.colorLinea}", "${ruta.idVar}")'>
                    <div class="route-badge" style="background:${ruta.colorLinea};">${ruta.nombre.substring(0, 4).toUpperCase()}</div>
                    <div class="route-info">
                        <h4>${ruta.nombre} ${etiquetaGanadora}</h4>
                        <p style="margin-bottom: 2px; font-size: 11.5px; color: var(--neutral-accent); font-weight: 700;">${ruta.origen} → ${ruta.destino}</p>
                        <p>Caminando: <span style="color:var(--text-dark); font-weight:800;">${textoDist}</span> • Tarifa: ${tarifaItem} • Frec: ${ruta.frecuencia}</p>
                    </div>
                </div>
            `;
        });

        resultsContainer.innerHTML = htmlContent;
        this.centrarMapaConMenu(L.latLngBounds([origenLatlng, destinoLatlng]));
    }
};

window.GeoManager = GeoManager;
