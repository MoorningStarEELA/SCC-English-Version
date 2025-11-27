// quasarResultados.js
// Debe ser incluido después de db.js y antes de </body>
document.addEventListener('DOMContentLoaded', async () => {
    // IDs del HTML
    const elFluxData = document.getElementById('FluxData');
    const elWeldingData = document.getElementById('WeldingData');
    const elRTVData = document.getElementById('RTVData');
    const elUVData = document.getElementById('UV');
    const elChemaskData = document.getElementById('ChemaskData');

    const elFluxW = [document.getElementById('FluxW1'), document.getElementById('FluxW2'), document.getElementById('FluxW3'), document.getElementById('FluxW4')];
    const elWeldingW = [document.getElementById('weldingW1'), document.getElementById('weldingW2'), document.getElementById('weldingW3'), document.getElementById('weldingW4')];
    const elRTVW = [document.getElementById('RTVw1'), document.getElementById('RTVw2'), document.getElementById('RTVw3'), document.getElementById('RTVw4')];
    const elUVW = [document.getElementById('uvW1'), document.getElementById('uvW2'), document.getElementById('uvW3'), document.getElementById('uvW4')];
    const elChemaskW = [document.getElementById('Chemaskw1'), document.getElementById('Chemaskw2'), document.getElementById('Chemaskw3'), document.getElementById('Chemaskw4')];

    // en tu html top10Tabla (sesiones semanales) - optional
    const top10TableBody = document.getElementById('top10TableBody');
    const top10ModelsBody = document.getElementById('top10ModelsBody');
    const graficaCanvas = document.getElementById('grafica');

    const btnPDF = document.getElementById('generarPDF');
    const btnRegresar = document.getElementById('regresarBtn');

    let chartInstance = null;

    // Nombres de meses (en tu Excel están en ingles)
    const meses = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const ahora = new Date();
    const mesActualIndex = ahora.getMonth();
    const mesActualNombre = meses[mesActualIndex];

    /* ===== UTILIDADES ===== */
    function cleanNumber(n){
        // limpia comas y espacios, soporta null/undefined
        if(n === undefined || n === null) return 0;
        const s = String(n).trim().replace(/\s+/g,'').replace(/,/g,'');
        return parseFloat(s) || 0;
    }

    function matchModel(row, modelo){
        // intenta varios campos posibles de la fila de demanda
        if(!row || !modelo) return false;
        const campos = ["Part","part","Assembly","Assembly (Number)","Model","model"];
        const mm = String(modelo).trim();
        return campos.some(c => {
            if(row[c] !== undefined && row[c] !== null){
                return String(row[c]).trim() === mm;
            }
            return false;
        });
    }

    function encontrarDemandaExacta(demandaFila, mes){
        // DemandaFila puede tener keys con distintos formatos.
        if(!demandaFila) return 0;
        const keys = Object.keys(demandaFila);
        const normalizedTarget = mes.toUpperCase().trim();

        // 1) Intentar exact match (ignora mayúsculas/minúsculas y espacios)
        let key = keys.find(k => k && k.toUpperCase().trim() === normalizedTarget);
        if(key !== undefined) return cleanNumber(demandaFila[key]);

        // 2) Intentar abreviatura (first 3 chars)
        key = keys.find(k => k && k.toUpperCase().trim().slice(0,3) === normalizedTarget.slice(0,3));
        if(key !== undefined) return cleanNumber(demandaFila[key]);

        // 3) Intentar nombres alternativos (Nov, November, NOVEMBER) ya cubierto, si no -> 0
        return 0;
    }

    /* ===== 1) Leer desperdicios (STORE_QUASAR_DESPERDICIOS) ===== */
    // defecto 0%
    let desperdicios = { Flux: 0, Welding: 0, rtv: 0, uv: 0, chemask: 0 };
    try {
        const resp = await window.getAllDataFromIndexedDB(window.STORE_QUASAR_DESPERDICIOS);
        if (resp && resp.length > 0) {
            // Usamos la última entrada (índice 0 según tu patrón)
            const last = resp[0];
            desperdicios = {
                Flux: cleanNumber(last.Flux),
                Welding: cleanNumber(last.Welding),
                rtv: cleanNumber(last.rtv),
                uv: cleanNumber(last.uv),
                chemask: cleanNumber(last.chemask)
            };
        } else {
            try {
                const ls = localStorage.getItem('QUASAR_Desperdicios');
                if (ls) {
                    const obj = JSON.parse(ls);
                    desperdicios = {
                        Flux: cleanNumber(obj.Flux),
                        Welding: cleanNumber(obj.Welding),
                        rtv: cleanNumber(obj.rtv),
                        uv: cleanNumber(obj.uv),
                        chemask: cleanNumber(obj.chemask)
                    };
                }
            } catch(e){ /* ignore */ }
        }
    } catch (error) {
        console.error('Error leyendo STORE_QUASAR_DESPERDICIOS:', error);
    }

    console.debug('Desperdicios leidos (porcentajes):', desperdicios);
    // NOTA: No sobrescribimos los paneles mensuales con los porcentajes aquí. 
    // Esos paneles deben mostrar totals mensuales, así que los llenaremos más abajo.

    /* ===== 2) Leer demanda y datos de modelos ===== */
    let demandaData = [];
    let infoData = [];
    let infoQuasarData = [];

    try {
        demandaData = await window.getAllDataFromIndexedDB(window.STORE_DEMANDA) || [];
    } catch (e) {
        console.error('Error leyendo STORE_DEMANDA:', e);
    }

    try {
        infoData = await window.getAllDataFromIndexedDB(window.STORE_INFORMACION) || [];
    } catch (e) {
        console.error('Error leyendo STORE_INFORMACION:', e);
    }

    try {
        infoQuasarData = await window.getAllDataFromIndexedDB(window.STORE_INFORMACION_QUASAR) || [];
    } catch (e) {
        console.info('STORE_INFORMACION_QUASAR no disponible o vacio.');
    }

    const capacidadData = (infoQuasarData && infoQuasarData.length > 0) ? infoQuasarData : infoData;

    if (!demandaData || demandaData.length === 0) {
        console.warn('No hay datos en STORE_DEMANDA — la página no podrá calcular top ni graficas correctamente.');
    }
    if (!capacidadData || capacidadData.length === 0) {
        console.warn('No hay datos de capacidad (STORE_INFORMACION o STORE_INFORMACION_QUASAR).');
    }

    /* ===== 3) Extraer factores por modelo y calcular consumo por modelo para el mes actual ===== */
    const keyWelding = 'Welding Usage Factor (Lb)';
    const keyFlux = 'Flux Utilization Factor (Gl)';
    const keyRTV = 'RTV Adhesives (g)';
    const keyUV = 'UV (g)';
    const keyChemask = 'Chemask (gr)';

    const consumoModelos = []; // array de { modelo, welding, flux, rtv, uv, chemask, total, demanda }

    capacidadData.forEach((fila) => {
        try {
            // Nombre del modelo en la fila (puede venir como Assembly (Number) o Assembly)
            const modelo = fila['Assembly (Number)'] || fila['Assembly'] || fila['Part'] || fila['Model'] || null;
            if (!modelo) return;

            // Buscar la fila de demanda correspondiente (por columna Part u otros)
            const demandaFila = demandaData.find(d => matchModel(d, modelo));
            if (!demandaFila) {
                // no hay demanda para este modelo: saltar
                return;
            }

            // Obtener demanda del mes actual (soporta "January" o "Jan")
            const demanda = encontrarDemandaExacta(demandaFila, mesActualNombre);
            if (demanda <= 0) return;

            // Obtener factores (limpiando comas)
            const weldingFactor = cleanNumber(fila[keyWelding]);
            const fluxFactor = cleanNumber(fila[keyFlux]);
            const rtvFactor = cleanNumber(fila[keyRTV]);
            const uvFactor = cleanNumber(fila[keyUV]);
            const chemaskFactor = cleanNumber(fila[keyChemask]);

            // Consumo ideal por modelo (factor * demanda)
            const weldingIdeal = weldingFactor * demanda;
            const fluxIdeal = fluxFactor * demanda;
            const rtvIdeal = rtvFactor * demanda;
            const uvIdeal = uvFactor * demanda;
            const chemaskIdeal = chemaskFactor * demanda;

            // Desperdicio: el usuario ingresa % (ej: 5 => 5%)
            // Convertimos a decimal dividiendo entre 100 en la fórmula
            const weldingDespe = weldingIdeal * (desperdicios.Welding / 100);
            const fluxDespe = fluxIdeal * (desperdicios.Flux / 100);
            const rtvDespe = rtvIdeal * (desperdicios.rtv / 100);
            const uvDespe = uvIdeal * (desperdicios.uv / 100);
            const chemaskDespe = chemaskIdeal * (desperdicios.chemask / 100);

            // consumo final 
            const welding = weldingIdeal + weldingDespe;
            const flux = fluxIdeal + fluxDespe;
            const rtv = rtvIdeal + rtvDespe;
            const uv = uvIdeal + uvDespe;
            const chemask = chemaskIdeal + chemaskDespe;

            const total = welding + flux + rtv + uv + chemask;

            consumoModelos.push({
                modelo: String(modelo),
                welding, flux, rtv, uv, chemask, total, demanda,
                weldingFactor, fluxFactor, rtvFactor, uvFactor, chemaskFactor
            });
        } catch (err) {
            console.error('Error procesando fila de capacidad:', err, fila);
        }
    });

    console.debug('Modelos procesados:', consumoModelos.length);

    /* ===== 4) Top 10 modelos por consumo total ===== */
    const top10 = consumoModelos
        .sort((a,b) => b.total - a.total)
        .slice(0, 10);

    // Llenar tabla top10ModelsBody
    if (top10ModelsBody) {
        top10ModelsBody.innerHTML = '';
        top10.forEach((m, idx) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${idx + 1}</td>
                <td>${m.modelo}</td>
                <td>${(m.flux).toFixed(3)} gal</td>
                <td>${(m.welding).toFixed(3)} Lb</td>
                <td>${(m.rtv).toFixed(3)} g</td>
                <td>${(m.uv).toFixed(3)} g</td>
                <td>${(m.chemask).toFixed(3)} g</td>
            `;
            top10ModelsBody.appendChild(tr);
        });
    }

    /* ===== Calcular totales mensuales (suma por todos los modelos procesados) ===== */
    const totalsMensual = consumoModelos.reduce((acc, m) => {
        acc.welding += m.welding;
        acc.flux += m.flux;
        acc.rtv += m.rtv;
        acc.uv += m.uv;
        acc.chemask += m.chemask;
        return acc;
    }, { welding:0, flux:0, rtv:0, uv:0, chemask:0 });

    // Rellenar datos mensuales en el panel "Data Summary Monthly"
    if (elFluxData) elFluxData.textContent = `${totalsMensual.flux.toFixed(3)} gal`;
    if (elWeldingData) elWeldingData.textContent = `${totalsMensual.welding.toFixed(3)} Lb`;
    if (elRTVData) elRTVData.textContent = `${totalsMensual.rtv.toFixed(3)} g`;
    if (elUVData) elUVData.textContent = `${totalsMensual.uv.toFixed(3)} g`;
    if (elChemaskData) elChemaskData.textContent = `${totalsMensual.chemask.toFixed(3)} g`;

    // Dividir entre 4 semanas (simple división equitativa)
    const semanal = {
        flux: totalsMensual.flux / 4,
        welding: totalsMensual.welding / 4,
        rtv: totalsMensual.rtv / 4,
        uv: totalsMensual.uv / 4,
        chemask: totalsMensual.chemask / 4
    };

    // Llenar celdas de semana (W1..W4)
    function llenarSemanas(celdaArray, valor, unidad) {
        if (!celdaArray || !celdaArray.length) return;
        for (let i = 0; i < 4; i++) {
            if (celdaArray[i]) celdaArray[i].textContent = `${valor.toFixed(3)} ${unidad}`;
        }
    }

    llenarSemanas(elFluxW, semanal.flux,"gal");
    llenarSemanas(elWeldingW, semanal.welding,"Lb");
    llenarSemanas(elRTVW, semanal.rtv,"g");
    llenarSemanas(elUVW, semanal.uv,"g");
    llenarSemanas(elChemaskW, semanal.chemask,"g");

    /* ===== 5) Graficar consumo mensual por químico (barra) ===== */
    try {
        if (graficaCanvas) {
            const ctx = graficaCanvas.getContext('2d');
            if (chartInstance) chartInstance.destroy();

            chartInstance = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: ['Consumo Mensual'],
                    datasets: [
                        { label: 'Welding (Lb)', data: [totalsMensual.welding], backgroundColor: 'rgba(208, 235, 54, 0.7)', borderWidth: 1 },
                        { label: 'Flux (gal)', data: [totalsMensual.flux], backgroundColor: 'rgba(54, 111, 235, 0.7)', borderWidth: 1 },
                        { label: 'Rtv (g)', data: [totalsMensual.rtv], backgroundColor: 'rgba(235, 54, 54, 0.7)', borderWidth: 1 },
                        { label: 'UV (g)', data: [totalsMensual.uv], backgroundColor: 'rgba(54, 162, 235, 0.7)', borderWidth: 1 },
                        { label: 'Chemask (g)', data: [totalsMensual.chemask], backgroundColor: 'rgba(7, 245, 39, 0.7)', borderWidth: 1 }
                    ]
                },
                options: {
                    responsive: true,
                    scales: {
                        y: { beginAtZero: true, title: { display: true, text: 'Cantidad' } },
                        x: { title: { display: true, text: 'Material' } }
                    },
                    indexAxis: 'x',
                }
            });
        }
    } catch (error) {
        console.error("Error al generar la gráfica:", error);
    }

    /* ===== 6) Botón generar PDF ===== */
    function expandContainerForPDF() {
        const container = document.querySelector('.container');
        if (!container) return;
        container.dataset.originalHeight = container.style.height;
        container.style.height = 'auto';
    }
    function restoreContainerAfterPDF() {
        const container = document.querySelector('.container');
        if (!container) return;
        container.style.height = container.dataset.originalHeight || '';
    }

    if (btnPDF) {
        btnPDF.addEventListener('click', async () => {
            btnPDF.style.display = 'none';
            if (btnRegresar) btnRegresar.style.display = 'none';
            try {
                expandContainerForPDF();
                const { jsPDF } = window.jspdf;
                const doc = new jsPDF('p', 'pt', 'letter');
                const content = document.querySelector('.container') || document.body;
                const canvas = await html2canvas(content, { scale: 2, useCORS: true });
                const imgData = canvas.toDataURL('image/jpeg', 1.0);
                const imgProps = doc.getImageProperties(imgData);
                const pdfWidth = doc.internal.pageSize.getWidth();
                const margin = 20;
                const imgDisplayWidth = pdfWidth - 2 * margin;
                const imgDisplayHeight = (imgProps.height * imgDisplayWidth) / imgProps.width;

                let position = 40;
                doc.setFontSize(20);
                doc.text('QUASAR Monthly Report', pdfWidth / 2, 30, { align: 'center' });
                doc.addImage(imgData, 'JPEG', margin, position, imgDisplayWidth, imgDisplayHeight);
                doc.save(`QUASAR_Report_${mesActualNombre}_${new Date().toISOString().slice(0,10)}.pdf`);
            } catch (e) {
                console.error('Error generando PDF:', e);
            } finally {
                restoreContainerAfterPDF();
                if (btnPDF) btnPDF.style.display = 'inline-block';
                if (btnRegresar) btnRegresar.style.display = 'inline-block';
            }
        });
    }

    /* ===== Tooltips: mostrar / ocultar ===== */
    function showTooltipQuasar(event) {
        let tooltip = document.getElementById('tooltipQuasar');
        const SCCLink = document.getElementById('SCCLink');

        if (!tooltip) {
            tooltip = document.createElement('div');
            tooltip.id = 'tooltipQuasar';
            tooltip.classList.add('tooltipHtml2');
            document.body.appendChild(tooltip);
        }

        tooltip.innerHTML = `
            <strong>Before you go...</strong><br>
            Remember that the data will be deleted.<br>
            <em>Do you want to continue?</em>
        `;

        tooltip.style.left = `${event.pageX + 15}px`;
        tooltip.style.top = `${event.pageY + 15}px`;
        tooltip.style.opacity = 1;

        if (SCCLink) SCCLink.classList.add('highlight');
    }

    function hideTooltipQuasar() {
        const tooltip = document.getElementById('tooltipQuasar');
        const SCCLink = document.getElementById('SCCLink');

        if (tooltip) tooltip.style.opacity = 0;
        if (SCCLink) SCCLink.classList.remove('highlight');
    }

    /* Exponer funciones globales para onmouseover inline y debugging */
    window.showTooltipQuasar = showTooltipQuasar;
    window.hideTooltipQuasar = hideTooltipQuasar;

    /* ===== 7) Botón regresar: limpiar stores relevantes y volver a Inicio.html ===== */
    if (btnRegresar) {
        btnRegresar.addEventListener('click', async () => {
            try {
                if (window.clearObjectStore) {
                    try { await window.clearObjectStore(window.STORE_DEMANDA); } catch(e) { /*ignore*/ }
                    try { await window.clearObjectStore(window.STORE_FORM_ADICIONAL); } catch(e) { /*ignore*/ }
                    try { await window.clearObjectStore(window.STORE_QUASAR_DESPERDICIOS); } catch(e) { /*ignore*/ }
                }
                window.location.href = './index.html';
            } catch (err) {
                console.error('Error al regresar/limpiar datos:', err);
                window.location.href = './index.html';
            }
        });
    }

    /* ===== 8) Mensajes si no hay modelos ===== */
    if (consumoModelos.length === 0) {
        if (top10ModelsBody) {
            top10ModelsBody.innerHTML = `<tr><td colspan="8">No hay modelos con demanda para ${mesActualNombre}.</td></tr>`;
        }
    }

    /* Para debugging rápido: muestra un resumen en consola */
    console.info(`QUASAR result ready — month: ${mesActualNombre}. Modelos procesados: ${consumoModelos.length}. Totales:`, totalsMensual);

}); // Fin DOMContentLoaded
