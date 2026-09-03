"""
RiskShield AI - Risk Scoring Engine V2
"""

def probability_to_score(probability: float) -> float:
    probability = max(0.0, min(1.0, float(probability)))
    return round(probability * 100, 2)


def get_risk_level(risk_score: float) -> str:
    score = float(risk_score)

    if score >= 80:
        return "CRITICAL"
    elif score >= 60:
        return "HIGH"
    elif score >= 30:
        return "MEDIUM"
    else:
        return "LOW"


def calculate_risk_score(
    fraud_probability: float,
    transaction_amount: float = 0,
    transaction_type: str = "UPI",
    recipient: str = ""
):
    """
    Combines ML probability with transaction-level risk signals.
    """

    score = probability_to_score(fraud_probability)
    reasons = []

    amount = float(transaction_amount or 0)
    transaction_type = (transaction_type or "UPI").upper()
    recipient = str(recipient or "").strip()

    
    # 1. TRANSACTION AMOUNT RISK
  

    if amount >= 10_000_000:
        score += 70
        reasons.append("Extremely high transaction amount")

    elif amount >= 1_000_000:
        score += 50
        reasons.append("Very high transaction amount")

    elif amount >= 500_000:
        score += 35
        reasons.append("High-value transaction")

    elif amount >= 200_000:
        score += 25
        reasons.append("High transaction amount")

    elif amount >= 100_000:
        score += 15
        reasons.append("Elevated transaction amount")

    elif amount >= 50_000:
        score += 8
        reasons.append("Above-normal transaction amount")

    
    # 2. TRANSACTION TYPE RISK
    

    if transaction_type == "BANK_TRANSFER":

        if amount >= 10_000_000:
            score += 15
            reasons.append("Extremely high-value bank transfer")

        elif amount >= 500_000:
            score += 10
            reasons.append("High-value bank transfer")

    elif transaction_type == "UPI":

        if amount >= 200_000:
            score += 5
            reasons.append("High-value UPI transaction")

    elif transaction_type == "CARD":

        if amount >= 100_000:
            score += 5
            reasons.append("High-value card transaction")

    
    # 3. RECIPIENT SIGNAL
    

    if not recipient:
        score += 5
        reasons.append("Recipient information unavailable")

    
    # 4. EXTREME TRANSACTION OVERRIDE
   

    if amount >= 10_000_000:
        score = max(score, 80)
        reasons.append("Transaction exceeds critical amount threshold")


    # FINAL SCORE
   

    score = min(round(score, 2), 100.0)

    risk_level = get_risk_level(score)

    # DECISION
   

    if score >= 80:
        action = "BLOCK"

    elif score >= 60:
        action = "REVIEW"

    elif score >= 30:
        action = "REVIEW"

    else:
        action = "ALLOW"

    if not reasons:
        reasons.append("No significant risk indicators detected")

    return {
        "risk_score": score,
        "risk_level": risk_level,
        "recommended_action": action,
        "reasons": reasons
    }