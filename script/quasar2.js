document.addEventListener('DOMContentLoaded', () => {

    const form = document.getElementById('dtAdicionales');
    const mensaje = document.querySelector('.message');

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        mensaje.textContent = 'Saving data...';

        const fd = new FormData(form);

        const data = {
            Flux: parseFloat(fd.get('Flux')),
            Welding: parseFloat(fd.get('Welding')),

            // Nombres de los químicos personalizados
            nameCh1: fd.get("PctCh1"),
            nameCh2: fd.get("PctCh2"),
            nameCh3: fd.get("PctCh3"),
            nameCh4: fd.get("PctCh4"),

            // Porcentajes ingresados
            chem1Pct: parseFloat(fd.get("Chem1Pct")),
            chem2Pct: parseFloat(fd.get("Chem2Pct")),
            chem3Pct: parseFloat(fd.get("Chem3Pct")),
            chem4Pct: parseFloat(fd.get("Chem4Pct")),

            timestamp: new Date().toISOString()
        };

        try {
            await addDataToIndexedDB(
                window.STORE_QUASAR_DESPERDICIOS,
                [data]
            );

            mensaje.textContent = "Data saved successfully. Redirecting...";

            setTimeout(() => {
                window.location.href = "QUASAR3.html";
            }, 1000);

        } catch (error) {
            console.error("Error saving waste data:", error);
            mensaje.textContent = "Error saving data ";
        }
    });

});
