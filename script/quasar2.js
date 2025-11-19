document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('dtDesperdicios');
    const mensaje = document.querySelector('.message');

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        mensaje.textContent = 'Guardando datos...'; 


        const formDataDesperdicios = new
        const formAnswersDesperdicios = {
            Flux : parseFloat(formDataDesperdicios.get('Flux')),
            Welding : parseFloat(formDataDesperdicios.get('Welding')),
            rtv : parseFloat(formDataDesperdicios.get('rtv')),
            uv : paserFloat(formfDataDesperdicios.get('UV')),
            chemask : parseFloat(formDataDesperdicios.get('chemask')),
            timestamp: new Date().toISOString()
        };
        

    });
});