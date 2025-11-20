document.addEventListener('DOMContentLoaded', () => {

    const form = document.getElementById('dtAdicionales');
    const mensaje = document.querySelector('.message');

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        mensaje.textContent = 'Guardando datos...';

        const formDataDesperdicios = new FormData(form);

        const formAnswersDesperdicios = {
            Flux: parseFloat(formDataDesperdicios.get('Flux')),
            Welding: parseFloat(formDataDesperdicios.get('Welding')),
            rtv: parseFloat(formDataDesperdicios.get('rtv')),
            uv: parseFloat(formDataDesperdicios.get('uv')),
            chemask: parseFloat(formDataDesperdicios.get('chemask')),
            timestamp: new Date().toISOString()
        };

        try {
            await addDataToIndexedDB(
                window.STORE_QUASAR_DESPERDICIOS,
                [formAnswersDesperdicios]  //  ENVÍA ARREGLO, NO OBJETO
            );

            mensaje.textContent = "Datos guardados correctamente ✔️";

            setTimeout(() => {
                window.location.href = "QUASAR3.html";
            }, 1000);

        } catch (error) {
            console.error("Error guardando desperdicios:", error);
            mensaje.textContent = "Error al guardar los datos ❌";
        }
    });

});
