document.addEventListener('DOMContentLoaded', () => {



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