from pydantic import BaseModel, Field
from typing import List


class PredictionRequest(BaseModel):

    recipient: str

    transaction_amount: float = Field(
        ...,
        gt=0,
        description="Transaction amount"
    )

    transaction_type: str = "UPI"


class PredictionResponse(BaseModel):

    fraud_probability: float
    risk_score: float
    risk_level: str
    recommended_action: str
    reasons: List[str]
    recipient: str | None = None
    transaction_type: str | None = None


class HealthResponse(BaseModel):

    status: str
    service: str