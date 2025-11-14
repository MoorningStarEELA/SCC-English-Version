document.addEventListener('DOMContentLoaded', () => {
    
    const cargarBtn = document.getElementById('cargarBtn');
    const continuarBtn = document.getElementById('continuarBtn');
    const mensaje = document.getElementById('mensaje');
    const resultadosDiv = document.getElementById('resultados'); // Div para mostrar resultados

    cargarBtn.addEventListener('click', async () => {
        mensaje.textContent = 'Processing data...';
        cargarBtn.disabled = true;
        resultadosDiv.innerHTML = '<div class="spinner-css"><img src="./style/Q.U.A.S.A.R.-Style/spinner.gif" alt="Loading..."></div>';
        
        mensaje.textContent = 'Calculating results...';
        // Obtener datos de Demanda y Capacidad desde IndexedDB
        const capacidadData = await window.getAllDataFromIndexedDB(window.STORE_INFORMACION);
        if (capacidadData.length === 0) {
            mensaje.textContent = 'Error: Demand or Capacity data is missing. ❌';
            cargarBtn.disabled = false;
            resultadosDiv.innerHTML = '';
            return;
        }
        console.log('Datos de Capacidad para cálculos:', capacidadData); // Nuevo log
    });

//continuarBtn.disabled = false;
//continuarBtn.classList.add('btn-primary');
//continuarBtn.onclick = () => window.location.href = './QUASAR2.html';