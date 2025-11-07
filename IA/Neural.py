from flask import Flask, request, jsonify
import numpy as np

app = Flask(__name__)

#rUTA PARA PREDICCION DE MODELOS
@app.route('/predict', methods=['POST'])
def predict():
    data = request.get_json()   
    #Datos recibidos desde IndexedDB(Poner los nombres correctos )
    values = np.array(data['values'])

    #Modelo de IA (Ejemplo simple) Sirve para como guia , usar las formulas correctas
    flux= round(float(values.sum() * 2), 2)
    solder= round(float(values.mean() * 5), 2)
    MC2= round(float(values.std() * 10), 2)

    return jsonify({
        'flux_prediction': flux,
        'solder_prediction': solder,
        'MC2_prediction': MC2
    })

if __name__ == '__main__':
    app.run(debug=True, port=5500)
