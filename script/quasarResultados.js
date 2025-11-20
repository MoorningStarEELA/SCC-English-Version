document.addEventListener('DOMContentLoaded', () => {
    const ResultadoDesperdicioFlux = document.getElementById('ResultadoFlux');
    const ResultadoDesperdicioWelding = document.getElementById('ResultadoWelding');
    const ResultadoDesperdicioRTV = document.getElementById('ResultadoRTV');
    const ResultadoDesperdicioUV = document.getElementById('ResultadoUV');
    const ResultadoDesperdicioChemask = document.getElementById('ResultadoChemask');
    const generarPDFBtn = document.getElementById('generarPDFBtn');
    const regresarBtn = document.getElementById('regresarBtn');
    const resultadoDesperdicioTable = document.getElementById('resultadoDesperdicioTable');
    const top10TableBody = document.getElementById('top10TableBody');

    let myChartInstance = null;
    
try {
    const formResponsesDesperdicios = await window.getAllDataFromIndexedDB(window.STORE_QUASAR_DESPERDICIOS);
    if( formResponsesDesperdicios && formResponsesDesperdicios.length > 0 ) {
        const latestResponse = formResponsesDesperdicios[0];
        const desperdicioFlux = latestResponse.Flux ?? 0;
        const desperdicioWelding = latestResponse.Welding ?? 0;
        const desperdicioRTV = latestResponse.rtv ?? 0;
        const desperdicioUV = latestResponse.uv ?? 0;
        const desperdicioChemask = latestResponse.chemask ?? 0;

        ResultadoDesperdicioFlux.textContent = desperdicioFlux.toFixed(2);
    }
}

     // --- Botón de PDF ---
    generarPDFBtn.addEventListener('click', async () => {
        generarPDFBtn.style.display = 'none';
        regresarBtn.style.display = 'none';

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('p', 'pt', 'letter');
        const content = document.querySelector('.container');

        try {
            const canvas = await html2canvas(content, { scale: 2, logging: true, useCORS: true });
            const imgData = canvas.toDataURL('image/jpeg', 1.0);
            const imgProps = doc.getImageProperties(imgData);

            const pdfWidth = doc.internal.pageSize.getWidth();
            const pdfHeight = doc.internal.pageSize.getHeight();
            const margin = 20;
            const imgDisplayWidth = pdfWidth - 2 * margin;
            const imgDisplayHeight = (imgProps.height * imgDisplayWidth) / imgProps.width;

            let heightLeft = imgDisplayHeight;
            let position = margin;

            doc.setFontSize(24);
            doc.text("Monthly QUASAR Report", pdfWidth / 2, 40, { align: 'center' });
            position = 60;

            doc.addImage(imgData, 'JPEG', margin, position, imgDisplayWidth, imgDisplayHeight);
            heightLeft -= (pdfHeight - position);

            while (heightLeft >= 0) {
                position = heightLeft - imgDisplayHeight + margin;
                doc.addPage();
                doc.addImage(imgData, 'JPEG', margin, position, imgDisplayWidth, imgDisplayHeight);
                heightLeft -= pdfHeight;
            }

            doc.save(`SCC_Report ${new Date().toISOString().slice(0, 10)}.pdf`);
        } catch (error) {
            console.error("Error al generar el PDF:", error);
        } finally {
            generarPDFBtn.style.display = 'inline-block';
            regresarBtn.style.display = 'inline-block';
        }
    });

    // --- Botón regresar ---
    regresarBtn.addEventListener('click', async () => {
        try {
            await window.clearObjectStore(window.STORE_DEMANDA);
            await window.clearObjectStore(window.STORE_INFORMACION);
            await window.clearObjectStore(window.STORE_FORM_ADICIONAL);
            window.location.href = './Inicio.html';
        } catch (error) {
            console.error('Error al borrar datos:', error);
        }
    });

});