from flask import Flask, request, jsonify
import numpy as np
import joblib

app = Flask(__name__)

@app.route('/')
def home():
    return jsonify({
        'message': 'Welcome to the AI Prediction API',
        'endpoint' : '/predict',
        'method' : 'POST',
    })

#RUTA PARA PREDICCION DE MODELOS
@app.route('/predict', methods=['POST'])
def predict():
    try:
        data = request.get_json()
        #Datos recibidos desde IndexedDB(Poner los nombres correctos )
        values = np.array(data['values', []])

        if values.size == 0:
            return jsonify({'error': 'No input values provided'}), 400

        #Modelo de IA (Ejemplo simple) Sirve para como guia , usar las formulas correctas
        flux= round(float(values.sum() * 2), 2)
        solder= round(float(values.mean() * 5), 2)
        MC2= round(float(values.std() * 10), 2)

        return jsonify({
            'flux_prediction': flux,
            'solder_prediction': solder,
            'MC2_prediction': MC2
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5500)
