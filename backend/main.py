from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from backend.schemas import (
    PredictionRequest,
    PredictionResponse,
    HealthResponse,
)

from ml.model_service import predict_transaction

from risk_engine.scoring import calculate_risk_score



# APP


app = FastAPI(
    title="RiskShield AI",
    description="AI-powered fraud detection and risk scoring system",
    version="2.0.0",
)



# CORS


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)



# HEALTH


@app.get(
    "/health",
    response_model=HealthResponse
)
def health():

    return {
        "status": "healthy",
        "service": "RiskShield AI",
    }



# PREDICT


@app.post(
    "/predict",
    response_model=PredictionResponse
)
def predict(request: PredictionRequest):

    try:

        
        #  RUN ML MODEL
        

        result = predict_transaction(
            request.transaction_amount
        )

        fraud_probability = float(
            result["fraud_probability"]
        )


        
        #  RUN RISK ENGINE V2
        

        risk_result = calculate_risk_score(

            fraud_probability=fraud_probability,

            transaction_amount=request.transaction_amount,

            transaction_type=request.transaction_type,

            recipient=request.recipient,
        )


        
        #  RETURN FINAL DECISION
        

        return {

            "fraud_probability": fraud_probability,

            "risk_score": risk_result["risk_score"],

            "risk_level": risk_result["risk_level"],

            "recommended_action":
                risk_result["recommended_action"],

            "reasons":
                risk_result["reasons"],

            "recipient":
                request.recipient,

            "transaction_type":
                request.transaction_type,
        }


    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )