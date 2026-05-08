import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.impute import KNNImputer
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.compose import ColumnTransformer
import joblib
import os

def generate_synthetic_data(n_samples=2000):
    np.random.seed(42)
    
    data = {
        'gender': np.random.choice(['Male', 'Female', 'Other'], n_samples),
        'age': np.random.randint(1, 90, n_samples),
        'hypertension': np.random.choice([0, 1], n_samples, p=[0.9, 0.1]),
        'heart_disease': np.random.choice([0, 1], n_samples, p=[0.95, 0.05]),
        'ever_married': np.random.choice(['Yes', 'No'], n_samples),
        'work_type': np.random.choice(['Private', 'Self-employed', 'Govt_job', 'children', 'Never_worked'], n_samples),
        'Residence_type': np.random.choice(['Urban', 'Rural'], n_samples),
        'avg_glucose_level': np.random.uniform(55, 270, n_samples),
        'bmi': np.random.uniform(10, 50, n_samples),
        'smoking_status': np.random.choice(['formerly smoked', 'never smoked', 'smokes', 'Unknown'], n_samples),
    }
    
    df = pd.DataFrame(data)
    
    # Introduce missing values in BMI
    df.loc[df.sample(frac=0.05).index, 'bmi'] = np.nan
    
    # Simple logic for stroke risk
    risk_score = (
        (df['age'] / 100) * 0.4 +
        (df['hypertension'] * 0.2) +
        (df['heart_disease'] * 0.3) +
        (df['avg_glucose_level'] / 300) * 0.1 +
        (df['bmi'] / 50) * 0.1 +
        (df['smoking_status'].map({'smokes': 0.2, 'formerly smoked': 0.1, 'never smoked': 0, 'Unknown': 0.05}))
    )
    
    df['stroke'] = (risk_score + np.random.normal(0, 0.1, n_samples) > 0.6).astype(int)
    
    return df

def train_model():
    df = generate_synthetic_data()
    
    X = df.drop('stroke', axis=1)
    y = df['stroke']
    
    numeric_features = ['age', 'avg_glucose_level', 'bmi']
    categorical_features = ['gender', 'hypertension', 'heart_disease', 'ever_married', 'work_type', 'Residence_type', 'smoking_status']

    numeric_transformer = Pipeline(steps=[
        ('imputer', KNNImputer(n_neighbors=5)),
        ('scaler', StandardScaler())
    ])

    categorical_transformer = Pipeline(steps=[
        ('onehot', OneHotEncoder(handle_unknown='ignore'))
    ])

    preprocessor = ColumnTransformer(
        transformers=[
            ('num', numeric_transformer, numeric_features),
            ('cat', categorical_transformer, categorical_features)
        ])

    model = Pipeline(steps=[
        ('preprocessor', preprocessor),
        ('classifier', RandomForestClassifier(n_estimators=100, random_state=42, class_weight='balanced'))
    ])

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    model.fit(X_train, y_train)
    
    print(f"Model trained. Accuracy: {model.score(X_test, y_test):.4f}")
    
    # Save the model
    os.makedirs('models', exist_ok=True)
    joblib.dump(model, 'models/stroke_model.pkl')
    print("Model saved to models/stroke_model.pkl")

if __name__ == "__main__":
    train_model()
