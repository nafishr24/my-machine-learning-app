import joblib
import numpy as np
from flask import Flask, render_template, request, jsonify
import pandas as pd

app = Flask(__name__)

# Load model yang sudah dilatih
try:
    model = joblib.load('model_lr.pkl')
    print("Model berhasil dimuat!")
    print(f"Tipe model: {type(model)}")
    
    # Debug: Cek apakah model adalah pipeline dengan preprocessing
    if hasattr(model, 'steps') or hasattr(model, 'named_steps'):
        print("Model adalah pipeline dengan preprocessing")
    elif hasattr(model, 'feature_names_in_'):
        print("Model sudah dilatih dengan data yang sudah di-preprocess")
        
    # Debug: Cek classes_
    if hasattr(model, 'classes_'):
        print(f"Classes: {model.classes_}")
        print(f"Tipe classes: {type(model.classes_[0])}")
        
except FileNotFoundError:
    print("Peringatan: model_lr.pkl tidak ditemukan.")
    model = None

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/predict', methods=['POST'])
def predict():
    if model is None:
        return jsonify({
            'error': 'Model tidak ditemukan. Pastikan model_lr.pkl ada di direktori yang sama.'
        })
    
    try:
        # Ambil data dari form
        data = request.json
        
        # Debug: Tampilkan data yang diterima
        print(f"Data diterima: {data}")
        
        # Buat DataFrame dengan data mentah (STRING TIDAK DIENCODE)
        # Data numerik dikonversi ke float, data kategorik tetap string
        input_data = pd.DataFrame([{
            'Gender': data['gender'],  # 'Male' atau 'Female' (string)
            'Age': float(data['age']),  # float
            'Height': float(data['height']),  # float
            'Weight': float(data['weight']),  # float
            'family_history_with_overweight': data['family_history'],  # 'yes' atau 'no' (string)
            'FAVC': data['favc'],  # 'yes' atau 'no' (string)
            'FCVC': float(data['fcvc']),  # float
            'NCP': float(data['ncp']),  # float
            'CAEC': data['caec'],  # 'No', 'Sometimes', 'Frequently', 'Always' (string)
            'SMOKE': data['smoke'],  # 'yes' atau 'no' (string)
            'CH2O': float(data['ch2o']),  # float
            'SCC': data['scc'],  # 'yes' atau 'no' (string)
            'FAF': float(data['faf']),  # float
            'TUE': float(data['tue']),  # float
            'CALC': data['calc'],  # 'No', 'Sometimes', 'Frequently', 'Always' (string)
            'MTRANS': data['mtrans']  # 'Automobile', 'Bike', 'Motorbike', 'Public_Transportation', 'Walking' (string)
        }])
        
        print("Input data shape:", input_data.shape)
        print("Input data columns:", input_data.columns.tolist())
        print("Input data sample (raw):", input_data.iloc[0].to_dict())
        
        # Prediksi dengan model
        prediction = model.predict(input_data)
        
        print(f"Raw prediction: {prediction}")
        print(f"Prediction type: {type(prediction[0])}")
        
        # Jika model mengembalikan string, langsung gunakan
        predicted_class_name = str(prediction[0])
        
        # Format class name untuk display (ubah underscore ke spasi jika perlu)
        if '_' in predicted_class_name:
            predicted_class_display = predicted_class_name.replace('_', ' ')
        else:
            predicted_class_display = predicted_class_name
        
        # Jika model memiliki predict_proba, dapatkan confidence
        if hasattr(model, 'predict_proba'):
            prediction_proba = model.predict_proba(input_data)
            print(f"Prediction probabilities shape: {prediction_proba.shape}")
            
            # Dapatkan indeks dari predicted class
            if hasattr(model, 'classes_'):
                try:
                    # Cari indeks dari predicted class di classes_
                    idx = list(model.classes_).index(predicted_class_name)
                    confidence = float(prediction_proba[0][idx]) * 100
                except (ValueError, IndexError) as e:
                    print(f"Warning: {e}. Using max probability.")
                    confidence = float(prediction_proba[0].max()) * 100
            else:
                # Jika tidak ada classes_, gunakan probabilitas maksimum
                confidence = float(prediction_proba[0].max()) * 100
                
            # Siapkan all_probabilities
            all_probabilities = {}
            if hasattr(model, 'classes_'):
                for i, class_name in enumerate(model.classes_):
                    display_name = str(class_name)
                    if '_' in display_name:
                        display_name = display_name.replace('_', ' ')
                    prob_value = float(prediction_proba[0][i]) * 100
                    all_probabilities[display_name] = round(prob_value, 2)
            else:
                # Jika tidak ada classes_, buat default class names
                default_classes = [
                    'Insufficient Weight', 
                    'Normal Weight', 
                    'Overweight Level I', 
                    'Overweight Level II', 
                    'Obesity Type I', 
                    'Obesity Type II', 
                    'Obesity Type III'
                ]
                for i, class_name in enumerate(default_classes):
                    if i < len(prediction_proba[0]):
                        prob_value = float(prediction_proba[0][i]) * 100
                        all_probabilities[class_name] = round(prob_value, 2)
        else:
            # Jika model tidak memiliki predict_proba, set confidence ke 100%
            confidence = 100.0
            all_probabilities = {predicted_class_display: 100.0}
        
        return jsonify({
            'prediction': predicted_class_display,
            'confidence': round(confidence, 2),
            'all_probabilities': all_probabilities
        })
        
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        print(f"Error details: {error_details}")
        return jsonify({'error': str(e), 'details': error_details})

if __name__ == '__main__':
    app.run(debug=True, port=5000)