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

    const top10TableBody = document.getElementById('top10TableBody'); // en tu html top10Tabla (sesiones semanales)
    const top10ModelsBody = document.getElementById('top10ModelsBody');
    const graficaCanvas = document.getElementById('grafica');

    const btnPDF = document.getElementById('generarPDF');
    const btnRegresar = document.getElementById('regresarBtn');

    let chartInstance = null;

    // Nombres de meses en el formato que usa tu Excel/objetos
    const meses = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const ahora = new Date();
    const mesActualIndex = ahora.getMonth();
    const mesActualNombre = meses[mesActualIndex];


    // 1) Leer desperdicios (STORE_QUASAR_DESPERDICIOS)
   
    let desperdicios = { Flux: 0, Welding: 0, rtv: 0, uv: 0, chemask: 0 };
    try {
        const resp = await window.getAllDataFromIndexedDB(window.STORE_QUASAR_DESPERDICIOS);
        if (resp && resp.length > 0) {
            // usamos la última entrada (índice 0 según tu patrón)
            const last = resp[0];
            desperdicios = {
                Flux: parseFloat(last.Flux) || 0,
                Welding: parseFloat(last.Welding) || 0,
                rtv: parseFloat(last.rtv) || 0,
                uv: parseFloat(last.uv) || 0,
                chemask: parseFloat(last.chemask) || 0
            };
        } else {
            // Si no hay datos, intentamos buscar en localStorage (por si quasar1 guardó info)
            try {
                const ls = localStorage.getItem('QUASAR_Desperdicios');
                if (ls) {
                    const obj = JSON.parse(ls);
                    desperdicios = {
                        Flux: parseFloat(obj.Flux) || desperdicios.Flux,
                        Welding: parseFloat(obj.Welding) || desperdicios.Welding,
                        rtv: parseFloat(obj.rtv) || desperdicios.rtv,
                        uv: parseFloat(obj.uv) || desperdicios.uv,
                        chemask: parseFloat(obj.chemask) || desperdicios.chemask
                    };
                }
            } catch(e) { /* ignore */ }
        }
    } catch (error) {
        console.error('Error leyendo STORE_QUASAR_DESPERDICIOS:', error);
    }

    // Mostrar desperdicios (si los quieres visibles)
    if (elFluxData) elFluxData.textContent = desperdicios.Flux.toFixed(3);
    if (elWeldingData) elWeldingData.textContent = desperdicios.Welding.toFixed(3);
    if (elRTVData) elRTVData.textContent = desperdicios.rtv.toFixed(3);
    if (elUVData) elUVData.textContent = desperdicios.uv.toFixed(3);
    if (elChemaskData) elChemaskData.textContent = desperdicios.chemask.toFixed(3);


    // 2) Leer demanda y datos de modelos (STORE_DEMANDA, STORE_INFORMACION, STORE_INFORMACION_QUASAR)

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
        // no crítico, puede no existir
        console.info('STORE_INFORMACION_QUASAR no disponible o vacio.');
    }

    // Preferencia: si existe infoQuasarData (específico para QUASAR), lo uso; si no, uso infoData.
    const capacidadData = (infoQuasarData && infoQuasarData.length > 0) ? infoQuasarData : infoData;

    if (!demandaData || demandaData.length === 0) {
        console.warn('No hay datos en STORE_DEMANDA — la página no podrá calcular top ni graficas correctamente.');
    }
    if (!capacidadData || capacidadData.length === 0) {
        console.warn('No hay datos de capacidad (STORE_INFORMACION o STORE_INFORMACION_QUASAR).');
    }


    // 3) Extraer factores por modelo y calcular consumo por modelo para el mes actual

    // Buscamos columnas:
    // "Welding Usage Factor (Lb)", "Flux Utilization Factor (Gl)", "RTV Adhesives (gr)", "UV (gr)", "Chemask (gr)"
    const keyWelding = 'Welding Usage Factor (Lb)';
    const keyFlux = 'Flux Utilization Factor (Gl)';
    const keyRTV = 'RTV Adhesives (gr)';
    const keyUV = 'UV (gr)';
    const keyChemask = 'Chemask (gr)';

    const consumoModelos = []; // array de { modelo, welding, flux, rtv, uv, chemask, total, demanda }

    capacidadData.forEach((fila) => {
        try {
            // Nombre del modelo en la fila (puede venir como Assembly (Number) o Assembly)
            const modelo = fila['Assembly (Number)'] || fila['Assembly'] || fila['Part'] || fila['Model'] || null;
            if (!modelo) return;

            // Buscar la fila de demanda correspondiente (por columna Part en demandaData)
            const demandaFila = demandaData.find(d => (d.Part && String(d.Part).trim() === String(modelo).trim()));
            // Si no existe demanda para este modelo, lo ignoramos (puedes quitar esta restricción si quieres mostrar todos)
            if (!demandaFila) return;

            // Obtener demanda del mes actual (limpiando comas)
            const rawDemanda = demandaFila[mesActualNombre] ?? demandaFila[mesActualNombre.slice(0,3)] ?? 0;
            const demanda = parseFloat(String(rawDemanda).replace(/,/g, '')) || 0;
            if (demanda <= 0) return;

            // Obtener factores (si no existen, tomar 0)
            const weldingFactor = parseFloat(fila[keyWelding] ?? 0) || 0;
            const fluxFactor = parseFloat(fila[keyFlux] ?? 0) || 0;
            const rtvFactor = parseFloat(fila[keyRTV] ?? 0) || 0;
            const uvFactor = parseFloat(fila[keyUV] ?? 0) || 0;
            const chemaskFactor = parseFloat(fila[keyChemask] ?? 0) || 0;

           
            // Interpretación del desperdicio (OPCION B):
            // desperdicio guardado en 'desperdicios' es una CANTIDAD POR UNIDAD que se multiplica por la demanda.
            // consumoIdeal = factor * demanda
            // consumoFinal = demanda * (factor + desperdicio)
           
            const welding = demanda * (weldingFactor + (desperdicios.Welding || 0));
            const flux = demanda * (fluxFactor + (desperdicios.Flux || 0));
            const rtv = demanda * (rtvFactor + (desperdicios.rtv || 0));
            const uv = demanda * (uvFactor + (desperdicios.uv || 0));
            const chemask = demanda * (chemaskFactor + (desperdicios.chemask || 0));

            const total = welding + flux + rtv + uv + chemask;

            consumoModelos.push({
                modelo: String(modelo),
                welding, flux, rtv, uv, chemask, total, demanda,
                // guardamos factores para mostrar tooltip si necesitas
                weldingFactor, fluxFactor, rtvFactor, uvFactor, chemaskFactor
            });
        } catch (err) {
            console.error('Error procesando fila de capacidad:', err, fila);
        }
    });


    // 4) Top 10 modelos por consumo total
   
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
                <td>${(m.flux).toFixed(3)}</td>
                <td>${(m.welding).toFixed(3)}</td>
                <td>-</td>
                <td>${(m.rtv).toFixed(3)}</td>
                <td>${(m.uv).toFixed(3)}</td>
                <td>${(m.chemask).toFixed(3)}</td>
            `;
            top10ModelsBody.appendChild(tr);
        });
    }

    // También llenamos la sección "Top 10 Most Used Models per Month" (resumen semanal por química)
    // Calculamos totales mensuales por química (suma por todos los modelos)
    const totalsMensual = consumoModelos.reduce((acc, cur) => {
        acc.welding += cur.welding;
        acc.flux += cur.flux;
        acc.rtv += cur.rtv;
        acc.uv += cur.uv;
        acc.chemask += cur.chemask;
        return acc;
    }, { welding:0, flux:0, rtv:0, uv:0, chemask:0 });

    // Rellenar datos mensuales en el panel "Data Summary Mouthly"
    if (elFluxData) elFluxData.textContent = totalsMensual.flux.toFixed(3);
    if (elWeldingData) elWeldingData.textContent = totalsMensual.welding.toFixed(3);
    if (elRTVData) elRTVData.textContent = totalsMensual.rtv.toFixed(3);
    if (elUVData) elUVData.textContent = totalsMensual.uv.toFixed(3);
    if (elChemaskData) elChemaskData.textContent = totalsMensual.chemask.toFixed(3);

    // Dividir entre 4 semanas (simple división equitativa)
    const semanal = {
        flux: totalsMensual.flux / 4,
        welding: totalsMensual.welding / 4,
        rtv: totalsMensual.rtv / 4,
        uv: totalsMensual.uv / 4,
        chemask: totalsMensual.chemask / 4
    };

    // Llenar celdas de semana (W1..W4)
    function llenarSemanas(celdaArray, valor) {
        if (!celdaArray || !celdaArray.length) return;
        for (let i = 0; i < 4; i++) {
            if (celdaArray[i]) celdaArray[i].textContent = valor.toFixed(3);
        }
    }
    llenarSemanas(elFluxW, semanal.flux);
    llenarSemanas(elWeldingW, semanal.welding);
    llenarSemanas(elRTVW, semanal.rtv);
    llenarSemanas(elUVW, semanal.uv);
    llenarSemanas(elChemaskW, semanal.chemask);

   
    // 5) Graficar consumo mensual por químico (barra)
   
    try {
        if (graficaCanvas) {
            const ctx = graficaCanvas.getContext('2d');
            if (chartInstance) chartInstance.destroy();
            chartInstance = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: ['Welding (gal)', 'Flux (Lb)', 'RTV (gr)', 'UV (gr)', 'Chemask (gr)'],
                    datasets: [{
                        label: `Consumo mensual (${mesActualNombre})`,
                        data: [
                            totalsMensual.welding,
                            totalsMensual.flux,
                            totalsMensual.rtv,
                            totalsMensual.uv,
                            totalsMensual.chemask
                        ],
                        // NO fije colores si quieres respetar el estilo global; si quieres otro look los cambiamos
                        backgroundColor: [
                            'rgba(255, 99, 132, 0.6)',
                            'rgba(54, 162, 235, 0.6)',
                            'rgba(255, 206, 86, 0.6)',
                            'rgba(75, 192, 192, 0.6)',
                            'rgba(153, 102, 255, 0.6)'
                        ],
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: { display: true },
                        tooltip: { mode: 'index', intersect: false }
                    },
                    scales: {
                        y: { beginAtZero: true, title: { display: true, text: 'Cantidad' } },
                        x: { title: { display: true, text: 'Químico' } }
                    }
                }
            });
        }
    } catch (err) {
        console.error('Error creando la gráfica:', err);
    }

   
    // 6) Botón generar PDF (usa html2canvas + jsPDF similar a SCC)
   
    if (btnPDF) {
        btnPDF.addEventListener('click', async () => {
            btnPDF.style.display = 'none';
            if (btnRegresar) btnRegresar.style.display = 'none';

            try {
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
                if (btnPDF) btnPDF.style.display = 'inline-block';
                if (btnRegresar) btnRegresar.style.display = 'inline-block';
            }
        });
    }

    // 7) Botón regresar: limpiar stores relevantes y volver a Inicio.html 

    if (btnRegresar) {
        btnRegresar.addEventListener('click', async () => {
            try {
                // NO borraremos STORE_INFORMACION ni STORE_INFORMACION_QUASAR (son datos de catálogo),
                // pero sí borramos DEMANDA temporal y respuestas del cuestionario si quieres.
                if (window.clearObjectStore) {
                    try { await window.clearObjectStore(window.STORE_DEMANDA); } catch(e) { /*ignore*/ }
                    try { await window.clearObjectStore(window.STORE_FORM_ADICIONAL); } catch(e) { /*ignore*/ }
                    try { await window.clearObjectStore(window.STORE_QUASAR_DESPERDICIOS); } catch(e) { /*ignore*/ }
                }
                window.location.href = './Inicio.html';
            } catch (err) {
                console.error('Error al regresar/limpiar datos:', err);
                // aún así intentamos navegar
                window.location.href = './Inicio.html';
            }
        });
    }


    // 8) Si no hay modelos con demanda, mostrar mensaje en tablas (opcional)

    if (consumoModelos.length === 0) {
        if (top10ModelsBody) {
            top10ModelsBody.innerHTML = `<tr><td colspan="8">No hay modelos con demanda para ${mesActualNombre}.</td></tr>`;
        }
        if (top10TableBody) {
            // mantener la tabla de semanas, ya se llenó con '-'
        }
    }

    // Fin DOMContentLoaded
});
