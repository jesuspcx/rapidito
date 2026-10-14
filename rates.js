/**
 * Rapidito PWA - Módulo de Divisas y Tarifas (DolarAPI + Offline Caching)
 */

const RatesManager = {
    tasaBCV: 0,
    tasaEuro: 0,
    tasaParalelo: 0,
    pasajeNormalBs: 0,
    pasajePrefBs: 0,
    pasajerosCount: 1,

    // Claves de localStorage
    STORAGE_KEY: 'rapidito_tasas_cache',

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
        // Tarifa estimada de 0.25 USD oficial
        const base = precioOficial * 0.25;
        this.pasajeNormalBs = base > 0 ? base : 15.0; // fallback mínimo razonable
        this.pasajePrefBs = this.pasajeNormalBs / 2;
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
        const tarifaText = this.pasajeNormalBs ? `${this.pasajeNormalBs.toFixed(2)} Bs` : '--';
        const tarifaPrefText = this.pasajePrefBs ? `Preferencial: ${this.pasajePrefBs.toFixed(2)} Bs` : '--';

        // Elementos Dashboard
        const dashBCV = document.getElementById('dash-tasa-bcv');
        const dashNormal = document.getElementById('dash-tarifa-normal');
        const dashPref = document.getElementById('dash-tarifa-pref');
        const dashEuro = document.getElementById('dash-tasa-euro');
        const dashParalelo = document.getElementById('dash-tasa-paralelo');

        if (dashBCV) dashBCV.innerText = bcvText + sufijo;
        if (dashNormal) dashNormal.innerText = tarifaText;
        if (dashPref) dashPref.innerText = tarifaPrefText;
        if (dashEuro && this.tasaEuro) dashEuro.innerText = `€ = ${this.tasaEuro.toFixed(2)} Bs`;
        if (dashParalelo && this.tasaParalelo) dashParalelo.innerText = `USD₮ = ${this.tasaParalelo.toFixed(2)} Bs`;

        // Elementos Mapa
        const mapBCV = document.getElementById('tasa-bcv');
        const mapNormal = document.getElementById('tarifa-normal');
        const mapPref = document.getElementById('map-tarifa-pref');
        const mapEuro = document.getElementById('map-tasa-euro');
        const mapParalelo = document.getElementById('map-tasa-paralelo');

        if (mapBCV) mapBCV.innerText = bcvText;
        if (mapNormal) mapNormal.innerText = tarifaText;
        if (mapPref) mapPref.innerText = `Pref: ${this.pasajePrefBs.toFixed(2)} Bs`;
        if (mapEuro && this.tasaEuro) mapEuro.innerText = `€ = ${this.tasaEuro.toFixed(2)} Bs`;
        if (mapParalelo && this.tasaParalelo) mapParalelo.innerText = `USD₮ = ${this.tasaParalelo.toFixed(2)} Bs`;

        this.actualizarResultadosCalculadora();
    },

    mostrarErrorTasas() {
        const dashBCV = document.getElementById('dash-tasa-bcv');
        const mapBCV = document.getElementById('tasa-bcv');
        if (dashBCV) dashBCV.innerText = '$ = Offline';
        if (mapBCV) mapBCV.innerText = '$ = Offline';
    },

    setupCalculadora() {
        const minusBtn = document.getElementById('calc-minus-btn');
        const plusBtn = document.getElementById('calc-plus-btn');
        const pagaConInput = document.getElementById('calc-paga-con');

        if (minusBtn) {
            minusBtn.addEventListener('click', () => {
                if (this.pasajerosCount > 1) {
                    this.pasajerosCount--;
                    this.actualizarResultadosCalculadora();
                }
            });
        }
        if (plusBtn) {
            plusBtn.addEventListener('click', () => {
                if (this.pasajerosCount < 20) {
                    this.pasajerosCount++;
                    this.actualizarResultadosCalculadora();
                }
            });
        }
        if (pagaConInput) {
            pagaConInput.addEventListener('input', () => {
                this.actualizarResultadosCalculadora();
            });
        }
    },

    actualizarResultadosCalculadora() {
        const countEl = document.getElementById('calc-count');
        const totalBsEl = document.getElementById('calc-total-bs');
        const totalUsdEl = document.getElementById('calc-total-usd');
        const vueltoBsEl = document.getElementById('calc-vuelto-bs');
        const pagaConInput = document.getElementById('calc-paga-con');

        if (countEl) countEl.innerText = this.pasajerosCount;

        const totalBs = this.pasajeNormalBs * this.pasajerosCount;
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
                    vueltoBsEl.style.color = 'var(--accent-success)';
                } else {
                    vueltoBsEl.innerText = `Faltan ${Math.abs(vuelto).toFixed(2)} Bs`;
                    vueltoBsEl.style.color = 'var(--accent-danger)';
                }
            } else {
                vueltoBsEl.innerText = '--';
                vueltoBsEl.style.color = 'var(--text-dark)';
            }
        }
    }
};

window.RatesManager = RatesManager;
