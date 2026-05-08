from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
import random

app = FastAPI(title="Stroke Risk Detection API")

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global variables for model
MODEL_PATH = "models/stroke_model.pkl"
model = None

# Attempt to load model if joblib is available
try:
    import joblib
    if os.path.exists(MODEL_PATH):
        model = joblib.load(MODEL_PATH)
        print(f"Model loaded from {MODEL_PATH}")
    else:
        print(f"Warning: Model not found at {MODEL_PATH}. Using mock prediction for UI testing.")
except ImportError:
    print("Warning: joblib not installed. Using mock prediction.")

class StrokeInput(BaseModel):
    gender: str
    age: float
    hypertension: int
    heart_disease: int
    ever_married: str
    work_type: str
    Residence_type: str
    avg_glucose_level: float
    bmi: float
    smoking_status: str

ADVICE_MAP = {
    "Low": "Your risk level is low. Continue maintaining a healthy lifestyle, regular exercise, and a balanced diet to keep it this way.",
    "Moderate": "You have a moderate risk factors. We recommend scheduling a routine check-up with your doctor to discuss preventive heart health measures.",
    "High": "URGENT: Your risk level is high. Please consult a healthcare professional immediately for a full cardiovascular assessment."
}

@app.get("/")
def read_root():
    return {"message": "Stroke Risk Detection System API is running"}

@app.post("/predict")
async def predict(data: StrokeInput):
    # Dynamic imports for heavy libraries
    try:
        import pandas as pd
        import numpy as np
    except ImportError:
        # Emergency fallback for missing dependencies
        prob = random.uniform(0.1, 0.9)
        if data.age > 70: prob = 0.85 # Deterministic high risk for testing
        
        risk_level = "High" if prob > 0.6 else ("Moderate" if prob > 0.3 else "Low")
        return {
            "risk_probability": prob,
            "risk_level": risk_level,
            "explanation": [{"feature": "Age", "contribution": 0.45, "impact": "Significant"}],
            "note": "AI Engine dependencies still installing. Showing mock data."
        }

    # Convert input to DataFrame
    input_df = pd.DataFrame([data.dict()])
    
    if model is None:
        # Mock logic using numpy/pandas if model is missing but libs are present
        prob = np.random.uniform(0.1, 0.9)
        risk_level = "High" if prob > 0.6 else ("Moderate" if prob > 0.3 else "Low")
        
        explanation = [
            {"feature": "age", "contribution": 0.15},
            {"feature": "hypertension", "contribution": 0.10},
            {"feature": "avg_glucose_level", "contribution": -0.05}
        ]
        
        return {
            "risk_probability": float(prob),
            "risk_level": risk_level,
            "advice": ADVICE_MAP.get(risk_level, ""),
            "explanation": explanation,
            "is_mock": True
        }
    
    # Get prediction probability using real model
    prob = model.predict_proba(input_df)[0][1]
    
    # Classification
    risk_level = "Low"
    if prob > 0.6:
        risk_level = "High"
    elif prob > 0.3:
        risk_level = "Moderate"
        
    # SHAP Explanation
    try:
        import shap
        classifier = model.named_steps['classifier']
        preprocessor = model.named_steps['preprocessor']
        
        X_transformed = preprocessor.transform(input_df)
        
        # Get feature names
        ohe_features = preprocessor.named_transformers_['cat'].named_steps['onehot'].get_feature_names_out()
        feature_names = ['age', 'avg_glucose_level', 'bmi'] + list(ohe_features)
        
        explainer = shap.TreeExplainer(classifier)
        shap_values = explainer.shap_values(X_transformed)
        
        if isinstance(shap_values, list):
            shap_v = shap_values[1][0]
        else:
            shap_v = shap_values[0]
            
        explanation = []
        for name, val in zip(feature_names, shap_v):
            explanation.append({"feature": name, "contribution": float(val)})
            
        explanation = sorted(explanation, key=lambda x: abs(x['contribution']), reverse=True)
        return {
            "risk_probability": float(prob),
            "risk_level": risk_level,
            "advice": ADVICE_MAP.get(risk_level, ""),
            "explanation": explanation[:5]
        }
    except Exception as e:
        print(f"SHAP Error: {e}")
        return {
            "risk_probability": float(prob),
            "risk_level": risk_level,
            "advice": ADVICE_MAP.get(risk_level, ""),
            "explanation": [{"feature": "Model Output", "contribution": float(prob)}],
            "note": "SHAP library error or not installed."
        }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
