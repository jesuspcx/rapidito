/**
 * Rapidito PWA - Módulo de Divisas y Tarifas (DolarAPI + Offline Caching)
 */

const RatesManager = {
    tasaBCV: 0,
    tasaEuro: 0,
    tasaParalelo: 0,
    pasajeNormalBs: 0,
    pasajePrefBs: 0,
    pasajeRapiditoBs: 500,
    refDolarUrbano: 0.25,
    refDolarPref: 0.125,
    refDolarRapidito: 0.57,
    servicioCalculadora: 'urbana', // 'urbana' | 'rapidito'
    
    // Contadores de pasajeros independientes
    pasajerosRegular: 1,
    pasajerosPref: 0,
    pasajerosRapidito: 1,

    // Claves de localStorage
    STORAGE_KEY: 'rapidito_tasas_cache',
    STORAGE_RAPIDITO_KEY: 'rapidito_tarifa_rapidito',

    init() {
        this.cargarDesdeCache();
        this.actualizarTasas();
        this.setupCalculadora();
    },

    cargarDesdeCache() {
        try {
            const cache = JSON.parse(localStorage.getItem(this.STORAGE_KEY));
            if (cache && cache.tasaBCV) {
                this.tasaBCV = cache.tasaBCV;
                this.tasaEuro = cache.tasaEuro || 0;
                this.tasaParalelo = cache.tasaParalelo || 0;
                this.calcularPasajes(this.tasaBCV);
                this.actualizarUI(true);
            } else {
                this.calcularPasajes(0);
                this.actualizarUI(true);
            }
        } catch (e) {
            console.warn('Error leyendo caché de tasas', e);
        }
    },

    guardarEnCache() {
        try {
            const data = {
                tasaBCV: this.tasaBCV,
                tasaEuro: this.tasaEuro,
                tasaParalelo: this.tasaParalelo,
                updatedAt: new Date().toISOString()
            };
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
        } catch (e) {
            console.warn('Error guardando caché de tasas', e);
        }
    },

    calcularPasajes(precioOficial) {
        if (precioOficial > 0) {
            this.pasajeNormalBs = precioOficial * this.refDolarUrbano;
            this.pasajePrefBs = precioOficial * this.refDolarPref;

            // Indexado a ~0.57 USD (500 Bs aprox con la tasa oficial BCV)
            const rapCalculado = precioOficial * this.refDolarRapidito;
            
            // Si el usuario fijó una tarifa personalizada manual en localStorage, se respeta si existe
            const rapGuardado = localStorage.getItem(this.STORAGE_RAPIDITO_KEY);
            if (rapGuardado && !isNaN(parseFloat(rapGuardado)) && parseFloat(rapGuardado) > 0) {
                this.pasajeRapiditoBs = parseFloat(rapGuardado);
            } else {
                this.pasajeRapiditoBs = rapCalculado;
            }
        } else {
            // Valores de referencia inicial
            this.pasajeNormalBs = 219.48;
            this.pasajePrefBs = 109.74;
            this.pasajeRapiditoBs = 500.00;
        }
    },

    setPasajeRapidito(monto) {
        const val = parseFloat(monto);
        if (!isNaN(val) && val > 0) {
            this.pasajeRapiditoBs = val;
            if (this.tasaBCV > 0) {
                this.refDolarRapidito = val / this.tasaBCV;
            }
            localStorage.setItem(this.STORAGE_RAPIDITO_KEY, val.toString());
            this.actualizarUI(false);
            return true;
        }
        return false;
    },

    actualizarTarifaRapDesdeCalc() {
        const input = document.getElementById('calc-rapidito-quick-input');
        if (input) {
            const ok = this.setPasajeRapidito(input.value);
            if (ok && window.AppManager) {
                window.AppManager.showToast(`Tarifa de Rapidito fijada en ${this.pasajeRapiditoBs.toFixed(2)} Bs ($${this.refDolarRapidito.toFixed(2)})`, 'success');
            }
        }
    },

    async actualizarTasas() {
        let actualizoAlguna = false;
        try {
            const resBCV = await fetch('https://ve.dolarapi.com/v1/dolares/oficial');
            if (resBCV.ok) {
                const data = await resBCV.json();
                if (data?.promedio) {
                    this.tasaBCV = data.promedio;
                    this.calcularPasajes(this.tasaBCV);
                    actualizoAlguna = true;
                }
            }
        } catch (e) {
            console.log('No se pudo conectar con DolarAPI (modo offline activo)');
        }

        try {
            const resEuro = await fetch('https://ve.dolarapi.com/v1/euros/oficial');
            if (resEuro.ok) {
                const dataEuro = await resEuro.json();
                if (dataEuro?.promedio) {
                    this.tasaEuro = dataEuro.promedio;
                    actualizoAlguna = true;
                }
            }
        } catch (e) {}

        try {
            const resParalelo = await fetch('https://ve.dolarapi.com/v1/dolares/paralelo');
            if (resParalelo.ok) {
                const dataParalelo = await resParalelo.json();
                if (dataParalelo?.promedio) {
                    this.tasaParalelo = dataParalelo.promedio;
                    actualizoAlguna = true;
                }
            }
        } catch (e) {}

        if (actualizoAlguna) {
            this.guardarEnCache();
            this.actualizarUI(false);
        } else if (this.tasaBCV === 0) {
            this.mostrarErrorTasas();
        }
    },

    actualizarUI(esDesdeCache = false) {
        const sufijo = esDesdeCache ? ' (offline)' : '';
        const bcvText = this.tasaBCV ? `$ = ${this.tasaBCV.toFixed(2)} Bs` : '--';
        
        const normalText = `${this.pasajeNormalBs.toFixed(2)} Bs ($0.25)`;
        const prefText = `${this.pasajePrefBs.toFixed(2)} Bs ($0.125)`;
        const rapText = `${this.pasajeRapiditoBs.toFixed(2)} Bs ($0.57)`;

        // Elementos Dashboard
        const dashBCV = document.getElementById('dash-tasa-bcv');
        const dashNormal = document.getElementById('dash-tarifa-normal');
        const dashPrefPill = document.getElementById('dash-tarifa-pref-pill');
        const dashTrayUrbana = document.getElementById('dash-tray-urbana');
        const dashPref = document.getElementById('dash-tarifa-pref');
        const dashTrayRapidito = document.getElementById('dash-tray-rapidito');
        const dashEuro = document.getElementById('dash-tasa-euro');
        const dashParalelo = document.getElementById('dash-tasa-paralelo');
        const cardRapiditoSub = document.getElementById('card-rapidito-sub');

        if (dashBCV) dashBCV.innerText = bcvText + sufijo;
        if (dashNormal) dashNormal.innerText = normalText;
        if (dashPrefPill) dashPrefPill.innerText = `Pref: ${prefText}`;
        if (dashTrayUrbana) dashTrayUrbana.innerText = normalText;
        if (dashPref) dashPref.innerText = prefText;
        if (dashTrayRapidito) dashTrayRapidito.innerText = rapText;
        if (dashEuro && this.tasaEuro) dashEuro.innerText = `€ = ${this.tasaEuro.toFixed(2)} Bs`;
        if (dashParalelo && this.tasaParalelo) dashParalelo.innerText = `USD₮ = ${this.tasaParalelo.toFixed(2)} Bs`;
        if (cardRapiditoSub) cardRapiditoSub.innerText = `Pasaje actual: ${this.pasajeRapiditoBs.toFixed(0)} Bs (~$0.57 USD)`;

        // Elementos Mapa
        const mapBCV = document.getElementById('tasa-bcv');
        const mapNormal = document.getElementById('tarifa-normal');
        const mapPrefPill = document.getElementById('map-tarifa-pref-pill');
        const mapTarifaUrbRow = document.getElementById('map-tarifa-urb-row');
        const mapPref = document.getElementById('map-tarifa-pref');
        const mapTarifaRapRow = document.getElementById('map-tarifa-rap-row');
        const mapEuro = document.getElementById('map-tasa-euro');
        const mapParalelo = document.getElementById('map-tasa-paralelo');

        if (mapBCV) mapBCV.innerText = bcvText;
        if (mapNormal) mapNormal.innerText = normalText;
        if (mapPrefPill) mapPrefPill.innerText = `Pref: ${prefText}`;
        if (mapTarifaUrbRow) mapTarifaUrbRow.innerText = `Urbana: ${normalText}`;
        if (mapPref) mapPref.innerText = `Preferencial (50%): ${prefText}`;
        if (mapTarifaRapRow) mapTarifaRapRow.innerText = `Rapidito: ${rapText}`;
        if (mapEuro && this.tasaEuro) mapEuro.innerText = `€ = ${this.tasaEuro.toFixed(2)} Bs`;
        if (mapParalelo && this.tasaParalelo) mapParalelo.innerText = `USD₮ = ${this.tasaParalelo.toFixed(2)} Bs`;

        // Campos de inputs y badges en calculadora
        const calcTabRapiditoLbl = document.getElementById('calc-tab-rapidito-lbl');
        if (calcTabRapiditoLbl) calcTabRapiditoLbl.innerText = `Rapidito (~$0.57)`;

        const rateRegularLabel = document.getElementById('calc-rate-regular-label');
        if (rateRegularLabel) rateRegularLabel.innerText = normalText;

        const ratePrefLabel = document.getElementById('calc-rate-pref-label');
        if (ratePrefLabel) ratePrefLabel.innerText = prefText;

        const rateRapiditoLabel = document.getElementById('calc-rate-rapidito-label');
        if (rateRapiditoLabel) rateRapiditoLabel.innerText = rapText;

        const calcQuickInput = document.getElementById('calc-rapidito-quick-input');
        if (calcQuickInput && document.activeElement !== calcQuickInput) {
            calcQuickInput.value = this.pasajeRapiditoBs.toFixed(0);
        }

        const editTarifaRap = document.getElementById('edit-tarifa-rapidito');
        if (editTarifaRap && document.activeElement !== editTarifaRap) {
            editTarifaRap.value = this.pasajeRapiditoBs.toFixed(0);
        }

        this.actualizarResultadosCalculadora();
    },

    mostrarErrorTasas() {
        const dashBCV = document.getElementById('dash-tasa-bcv');
        const mapBCV = document.getElementById('tasa-bcv');
        if (dashBCV) dashBCV.innerText = '$ = Offline';
        if (mapBCV) mapBCV.innerText = '$ = Offline';
    },

    setupCalculadora() {
        const pagaConInput = document.getElementById('calc-paga-con');
        if (pagaConInput) {
            pagaConInput.addEventListener('input', () => {
                this.actualizarResultadosCalculadora();
            });
        }
    },

    cambiarPasajeros(tipo, delta) {
        if (tipo === 'regular') {
            const nuevo = this.pasajerosRegular + delta;
            if (nuevo >= 0 && (nuevo + this.pasajerosPref > 0) && nuevo <= 30) {
                this.pasajerosRegular = nuevo;
                this.actualizarResultadosCalculadora();
            }
        } else if (tipo === 'preferencial') {
            const nuevo = this.pasajerosPref + delta;
            if (nuevo >= 0 && (nuevo + this.pasajerosRegular > 0) && nuevo <= 30) {
                this.pasajerosPref = nuevo;
                this.actualizarResultadosCalculadora();
            }
        } else if (tipo === 'rapidito') {
            const nuevo = this.pasajerosRapidito + delta;
            if (nuevo >= 1 && nuevo <= 25) {
                this.pasajerosRapidito = nuevo;
                this.actualizarResultadosCalculadora();
            }
        }
    },

    setServicioCalculadora(servicio) {
        this.servicioCalculadora = servicio;
        const tabUrbana = document.getElementById('calc-tab-urbana');
        const tabRapidito = document.getElementById('calc-tab-rapidito');
        const secUrbana = document.getElementById('calc-sec-urbana');
        const secRapidito = document.getElementById('calc-sec-rapidito');

        if (servicio === 'rapidito') {
            tabUrbana?.classList.remove('active');
            tabRapidito?.classList.add('active');
            if (secUrbana) secUrbana.style.display = 'none';
            if (secRapidito) secRapidito.style.display = 'flex';
        } else {
            tabUrbana?.classList.add('active');
            tabRapidito?.classList.remove('active');
            if (secUrbana) secUrbana.style.display = 'flex';
            if (secRapidito) secRapidito.style.display = 'none';
        }
        this.actualizarResultadosCalculadora();
    },

    actualizarResultadosCalculadora() {
        const countRegularEl = document.getElementById('calc-count-regular');
        const countPrefEl = document.getElementById('calc-count-pref');
        const countRapiditoEl = document.getElementById('calc-count-rapidito');
        const totalPassengersEl = document.getElementById('calc-total-passengers');
        const breakdownEl = document.getElementById('calc-res-breakdown');
        const totalBsEl = document.getElementById('calc-total-bs');
        const totalUsdEl = document.getElementById('calc-total-usd');
        const vueltoBsEl = document.getElementById('calc-vuelto-bs');
        const pagaConInput = document.getElementById('calc-paga-con');

        if (countRegularEl) countRegularEl.innerText = this.pasajerosRegular;
        if (countPrefEl) countPrefEl.innerText = this.pasajerosPref;
        if (countRapiditoEl) countRapiditoEl.innerText = this.pasajerosRapidito;

        let totalBs = 0;
        let totalPax = 0;
        let desgloseTexto = '';

        if (this.servicioCalculadora === 'rapidito') {
            totalPax = this.pasajerosRapidito;
            totalBs = this.pasajerosRapidito * this.pasajeRapiditoBs;
            desgloseTexto = `${this.pasajerosRapidito} puesto(s) rapidito (${this.pasajeRapiditoBs.toFixed(2)} Bs c/u)`;
        } else {
            totalPax = this.pasajerosRegular + this.pasajerosPref;
            totalBs = (this.pasajerosRegular * this.pasajeNormalBs) + (this.pasajerosPref * this.pasajePrefBs);
            
            const partes = [];
            if (this.pasajerosRegular > 0) {
                partes.push(`${this.pasajerosRegular} normal${this.pasajerosRegular > 1 ? 'es' : ''}`);
            }
            if (this.pasajerosPref > 0) {
                partes.push(`${this.pasajerosPref} preferencial${this.pasajerosPref > 1 ? 'es' : ''}`);
            }
            desgloseTexto = partes.join(' + ') || '1 pasajero';
        }

        if (totalPassengersEl) {
            totalPassengersEl.innerText = `${totalPax} pasajero${totalPax > 1 ? 's' : ''}`;
        }
        if (breakdownEl) {
            breakdownEl.innerText = desgloseTexto;
        }

        if (totalBsEl) totalBsEl.innerText = `${totalBs.toFixed(2)} Bs`;

        if (totalUsdEl && this.tasaBCV > 0) {
            const totalUsd = totalBs / this.tasaBCV;
            totalUsdEl.innerText = `≈ $${totalUsd.toFixed(2)}`;
        }

        if (pagaConInput && vueltoBsEl) {
            const montoPaga = parseFloat(pagaConInput.value) || 0;
            if (montoPaga > 0) {
                const vuelto = montoPaga - totalBs;
                if (vuelto >= 0) {
                    vueltoBsEl.innerText = `${vuelto.toFixed(2)} Bs`;
                    vueltoBsEl.style.color = 'var(--status-success)';
                } else {
                    vueltoBsEl.innerText = `Faltan ${Math.abs(vuelto).toFixed(2)} Bs`;
                    vueltoBsEl.style.color = 'var(--status-danger)';
                }
            } else {
                vueltoBsEl.innerText = '--';
                vueltoBsEl.style.color = 'var(--text-primary)';
            }
        }
    }
};

window.RatesManager = RatesManager;
