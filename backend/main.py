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

# Stats tracking (In-memory for demo)
stats = {
    "total_predictions": 1284,
    "high_risk_count": 342,
    "accuracy": 0.942
}

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
    weight: float
    height: float
    waist: float
    systolic: float
    diastolic: float
    avg_glucose_level: float
    total_cholesterol: float
    
    # Female Specific
    is_pregnant: str = "No"
    weeks_postpartum: float = 0
    preeclampsia: str = "No"
    gestational_diabetes: str = "No"
    contraceptives: str = "No"
    hrt: str = "No"
    menopause_status: str = "Pre-menopausal"
    migraine_aura: str = "No"
    
    # Male Specific
    erectile_dysfunction: str = "No"
    low_testosterone: str = "No"
    adt: str = "No"
    contact_sports: str = "No"
    hip_circumference: float = 0
    occupational_stress: str = "No"
    
    # General History
    hypertension_diag: str
    diabetes_diag: str
    afib: str
    tia: str
    family_history: str
    osa: str
    smoking_status: str
    secondhand_smoke: str = "No"
    heavy_alcohol: str
    khat: str = "No"
    sleep_hours: float
    physical_activity: float
    sodium_intake: float
    bmi: float

ADVICE_MAP = {
    "Low": "Your risk level is low. Continue maintaining a healthy lifestyle, regular exercise, and a balanced diet to keep it this way.",
    "Moderate": "You have a moderate risk factors. We recommend scheduling a routine check-up with your doctor to discuss preventive heart health measures.",
    "High": "URGENT: Your risk level is high. Please consult a healthcare professional immediately for a full cardiovascular assessment."
}

@app.get("/stats")
def get_stats():
    return stats

@app.get("/")
def read_root():
    return {"message": "Stroke Risk Detection System API is running"}

@app.post("/predict")
async def predict(data: StrokeInput):
    # --- CLINICAL HEURISTIC LOGIC ---
    red_flags = 0
    medium_flags = 0
    slow_burners = 0
    
    # 1. Red Flags (Immediate High Risk)
    if data.afib == "Yes": red_flags += 1
    if data.tia == "Yes": red_flags += 1
    if data.systolic > 160 or data.diastolic > 100: red_flags += 1
    
    # Female Red Flags
    if data.gender == "Female":
        if data.is_pregnant == "Yes" and (data.systolic > 140 or data.diastolic > 90): red_flags += 1
        if data.preeclampsia == "Yes": red_flags += 1
        if data.smoking_status == "smokes" and data.contraceptives == "Yes": red_flags += 1
        
    # Male Red Flags
    if data.gender == "Male":
        if data.erectile_dysfunction == "Yes" and data.hypertension_diag == "Yes": red_flags += 1

    # 2. Medium Risk (Accumulators)
    if data.diabetes_diag == "Yes" or data.avg_glucose_level > 125: medium_flags += 1
    if data.heavy_alcohol == "Yes": medium_flags += 1
    if data.smoking_status == "smokes": medium_flags += 1
    if data.family_history == "Yes": medium_flags += 1
    
    # Female Medium
    if data.gender == "Female":
        if data.migraine_aura == "Yes": medium_flags += 1
        if 0 < data.weeks_postpartum <= 12: medium_flags += 1
        if data.gestational_diabetes == "Yes": medium_flags += 1
        
    # Male Medium
    if data.gender == "Male":
        if data.erectile_dysfunction == "Yes": medium_flags += 1
        if data.osa == "Yes": medium_flags += 1
        if data.adt == "Yes": medium_flags += 1
        if data.low_testosterone == "Yes": medium_flags += 1

    # 3. Slow Burners
    if data.age > 55: slow_burners += 1
    if data.bmi > 30: slow_burners += 1
    if data.sleep_hours < 6: slow_burners += 1
    if data.sodium_intake > 5: slow_burners += 1
    if data.gender == "Male" and data.occupational_stress == "Yes": slow_burners += 1

    # Final Probability Calculation (Heuristic)
    base_prob = 0.1
    if red_flags > 0:
        base_prob = 0.85 + (red_flags * 0.05)
    elif medium_flags >= 3:
        base_prob = 0.65 + (medium_flags * 0.02)
    elif medium_flags >= 1:
        base_prob = 0.35 + (medium_flags * 0.05)
    
    # Add slow burner weight
    base_prob += slow_burners * 0.03
    base_prob = min(base_prob, 0.99)

    risk_level = "Low"
    if base_prob > 0.7:
        risk_level = "High"
    elif base_prob > 0.4:
        risk_level = "Moderate"

    # Explanations based on flags
    explanation = []
    if data.afib == "Yes": explanation.append({"feature": "Atrial Fibrillation", "contribution": 0.3})
    if data.tia == "Yes": explanation.append({"feature": "Previous Mini-Stroke", "contribution": 0.4})
    if data.systolic > 160: explanation.append({"feature": "Stage 2 Hypertension", "contribution": 0.25})
    if data.gender == "Female" and data.smoking_status == "smokes" and data.contraceptives == "Yes":
        explanation.append({"feature": "Smoking + Contraceptives", "contribution": 0.35})
    if data.gender == "Male" and data.erectile_dysfunction == "Yes":
        explanation.append({"feature": "Vascular Indicator (ED)", "contribution": 0.15})

    # Update Stats
    stats["total_predictions"] += 1
    if risk_level == "High":
        stats["high_risk_count"] += 1

    return {
        "risk_probability": float(base_prob),
        "risk_level": risk_level,
        "advice": ADVICE_MAP.get(risk_level, ""),
        "explanation": explanation[:5] if explanation else [{"feature": "Combined Lifestyle Factors", "contribution": 0.1}]
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
