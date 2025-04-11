#!/usr/bin/env python3
"""
Prediction script for AI-based IDS using the trained Random Forest model
This script loads the model and makes predictions based on network traffic features
"""

import sys
import json
import joblib
import numpy as np
from sklearn.ensemble import RandomForestClassifier
import pandas as pd

def load_model(model_path="rf_model.joblib"):
    """
    Load the trained Random Forest model
    
    Args:
        model_path (str): Path to the trained model file
        
    Returns:
        The loaded model
    """
    try:
        # Try multiple possible paths for the model file
        possible_paths = [
            model_path,
            "./server/assets/rf_model.joblib",
            "./attached_assets/rf_model.joblib"
        ]
        
        for path in possible_paths:
            try:
                model = joblib.load(path)
                print(f"Successfully loaded model from {path}", file=sys.stderr)
                return model
            except Exception as e:
                print(f"Failed to load model from {path}: {str(e)}", file=sys.stderr)
                continue
                
        print("Could not load model from any path", file=sys.stderr)
        return None
    except Exception as e:
        print(f"Error loading model: {str(e)}", file=sys.stderr)
        return None

def preprocess_features(features):
    """
    Preprocess the input features to match the model's requirements
    
    Args:
        features (dict): Dictionary containing feature values
        
    Returns:
        DataFrame with properly formatted features
    """
    try:
        # Convert to a pandas DataFrame (1 row)
        df = pd.DataFrame([features])
        
        # Make sure all required features are present
        required_features = [
            'Destination Port', 'Flow Duration', 'Total Fwd Packets',
            'Total Backward Packets', 'Total Length of Fwd Packets',
            'Total Length of Bwd Packets', 'Fwd Packet Length Max',
            'Fwd Packet Length Min', 'Fwd Packet Length Mean',
            'Fwd Packet Length Std', 'Bwd Packet Length Max',
            'Bwd Packet Length Min', 'Bwd Packet Length Mean',
            'Bwd Packet Length Std', 'Flow Bytes/s', 'Flow Packets/s',
            'Flow IAT Mean', 'Flow IAT Std', 'Flow IAT Max', 'Flow IAT Min',
            'Fwd IAT Total', 'Fwd IAT Mean', 'Fwd IAT Std', 'Fwd IAT Max',
            'Fwd IAT Min', 'Bwd IAT Total', 'Bwd IAT Mean', 'Bwd IAT Std',
            'Bwd IAT Max', 'Bwd IAT Min', 'Fwd PSH Flags', 'Bwd PSH Flags',
            'Fwd URG Flags', 'Bwd URG Flags', 'Fwd Header Length',
            'Bwd Header Length', 'Fwd Packets/s', 'Bwd Packets/s',
            'Min Packet Length', 'Max Packet Length', 'Packet Length Mean',
            'Packet Length Std', 'Packet Length Variance', 'FIN Flag Count',
            'SYN Flag Count', 'RST Flag Count', 'PSH Flag Count',
            'ACK Flag Count', 'URG Flag Count', 'CWE Flag Count',
            'ECE Flag Count', 'Down/Up Ratio', 'Average Packet Size',
            'Avg Fwd Segment Size', 'Avg Bwd Segment Size'
        ]
        
        # Fill missing columns with default values
        for feature in required_features:
            if feature not in df.columns:
                df[feature] = 0
                
        # Ensure columns are in the right order
        df = df[required_features]
        
        return df
    except Exception as e:
        print(f"Error preprocessing features: {str(e)}", file=sys.stderr)
        return None

def predict(model, features):
    """
    Make a prediction using the trained model
    
    Args:
        model: The trained model
        features (DataFrame): Preprocessed features
        
    Returns:
        dict: Prediction result with class and probability
    """
    try:
        # Make prediction
        prediction = model.predict(features)[0]
        
        # Get probability
        probs = model.predict_proba(features)[0]
        probability = probs[1] if prediction == 1 else probs[0]
        
        return {
            "is_anomaly": bool(prediction == 1),
            "probability": float(probability)
        }
    except Exception as e:
        print(f"Error making prediction: {str(e)}", file=sys.stderr)
        return {
            "is_anomaly": False,
            "probability": 0.0,
            "error": str(e)
        }

def main():
    """
    Main function to handle prediction from command line
    """
    try:
        # Check if features are provided as command line argument
        if len(sys.argv) < 2:
            print(json.dumps({
                "is_anomaly": False,
                "probability": 0.0,
                "error": "No features provided"
            }))
            return
        
        # Parse features from command line argument
        features_json = sys.argv[1]
        features = json.loads(features_json)
        
        # Load model
        model = load_model()
        if model is None:
            print(json.dumps({
                "is_anomaly": False,
                "probability": 0.0,
                "error": "Failed to load model"
            }))
            return
        
        # Preprocess features
        processed_features = preprocess_features(features)
        if processed_features is None:
            print(json.dumps({
                "is_anomaly": False,
                "probability": 0.0,
                "error": "Failed to preprocess features"
            }))
            return
        
        # Make prediction
        result = predict(model, processed_features)
        
        # Output result as JSON
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({
            "is_anomaly": False,
            "probability": 0.0,
            "error": str(e)
        }))

if __name__ == "__main__":
    main()