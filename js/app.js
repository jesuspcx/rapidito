/**
 * Rapidito PWA - Coordinador Principal de la Aplicación
 */

const AppManager = {
    inputActivo: 'destino',
    vistaAnteriorMapa: 'viaje',
    deferredPrompt: null,
    typingTimerTrip: null,
    typingTimerMap: null,
    activeAbortController: null,

    init() {
        this.setupEventListeners();
        this.setupNetworkStatus();
        this.cargarTema();
        this.cargarPerfil();
        this.renderizarHistorial();
        this.setupPWA();

        // Ocultar pantalla de carga: siempre dura 5 segundos completos sincronizado con la barra de carga
        const splash = document.getElementById('splash-screen');
        if (splash) {
            setTimeout(() => {
                splash.classList.add('hidden');
                setTimeout(() => {
                    splash.style.display = 'none';
                }, 450);
            }, 5000);
        }
    },

    setupEventListeners() {
        const tripOrigenInput = document.getElementById('trip-origen-input');
        const tripDestinoInput = document.getElementById('trip-destino-input');
        const originInput = document.getElementById('input-origen');
        const searchInput = document.getElementById('map-search-input');

        if (tripOrigenInput) {
            this.configurarAutocompletado(tripOrigenInput, 'trip-auto-origen', 'origen');
        }
        if (tripDestinoInput) {
            this.configurarAutocompletado(tripDestinoInput, 'trip-auto-destino', 'destino');
        }

        if (originInput) {
            originInput.addEventListener('focus', () => { 
                this.inputActivo = 'origen'; 
                this.actualizarFocoInputs(); 
            });
            this.configurarAutocompletadoMapa(originInput, 'origen');
        }
        if (searchInput) {
            searchInput.addEventListener('focus', () => { 
                this.inputActivo = 'destino'; 
                this.actualizarFocoInputs(); 
            });
            this.configurarAutocompletadoMapa(searchInput, 'destino');
        }

        // Cierre de dropdowns al hacer clic fuera
        window.addEventListener('click', (e) => {
            const tripAutoOrigen = document.getElementById('trip-auto-origen');
            const tripAutoDestino = document.getElementById('trip-auto-destino');
            if (tripOrigenInput && tripAutoOrigen && !tripOrigenInput.contains(e.target) && !tripAutoOrigen.contains(e.target)) {
                tripAutoOrigen.style.display = 'none';
            }
            if (tripDestinoInput && tripAutoDestino && !tripDestinoInput.contains(e.target) && !tripAutoDestino.contains(e.target)) {
                tripAutoDestino.style.display = 'none';
            }
        });
    },

    setupNetworkStatus() {
        const banner = document.getElementById('offline-banner');
        if (!banner) return;

        const updateStatus = () => {
            if (!navigator.onLine) {
                banner.innerText = 'Modo sin conexión (rutas y tarifas en caché)';
                banner.classList.remove('online-recovered');
                banner.classList.add('active');
            } else {
                if (banner.classList.contains('active')) {
                    banner.innerText = 'Conexión restablecida';
                    banner.classList.add('online-recovered');
                    setTimeout(() => {
                        banner.classList.remove('active');
                    }, 2500);
                    // Actualizar tasas si volvimos online
                    window.RatesManager?.actualizarTasas();
                }
            }
        };

        window.addEventListener('offline', updateStatus);
        window.addEventListener('online', updateStatus);

        if (!navigator.onLine) {
            updateStatus();
        }
    },

    showToast(mensaje, tipo = 'info') {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast ${tipo}`;
        
        let iconSvg = '';
        if (tipo === 'success') {
            iconSvg = `<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
        } else if (tipo === 'warning') {
            iconSvg = `<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`;
        } else {
            iconSvg = `<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`;
        }

        toast.innerHTML = `${iconSvg}<span>${this.escapeHTML(mensaje)}</span>`;
        container.appendChild(toast);

        requestAnimationFrame(() => {
            toast.classList.add('show');
        });

        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3200);
    },

    escapeHTML(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    },

    cargarTema() {
        const guardado = localStorage.getItem('rapidito_theme');
        if (guardado === 'dark' || (!guardado && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
            document.body.classList.add('dark-mode');
        } else {
            document.body.classList.remove('dark-mode');
        }
        this.actualizarIconoTema();
    },

    toggleDarkMode() {
        const btn = document.getElementById('theme-toggle-btn');
        if (btn) {
            btn.classList.remove('theme-spinning');
            void btn.offsetWidth; // forzar reflow para reiniciar animación
            btn.classList.add('theme-spinning');
            setTimeout(() => btn.classList.remove('theme-spinning'), 650);
        }
        document.body.classList.toggle('dark-mode');
        const isDark = document.body.classList.contains('dark-mode');
        localStorage.setItem('rapidito_theme', isDark ? 'dark' : 'light');
        this.actualizarIconoTema();
    },

    actualizarIconoTema() {
        const iconContainer = document.getElementById('theme-icon');
        if (!iconContainer) return;
        if (document.body.classList.contains('dark-mode')) {
            // Icono minimalista de Sol (para cambiar a modo claro)
            iconContainer.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>`;
        } else {
            // Icono minimalista de Luna (para cambiar a modo oscuro)
            iconContainer.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>`;
        }
    },

    cargarPerfil() {
        const nombre = localStorage.getItem('rapidito_nombre') || 'Jesús Vásquez';
        const ciudad = localStorage.getItem('rapidito_ciudad') || 'Barquisimeto';
        const categoria = localStorage.getItem('rapidito_categoria') || 'estandar';
        const transporte = localStorage.getItem('rapidito_transporte') || 'todos';
        const moneda = localStorage.getItem('rapidito_moneda') || 'ambas';
        const casa = localStorage.getItem('rapidito_casa') || '';
        const trabajo = localStorage.getItem('rapidito_trabajo') || '';
        const alertaGPS = localStorage.getItem('rapidito_alerta_gps') !== 'false';
        const inicial = nombre.charAt(0).toUpperCase();

        const nameEl = document.getElementById('sp-name-text');
        if (nameEl) nameEl.innerText = nombre;

        const editCityEl = document.getElementById('edit-ciudad-display');
        if (editCityEl) editCityEl.innerText = ciudad;

        const editCityVal = document.getElementById('edit-ciudad-value');
        if (editCityVal) editCityVal.value = ciudad;

        const badgeCity = document.getElementById('header-city-badge');
        if (badgeCity) badgeCity.innerText = ciudad;

        const spCityBadge = document.getElementById('sp-city-badge');
        if (spCityBadge) spCityBadge.innerText = ciudad;

        const spCatBadge = document.getElementById('sp-category-badge');
        if (spCatBadge) {
            const catLabels = {
                estandar: 'General',
                estudiante: 'Estudiante (50%)',
                adulto_mayor: 'Tercera Edad (50%)'
            };
            spCatBadge.innerText = catLabels[categoria] || 'General';
        }

        document.querySelectorAll('.avatar-dash, .sp-avatar').forEach(el => el.innerText = inicial);

        // Poblar campos del formulario modal de perfil
        const inputNombre = document.getElementById('edit-nombre');
        if (inputNombre) inputNombre.value = nombre;

        const selectCategoria = document.getElementById('edit-categoria');
        if (selectCategoria) selectCategoria.value = categoria;

        const selectTransporte = document.getElementById('edit-transporte');
        if (selectTransporte) selectTransporte.value = transporte;

        const selectMoneda = document.getElementById('edit-moneda');
        if (selectMoneda) selectMoneda.value = moneda;

        const inputCasa = document.getElementById('edit-casa');
        if (inputCasa) inputCasa.value = casa;

        const inputTrabajo = document.getElementById('edit-trabajo');
        if (inputTrabajo) inputTrabajo.value = trabajo;

        const checkAlerta = document.getElementById('edit-alerta-gps');
        if (checkAlerta) checkAlerta.checked = alertaGPS;

        const inputTarifaRap = document.getElementById('edit-tarifa-rapidito');
        const tarifaRap = localStorage.getItem('rapidito_tarifa_rapidito') || '500';
        if (inputTarifaRap) inputTarifaRap.value = tarifaRap;

        this.actualizarChipsLugares(casa, trabajo);
    },

    guardarPerfil() {
        const inputNombre = document.getElementById('edit-nombre');
        const inputCiudad = document.getElementById('edit-ciudad-value');
        const selectCategoria = document.getElementById('edit-categoria');
        const selectTransporte = document.getElementById('edit-transporte');
        const selectMoneda = document.getElementById('edit-moneda');
        const inputCasa = document.getElementById('edit-casa');
        const inputTrabajo = document.getElementById('edit-trabajo');
        const checkAlerta = document.getElementById('edit-alerta-gps');
        const inputTarifaRap = document.getElementById('edit-tarifa-rapidito');

        if (inputNombre && inputNombre.value.trim()) {
            localStorage.setItem('rapidito_nombre', inputNombre.value.trim());
        }
        if (inputCiudad && inputCiudad.value.trim()) {
            localStorage.setItem('rapidito_ciudad', inputCiudad.value.trim());
        }
        if (selectCategoria) {
            localStorage.setItem('rapidito_categoria', selectCategoria.value);
        }
        if (selectTransporte) {
            localStorage.setItem('rapidito_transporte', selectTransporte.value);
        }
        if (selectMoneda) {
            localStorage.setItem('rapidito_moneda', selectMoneda.value);
        }
        if (inputCasa) {
            localStorage.setItem('rapidito_casa', inputCasa.value.trim());
        }
        if (inputTrabajo) {
            localStorage.setItem('rapidito_trabajo', inputTrabajo.value.trim());
        }
        if (checkAlerta) {
            localStorage.setItem('rapidito_alerta_gps', checkAlerta.checked ? 'true' : 'false');
        }
        if (inputTarifaRap && !isNaN(parseFloat(inputTarifaRap.value)) && parseFloat(inputTarifaRap.value) > 0) {
            const valRap = parseFloat(inputTarifaRap.value);
            localStorage.setItem('rapidito_tarifa_rapidito', valRap.toString());
            if (window.RatesManager) {
                window.RatesManager.setPasajeRapidito(valRap);
            }
        }

        this.cargarPerfil();
        this.cerrarModal('modal-editar-perfil');
        this.showToast('Perfil actualizado correctamente', 'success');
        setTimeout(() => this.abrirPanelPerfil(), 150);
    },

    actualizarChipsLugares(casa, trabajo) {
        const container = document.getElementById('trip-saved-chips');
        if (!container) return;
        container.innerHTML = '';
        if (!casa && !trabajo) {
            container.style.display = 'none';
            return;
        }
        container.style.display = 'flex';
        if (casa) {
            const chip = document.createElement('div');
            chip.className = 'saved-place-chip interactive';
            chip.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path></svg> <span>Casa: ${casa}</span>`;
            chip.onclick = () => {
                const destInput = document.getElementById('trip-destino-input');
                if (destInput) {
                    destInput.value = casa;
                    this.cotizarViajeDesdeVista();
                }
            };
            container.appendChild(chip);
        }
        if (trabajo) {
            const chip = document.createElement('div');
            chip.className = 'saved-place-chip interactive';
            chip.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="2" y="7" width="20" height="14" rx="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg> <span>Trabajo: ${trabajo}</span>`;
            chip.onclick = () => {
                const destInput = document.getElementById('trip-destino-input');
                if (destInput) {
                    destInput.value = trabajo;
                    this.cotizarViajeDesdeVista();
                }
            };
            container.appendChild(chip);
        }
    },

    abrirPanelPerfil() {
        document.getElementById('panel-overlay')?.classList.add('active');
        document.getElementById('side-panel')?.classList.add('active');
    },

    cerrarPanelPerfil() {
        document.getElementById('panel-overlay')?.classList.remove('active');
        document.getElementById('side-panel')?.classList.remove('active');
    },

    abrirDesdePanel(modalId) {
        this.cerrarPanelPerfil();
        setTimeout(() => {
            if (modalId === 'modal-viajes') this.llenarModalViajes();
            this.abrirModal(modalId);
        }, 180);
    },

    abrirModal(id) {
        if (id === 'modal-calculadora' && window.RatesManager) {
            const prefTransporte = localStorage.getItem('rapidito_transporte');
            if (prefTransporte === 'rapidito') {
                window.RatesManager.setServicioCalculadora('rapidito');
            } else {
                window.RatesManager.setServicioCalculadora('urbana');
            }
            const cat = localStorage.getItem('rapidito_categoria');
            if (cat === 'estudiante' || cat === 'adulto_mayor') {
                window.RatesManager.pasajerosRegular = 0;
                window.RatesManager.pasajerosPref = 1;
            } else {
                window.RatesManager.pasajerosRegular = 1;
                window.RatesManager.pasajerosPref = 0;
            }
            window.RatesManager.actualizarResultadosCalculadora();
        }
        document.getElementById(id)?.classList.add('active');
    },

    cerrarModal(id) {
        document.getElementById(id)?.classList.remove('active');
    },

    // Módulo Financiero Unificado (Bandeja sin espacios vacíos)
    activeFinanceTab: null,
    toggleFinanceModule(tipo) {
        const tray = document.getElementById('finance-tray');
        const trayDivisas = document.getElementById('tray-divisas');
        const trayPasaje = document.getElementById('tray-pasaje');
        const pillDivisas = document.getElementById('pill-divisas');
        const pillPasaje = document.getElementById('pill-pasaje');
        const flechaDivisas = document.getElementById('flecha-divisas');
        const flechaPasaje = document.getElementById('flecha-pasaje');

        if (!tray) return;

        const isCurrentlyOpen = (this.activeFinanceTab === tipo && tray.classList.contains('open'));

        if (isCurrentlyOpen) {
            tray.classList.remove('open');
            this.activeFinanceTab = null;
            pillDivisas?.classList.remove('active');
            pillPasaje?.classList.remove('active');
            flechaDivisas?.classList.remove('up');
            flechaPasaje?.classList.remove('up');
        } else {
            this.activeFinanceTab = tipo;
            tray.classList.add('open');

            if (tipo === 'divisas') {
                trayDivisas?.classList.add('active');
                trayPasaje?.classList.remove('active');
                pillDivisas?.classList.add('active');
                pillPasaje?.classList.remove('active');
                flechaDivisas?.classList.add('up');
                flechaPasaje?.classList.remove('up');
            } else {
                trayPasaje?.classList.add('active');
                trayDivisas?.classList.remove('active');
                pillPasaje?.classList.add('active');
                pillDivisas?.classList.remove('active');
                flechaPasaje?.classList.add('up');
                flechaDivisas?.classList.remove('up');
            }
        }
    },

    // Vistas principales
    lastGpsCoords: null,
    lastGpsAddress: null,

    abrirVistaViaje() {
        window.GeoManager?.limpiarMapa();
        document.getElementById('dashboard-wrapper')?.classList.add('hidden');
        const tripView = document.getElementById('trip-view');
        if (tripView) tripView.classList.add('active');

        const tripOrigenInput = document.getElementById('trip-origen-input');
        if (tripOrigenInput) {
            tripOrigenInput.value = this.lastGpsAddress || "Mi ubicación actual";
        }

        // Obtener GPS en segundo plano de inmediato
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                async (pos) => {
                    this.lastGpsCoords = L.latLng(pos.coords.latitude, pos.coords.longitude);
                    const addr = await window.GeoManager?.reverseGeocode(pos.coords.latitude, pos.coords.longitude);
                    if (addr) {
                        this.lastGpsAddress = addr;
                        const inputOrig = document.getElementById('trip-origen-input');
                        if (inputOrig && (inputOrig.value === "Mi ubicación actual" || inputOrig.value === "Ubicación actual")) {
                            inputOrig.value = addr;
                        }
                    }
                },
                () => {},
                { enableHighAccuracy: true, timeout: 6000 }
            );
        }

        this.renderizarHistorial();
        document.getElementById('trip-destino-input')?.focus();
    },

    cerrarVistaViaje() {
        window.GeoManager?.limpiarMapa();
        document.getElementById('trip-view')?.classList.remove('active');
        document.getElementById('dashboard-wrapper')?.classList.remove('hidden');
    },

    volverAVistaViaje() {
        window.GeoManager?.limpiarMapa();
        document.getElementById('map-ui-view')?.classList.remove('active');
        if (this.vistaAnteriorMapa === 'dashboard') {
            document.getElementById('trip-view')?.classList.remove('active');
            document.getElementById('dashboard-wrapper')?.classList.remove('hidden');
        } else {
            document.getElementById('dashboard-wrapper')?.classList.add('hidden');
            document.getElementById('trip-view')?.classList.add('active');
        }
    },

    abrirMapaDesdeVistaViaje() {
        this.vistaAnteriorMapa = 'viaje';
        document.getElementById('dashboard-wrapper')?.classList.add('hidden');
        document.getElementById('trip-view')?.classList.remove('active');
        document.getElementById('map-ui-view')?.classList.add('active');
        setTimeout(() => {
            if (window.GeoManager?.map) window.GeoManager.map.invalidateSize();
        }, 80);
        this.inputActivo = 'destino';
        this.actualizarFocoInputs();
    },

    cotizarViajeDesdeVista() {
        const destinoInput = document.getElementById('trip-destino-input');
        const origenInput = document.getElementById('trip-origen-input');
        if (!destinoInput || !destinoInput.value.trim()) {
            this.showToast('Por favor introduce tu destino', 'warning');
            return;
        }
        const destStr = destinoInput.value.trim();
        this.guardarEnHistorial(destStr);

        const origVal = origenInput?.value?.trim();
        const esGps = (!origVal || origVal === "Ubicación actual" || origVal === "Mi ubicación actual" || origVal === this.lastGpsAddress);

        if (esGps) {
            this.abrirMapaConRutasPersonalizadas(null, destStr, false, this.lastGpsCoords);
        } else {
            this.abrirMapaConRutasPersonalizadas(origVal, destStr, false, null);
        }
    },

    abrirMapaConRutasPersonalizadas(origenStr, destinoStr, desdeDirectorio = false, coordsGps = null) {
        this.vistaAnteriorMapa = desdeDirectorio ? 'dashboard' : 'viaje';
        document.getElementById('dashboard-wrapper')?.classList.add('hidden');
        document.getElementById('trip-view')?.classList.remove('active');
        document.getElementById('map-ui-view')?.classList.add('active');

        setTimeout(() => {
            if (window.GeoManager?.map) window.GeoManager.map.invalidateSize();
        }, 80);

        const originInput = document.getElementById('input-origen');
        const searchInput = document.getElementById('map-search-input');
        if (originInput) originInput.value = origenStr || this.lastGpsAddress || "Mi ubicación actual";
        if (searchInput) searchInput.value = destinoStr || "";

        this.inputActivo = 'destino';
        this.actualizarFocoInputs();

        const ciudadActual = localStorage.getItem('rapidito_ciudad') || "Barquisimeto";
        let bounds = L.latLngBounds();
        let tieneDestino = false;

        // Fijar origen por GPS en automático si fue solicitado
        if (coordsGps && window.GeoManager?.map) {
            if (window.GeoManager.marcadorOrigen && window.GeoManager.map.hasLayer(window.GeoManager.marcadorOrigen)) {
                window.GeoManager.map.removeLayer(window.GeoManager.marcadorOrigen);
            }
            window.GeoManager.marcadorOrigen = L.circleMarker(coordsGps, {
                radius: 7,
                fillColor: "var(--brand-primary)",
                color: "#fff",
                weight: 2,
                fillOpacity: 1
            }).addTo(window.GeoManager.map);
            bounds.extend(coordsGps);
        }

        if (destinoStr) {
            fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(destinoStr + ", " + ciudadActual)}&limit=1`)
                .then(res => res.json())
                .then(data => {
                    if (data?.length > 0 && window.GeoManager?.map) {
                        const latlngDest = L.latLng(data[0].lat, data[0].lon);
                        if (window.GeoManager.marcadorDestino && window.GeoManager.map.hasLayer(window.GeoManager.marcadorDestino)) {
                            window.GeoManager.map.removeLayer(window.GeoManager.marcadorDestino);
                        }
                        window.GeoManager.marcadorDestino = L.marker(latlngDest).addTo(window.GeoManager.map);
                        bounds.extend(latlngDest);
                        tieneDestino = true;

                        if (window.GeoManager.marcadorOrigen) {
                            window.GeoManager.centrarMapaConMenu(bounds, 15);
                            window.GeoManager.procesarIntersecciones();
                        } else if (!origenStr && !coordsGps && !desdeDirectorio) {
                            this.inputActivo = 'origen';
                            this.ubicarConGPS();
                        }
                    }
                }).catch(() => {});
        }

        if (origenStr && origenStr !== "Ubicación actual" && origenStr !== "Mi ubicación actual") {
            fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(origenStr + ", " + ciudadActual)}&limit=1`)
                .then(res => res.json())
                .then(data => {
                    if (data?.length > 0 && window.GeoManager?.map) {
                        const latlngOrig = L.latLng(data[0].lat, data[0].lon);
                        if (window.GeoManager.marcadorOrigen && window.GeoManager.map.hasLayer(window.GeoManager.marcadorOrigen)) {
                            window.GeoManager.map.removeLayer(window.GeoManager.marcadorOrigen);
                        }
                        window.GeoManager.marcadorOrigen = L.circleMarker(latlngOrig, {
                            radius: 7,
                            fillColor: "var(--brand-primary)",
                            color: "#fff",
                            weight: 2,
                            fillOpacity: 1
                        }).addTo(window.GeoManager.map);
                        bounds.extend(latlngOrig);

                        if (tieneDestino) {
                            window.GeoManager.centrarMapaConMenu(bounds, 15);
                            window.GeoManager.procesarIntersecciones();
                        } else {
                            window.GeoManager.centrarMapaConMenu(L.latLngBounds([latlngOrig, latlngOrig]), 15);
                        }
                    }
                }).catch(() => {
                    this.inputActivo = 'origen';
                    this.ubicarConGPS();
                });
        } else if (!coordsGps && !desdeDirectorio) {
            this.inputActivo = 'origen';
            this.ubicarConGPS();
        }
    },

    ubicarConGPS() {
        const targetInput = (this.inputActivo === 'origen')
            ? document.getElementById('input-origen')
            : document.getElementById('map-search-input');

        if (targetInput) targetInput.value = "Obteniendo señal GPS...";

        if (!navigator.geolocation) {
            this.showToast('GPS no disponible en este dispositivo', 'warning');
            return;
        }

        navigator.geolocation.getCurrentPosition(
            async (pos) => {
                const latlng = L.latLng(pos.coords.latitude, pos.coords.longitude);
                if (window.GeoManager?.map) {
                    if (this.inputActivo === 'origen') {
                        if (window.GeoManager.marcadorOrigen && window.GeoManager.map.hasLayer(window.GeoManager.marcadorOrigen)) {
                            window.GeoManager.map.removeLayer(window.GeoManager.marcadorOrigen);
                        }
                        window.GeoManager.marcadorOrigen = L.circleMarker(latlng, {
                            radius: 7,
                            fillColor: "var(--primary-brand)",
                            color: "#fff",
                            weight: 2,
                            fillOpacity: 1
                        }).addTo(window.GeoManager.map);
                    } else {
                        if (window.GeoManager.marcadorDestino && window.GeoManager.map.hasLayer(window.GeoManager.marcadorDestino)) {
                            window.GeoManager.map.removeLayer(window.GeoManager.marcadorDestino);
                        }
                        window.GeoManager.marcadorDestino = L.marker(latlng).addTo(window.GeoManager.map);
                    }
                    window.GeoManager.centrarMapaConMenu(L.latLngBounds([latlng, latlng]), 15);
                }

                try {
                    const dir = await window.GeoManager?.reverseGeocode(latlng.lat, latlng.lng);
                    if (targetInput) targetInput.value = dir || "Mi ubicación actual";
                    if (this.inputActivo === 'destino' && dir) this.guardarEnHistorial(dir);
                } catch(e) {
                    if (targetInput) targetInput.value = "Mi ubicación actual";
                }

                if (window.GeoManager?.marcadorOrigen && window.GeoManager?.marcadorDestino) {
                    window.GeoManager.procesarIntersecciones();
                }
            },
            () => {
                if (targetInput) targetInput.value = "Toca el mapa para fijar";
                this.showToast('No pudimos acceder al GPS. Toca el mapa.', 'warning');
            },
            { enableHighAccuracy: true, timeout: 8000 }
        );
    },

    actualizarFocoInputs() {
        const originInput = document.getElementById('input-origen');
        const searchInput = document.getElementById('map-search-input');
        if (!originInput || !searchInput) return;

        if (this.inputActivo === 'origen') {
            originInput.style.borderColor = "var(--neutral-accent)";
            originInput.style.backgroundColor = "var(--card-bg)";
            searchInput.style.borderColor = "transparent";
            searchInput.style.backgroundColor = "var(--input-bg)";
        } else {
            searchInput.style.borderColor = "var(--neutral-accent)";
            searchInput.style.backgroundColor = "var(--card-bg)";
            originInput.style.borderColor = "transparent";
            originInput.style.backgroundColor = "var(--input-bg)";
        }
    },

    // Autocompletado con Debounce y AbortController
    configurarAutocompletado(inputEl, dropdownId, tipo) {
        const dropdownEl = document.getElementById(dropdownId);
        if (!inputEl || !dropdownEl) return;

        inputEl.addEventListener('input', () => {
            clearTimeout(this.typingTimerTrip);
            const query = inputEl.value.trim();
            if (query.length < 3) {
                dropdownEl.style.display = 'none';
                return;
            }

            this.typingTimerTrip = setTimeout(async () => {
                const ciudadActual = localStorage.getItem('rapidito_ciudad') || "Barquisimeto";
                try {
                    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query + ", " + ciudadActual)}&limit=4`);
                    const data = await res.json();
                    let html = '';
                    data.forEach(item => {
                        const nombreStr = item.display_name.split(',').slice(0, 3).join(', ');
                        const safeNombre = this.escapeHTML(nombreStr);
                        html += `<div class="trip-auto-item interactive" onclick="AppManager.seleccionarSugerenciaVista('${safeNombre.replace(/'/g, "\\'")}', '${tipo}')"><span class="auto-item-text">${safeNombre}</span></div>`;
                    });
                    dropdownEl.innerHTML = html;
                    dropdownEl.style.display = data.length ? 'block' : 'none';
                } catch(e) {}
            }, 380);
        });
    },

    seleccionarSugerenciaVista(lugar, tipo) {
        const tripOrigenInput = document.getElementById('trip-origen-input');
        const tripDestinoInput = document.getElementById('trip-destino-input');
        const tripAutoOrigen = document.getElementById('trip-auto-origen');
        const tripAutoDestino = document.getElementById('trip-auto-destino');

        if (tipo === 'origen') {
            if (tripOrigenInput) tripOrigenInput.value = lugar;
            if (tripAutoOrigen) tripAutoOrigen.style.display = 'none';
        } else {
            if (tripDestinoInput) tripDestinoInput.value = lugar;
            if (tripAutoDestino) tripAutoDestino.style.display = 'none';
            this.guardarEnHistorial(lugar);
            this.cotizarViajeDesdeVista();
        }
    },

    configurarAutocompletadoMapa(inputElement, tipoInput) {
        const autocompleteContainer = document.getElementById('autocomplete-container');
        const resultsContainer = document.getElementById('route-results');

        inputElement.addEventListener('input', () => {
            clearTimeout(this.typingTimerMap);
            const query = inputElement.value.trim();
            if (query.length < 3) {
                if (autocompleteContainer) autocompleteContainer.style.display = 'none';
                return;
            }

            this.typingTimerMap = setTimeout(async () => {
                const ciudadActual = localStorage.getItem('rapidito_ciudad') || "Barquisimeto";
                try {
                    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query + ", " + ciudadActual)}&limit=4`);
                    const data = await res.json();
                    let html = '';
                    data.forEach(item => {
                        const nombreStr = item.display_name.split(',').slice(0, 3).join(', ');
                        const safeNombre = this.escapeHTML(nombreStr);
                        html += `<div class="trip-auto-item interactive" onclick="AppManager.seleccionarSugerenciaMapa(${item.lat}, ${item.lon}, '${safeNombre.replace(/'/g, "\\'")}', '${tipoInput}')"><span class="auto-item-text">${safeNombre}</span></div>`;
                    });
                    if (autocompleteContainer) {
                        autocompleteContainer.innerHTML = html;
                        autocompleteContainer.style.display = data.length ? 'block' : 'none';
                    }
                    if (resultsContainer) resultsContainer.style.display = 'none';
                } catch(e) {}
            }, 420);
        });
    },

    seleccionarSugerenciaMapa(lat, lon, nombreLugar, tipoInput) {
        const latlng = L.latLng(lat, lon);
        const originInput = document.getElementById('input-origen');
        const searchInput = document.getElementById('map-search-input');
        const autocompleteContainer = document.getElementById('autocomplete-container');

        if (tipoInput === 'origen') {
            if (window.GeoManager?.marcadorOrigen && window.GeoManager.map.hasLayer(window.GeoManager.marcadorOrigen)) {
                window.GeoManager.map.removeLayer(window.GeoManager.marcadorOrigen);
            }
            window.GeoManager.marcadorOrigen = L.circleMarker(latlng, {
                radius: 7,
                fillColor: "var(--primary-brand)",
                color: "#fff",
                weight: 2,
                fillOpacity: 1
            }).addTo(window.GeoManager.map);
            if (originInput) originInput.value = nombreLugar;
        } else {
            if (window.GeoManager?.marcadorDestino && window.GeoManager.map.hasLayer(window.GeoManager.marcadorDestino)) {
                window.GeoManager.map.removeLayer(window.GeoManager.marcadorDestino);
            }
            window.GeoManager.marcadorDestino = L.marker(latlng).addTo(window.GeoManager.map);
            if (searchInput) searchInput.value = nombreLugar;
            this.guardarEnHistorial(nombreLugar);
        }

        if (autocompleteContainer) autocompleteContainer.style.display = 'none';

        if (window.GeoManager?.marcadorOrigen && window.GeoManager?.marcadorDestino) {
            window.GeoManager.centrarMapaConMenu(L.latLngBounds([window.GeoManager.marcadorOrigen.getLatLng(), window.GeoManager.marcadorDestino.getLatLng()]), 15);
            window.GeoManager.procesarIntersecciones();
        } else {
            window.GeoManager?.centrarMapaConMenu(L.latLngBounds([latlng, latlng]), 15);
        }
    },

    // Gestión del Historial
    guardarEnHistorial(destino) {
        if (!destino || destino.trim() === "") return;
        let historial = JSON.parse(localStorage.getItem('rapidito_historial')) || [];
        historial = historial.filter(item => item.toLowerCase() !== destino.toLowerCase());
        historial.unshift(destino);
        if (historial.length > 6) historial.pop();
        localStorage.setItem('rapidito_historial', JSON.stringify(historial));
        this.renderizarHistorial();
    },

    eliminarDelHistorial(event, destino) {
        event.stopPropagation();
        let historial = JSON.parse(localStorage.getItem('rapidito_historial')) || [];
        historial = historial.filter(item => item !== destino);
        localStorage.setItem('rapidito_historial', JSON.stringify(historial));
        this.renderizarHistorial();
        this.llenarModalViajes();
        this.showToast('Destino eliminado del historial', 'info');
    },

    renderizarHistorial() {
        const contenedor = document.getElementById('historial-container');
        if (!contenedor) return;
        let historial = JSON.parse(localStorage.getItem('rapidito_historial')) || [];
        if (historial.length === 0) {
            contenedor.innerHTML = `<p style="font-size:12px; color:var(--text-gray); text-align:center; padding:10px;">No hay búsquedas recientes</p>`;
            return;
        }

        let html = '';
        historial.forEach(dest => {
            const safeDest = this.escapeHTML(dest);
            html += `
                <div class="recent-item interactive" onclick="AppManager.seleccionarHistorial('${safeDest.replace(/'/g, "\\'")}')">
                    <div class="recent-info">
                        <div class="recent-icon">
                            <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                        </div>
                        <div class="recent-text">
                            <h4>${safeDest}</h4>
                            <p>Búsqueda reciente</p>
                        </div>
                    </div>
                    <span class="delete-recent interactive" onclick="AppManager.eliminarDelHistorial(event, '${safeDest.replace(/'/g, "\\'")}')" title="Eliminar">
                        <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </span>
                </div>
            `;
        });
        contenedor.innerHTML = html;
    },

    seleccionarHistorial(destino) {
        const tripDestinoInput = document.getElementById('trip-destino-input');
        if (tripDestinoInput) {
            tripDestinoInput.value = destino;
            this.cotizarViajeDesdeVista();
        }
    },

    llenarModalViajes() {
        const contenedor = document.getElementById('lista-mis-viajes');
        if (!contenedor) return;
        let historial = JSON.parse(localStorage.getItem('rapidito_historial')) || [];
        if (historial.length === 0) {
            contenedor.innerHTML = `<div style="padding:14px; text-align:center; color:var(--text-gray); font-size:12.5px; font-weight:600; background:var(--input-bg); border-radius:12px;">No tienes viajes registrados en el historial.</div>`;
            return;
        }
        let html = '';
        historial.forEach(dest => {
            const safe = this.escapeHTML(dest);
            html += `<div style="padding:10px 14px; background:var(--input-bg); border-radius:12px; font-weight:600; font-size:12.5px; color:var(--text-dark); display:flex; justify-content:space-between; align-items:center;">
                <span>${safe}</span>
                <span class="interactive" onclick="AppManager.eliminarDelHistorial(event, '${safe.replace(/'/g, "\\'")}')" style="color:var(--text-gray); padding:4px; font-size:15px; line-height:1;">&times;</span>
            </div>`;
        });
        contenedor.innerHTML = html;
    },

    // Toggle de Rutas Urbanas en Dashboard
    toggleRutasList() {
        const list = document.getElementById('rutas-list-container');
        const arrow = document.getElementById('flecha-rutas');
        if (!list || !arrow) return;

        if (list.classList.contains('active')) {
            list.classList.remove('active');
            arrow.classList.remove('up');
        } else {
            list.classList.add('active');
            arrow.classList.add('up');
            list.innerHTML = '<div class="ruta-item" style="color: var(--text-gray); justify-content: center; font-size: 12px;">Buscando rutas urbanas...</div>';

            if (window.GeoManager?.marcadorOrigen) {
                this.renderizarListaRutas(window.GeoManager.marcadorOrigen.getLatLng(), 'urbana', 'rutas-list-container');
            } else if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    (pos) => this.renderizarListaRutas(L.latLng(pos.coords.latitude, pos.coords.longitude), 'urbana', 'rutas-list-container'),
                    () => this.renderizarListaRutas(null, 'urbana', 'rutas-list-container'),
                    { timeout: 4000 }
                );
            } else {
                this.renderizarListaRutas(null, 'urbana', 'rutas-list-container');
            }
        }
    },

    // Toggle de Líneas de Rapiditos en Dashboard
    toggleRapiditosList() {
        const list = document.getElementById('rapiditos-list-container');
        const arrow = document.getElementById('flecha-rapiditos');
        if (!list || !arrow) return;

        if (list.classList.contains('active')) {
            list.classList.remove('active');
            arrow.classList.remove('up');
        } else {
            list.classList.add('active');
            arrow.classList.add('up');
            list.innerHTML = '<div class="ruta-item" style="color: var(--text-gray); justify-content: center; font-size: 12px;">Buscando líneas de rapiditos...</div>';

            if (window.GeoManager?.marcadorOrigen) {
                this.renderizarListaRutas(window.GeoManager.marcadorOrigen.getLatLng(), 'rapidito', 'rapiditos-list-container');
            } else if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    (pos) => this.renderizarListaRutas(L.latLng(pos.coords.latitude, pos.coords.longitude), 'rapidito', 'rapiditos-list-container'),
                    () => this.renderizarListaRutas(null, 'rapidito', 'rapiditos-list-container'),
                    { timeout: 4000 }
                );
            } else {
                this.renderizarListaRutas(null, 'rapidito', 'rapiditos-list-container');
            }
        }
    },

    renderizarListaRutas(userLatlng, categoriaFiltro = 'urbana', contenedorId = 'rutas-list-container') {
        const list = document.getElementById(contenedorId);
        if (!list) return;

        const ciudadActual = localStorage.getItem('rapidito_ciudad') || "Barquisimeto";
        let opciones = [];

        for (const [id, ruta] of Object.entries(window.RUTAS_DATA || {})) {
            if (ruta.ciudad && ruta.ciudad !== ciudadActual) continue;
            const catRuta = ruta.categoria || (ruta.tipo === 'Rapidito' ? 'rapidito' : 'urbana');
            if (categoriaFiltro && catRuta !== categoriaFiltro) continue;

            const props = ruta.features[0].properties;
            const dist = userLatlng ? window.GeoManager?.calcularDistanciaMinima(userLatlng, ruta) : null;
            opciones.push({
                idVar: id,
                nombre: props.nombre,
                distancia: dist,
                acronimo: props.nombre.substring(0, 3).toUpperCase(),
                origen: props.origen,
                destino: props.destino,
                color: ruta.color || (catRuta === 'rapidito' ? '#f59e0b' : '#305CDE')
            });
        }

        if (opciones.length === 0) {
            const labelTipo = categoriaFiltro === 'rapidito' ? 'líneas de rapiditos' : 'rutas urbanas';
            list.innerHTML = `
                <div class="ruta-item" style="color: var(--text-muted); justify-content: center; font-size: 12px; text-align: center; padding: 16px 12px; flex-direction: column; gap: 4px; border: none; background: transparent;">
                    <span style="font-weight: 700; color: var(--text-secondary);">No hay ${labelTipo} registradas aún en ${ciudadActual}</span>
                    <span style="font-size: 11px; opacity: 0.75;">Próximamente se integrarán nuevas rutas a la base de datos.</span>
                </div>
            `;
            return;
        }

        if (userLatlng) {
            opciones.sort((a, b) => a.distancia - b.distancia);
        }

        let html = '';
        opciones.forEach((ruta, index) => {
            let extraInfo = '';
            if (userLatlng && ruta.distancia !== null) {
                const textoDist = ruta.distancia > 1000 
                    ? (ruta.distancia / 1000).toFixed(1) + ' km' 
                    : ruta.distancia + ' m';
                const etiqueta = index === 0 ? `<span class="badge-cercana" style="margin-left:auto;">Más cerca</span>` : '';
                extraInfo = `<div style="display:flex; flex-direction:column; margin-left:auto; text-align:right;">${etiqueta}<span style="font-size:11px; color:var(--text-gray); margin-top:2px;">A ${textoDist}</span></div>`;
            }

            html += `
                <div class="ruta-item interactive" onclick="AppManager.verRutaDesdeDirectorio('${ruta.idVar}')">
                    <div class="icon" style="background:${ruta.color};">${ruta.acronimo}</div>
                    <div style="max-width: 58%; display: flex; flex-direction: column; gap: 2px; flex-grow: 1; min-width: 0;">
                        <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-weight: 700;">${this.escapeHTML(ruta.nombre)}</span>
                        <span style="font-size: 11.5px; color: var(--text-gray); font-weight: 600;">${this.escapeHTML(ruta.origen)} → ${this.escapeHTML(ruta.destino)}</span>
                    </div>
                    ${extraInfo}
                </div>
            `;
        });
        list.innerHTML = html;
    },

    verRutaDesdeDirectorio(idRuta) {
        window.GeoManager?.limpiarMapa();
        this.abrirMapaConRutasPersonalizadas("Ubicación actual", "", true);
        const ruta = window.RUTAS_DATA[idRuta];
        if (!ruta) return;

        const props = ruta.features[0].properties;
        const color = ruta.color || '#305CDE';
        window.GeoManager?.dibujarRutaYPasos(props.nombre, color, idRuta);

        const resultsContainer = document.getElementById('route-results');
        const tarifa = window.RatesManager?.pasajeNormalBs 
            ? `${window.RatesManager.pasajeNormalBs.toFixed(2)} Bs` 
            : 'Tarifa estándar';

        if (resultsContainer) {
            resultsContainer.style.display = 'block';
            resultsContainer.innerHTML = `
                <div class="result-title">Viendo ruta seleccionada</div>
                <div class="route-option interactive" style="cursor:default;">
                    <div class="route-badge" style="background:${color};">${props.nombre.substring(0, 4).toUpperCase()}</div>
                    <div class="route-info">
                        <h4>${this.escapeHTML(props.nombre)}</h4>
                        <p style="margin-bottom: 2px; font-size: 11.5px; color: var(--neutral-accent); font-weight: 700;">${this.escapeHTML(props.origen)} → ${this.escapeHTML(props.destino)}</p>
                        <p>Tarifa: ${tarifa} • Frecuencia: ${props.frecuencia || '5-10 min'}</p>
                    </div>
                </div>
            `;
        }

        if (window.GeoManager?.rutaDibujada) {
            window.GeoManager.centrarMapaConMenu(window.GeoManager.rutaDibujada.getBounds(), 15);
        }
    },

    // Selector de Ciudad
    openCitySelector(target = 'dashboard') {
        this.citySelectorTarget = target;
        document.getElementById('city-modal')?.classList.add('active');
    },

    closeCitySelector() {
        document.getElementById('city-modal')?.classList.remove('active');
    },

    selectCity(cityName, lat, lon) {
        localStorage.setItem('rapidito_ciudad', cityName);
        this.cargarPerfil();
        window.GeoManager?.setCenter(lat, lon, 13);
        this.closeCitySelector();

        // Si la lista de rutas estaba abierta, recargarla
        const list = document.getElementById('rutas-list-container');
        if (list && list.classList.contains('active')) {
            this.renderizarListaRutas(null);
        }

        this.showToast(`Ciudad cambiada a ${cityName}`, 'info');

        if (this.citySelectorTarget === 'profile') {
            setTimeout(() => this.abrirModal('modal-editar-perfil'), 200);
        }
    },

    // Gestión PWA (Instalación nativa y Service Worker)
    setupPWA() {
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('./sw.js')
                    .then(reg => {
                        console.log('Service Worker de Rapidito activo con éxito', reg.scope);
                        // Comprobar actualizaciones
                        reg.addEventListener('updatefound', () => {
                            const newWorker = reg.installing;
                            newWorker.addEventListener('statechange', () => {
                                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                    this.showToast('Nueva versión disponible. Actualizando...', 'info');
                                    setTimeout(() => window.location.reload(), 2000);
                                }
                            });
                        });
                    })
                    .catch(err => console.warn('Error al registrar Service Worker:', err));
            });
        }

        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            this.deferredPrompt = e;
        });
    },

    instalarAppPWA() {
        this.cerrarPanelPerfil();
        this.abrirModal('modal-instalar');
    },

    async ejecutarInstalacionNativa() {
        if (this.deferredPrompt) {
            this.cerrarModal('modal-instalar');
            this.deferredPrompt.prompt();
            const { outcome } = await this.deferredPrompt.userChoice;
            if (outcome === 'accepted') {
                this.showToast('¡Gracias por instalar Rapidito!', 'success');
            }
            this.deferredPrompt = null;
        } else {
            const contenidoModal = document.querySelector('#modal-instalar .generic-modal-content');
            if (contenidoModal) {
                contenidoModal.innerHTML = `
                    <button class="close-generic-btn interactive" onclick="AppManager.cerrarModal('modal-instalar')" style="position:absolute; top:12px; right:12px;">
                        <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                    <div style="width: 46px; height: 46px; background: var(--input-bg); border-radius: 50%; display: flex; justify-content: center; align-items: center; color: var(--neutral-accent); margin: 4px auto 0 auto;">
                        <svg width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                    </div>
                    <h3 style="margin:4px 0 2px 0; font-size:16px; font-weight:800;">Instalación</h3>
                    <p style="font-size:12.5px; color:var(--text-gray); font-weight:600; line-height:1.45; margin:0 0 12px 0;">Abre el menú de tu navegador (los tres puntos <strong>⋮</strong> o icono compartir en iOS) y pulsa en <strong>"Instalar aplicación"</strong> o <strong>"Agregar a la pantalla de inicio"</strong>.</p>
                    <button class="cotizar-btn interactive" style="padding:12px; font-size:13px; margin-top:0;" onclick="AppManager.cerrarModal('modal-instalar')">Entendido</button>
                `;
            }
        }
    }
};

window.AppManager = AppManager;
