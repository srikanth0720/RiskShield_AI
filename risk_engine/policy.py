"""
RiskShield AI - Risk Policy Engine

"""


def amount_risk(amount: float):
    """
    Calculate additional risk based on transaction amount.
    """

    if amount >= 10_000_000:       # ₹1 crore
        return 40, "Extremely high transaction amount"

    if amount >= 2_500_000:        # ₹25 lakh
        return 30, "Very high transaction amount"

    if amount >= 1_000_000:        # ₹10 lakh
        return 25, "High transaction amount"

    if amount >= 200_000:          # ₹2 lakh
        return 20, "Elevated transaction amount"

    if amount >= 50_000:
        return 10, "Large transaction amount"

    return 0, None


def recipient_risk(recipient: str):
    """
    Basic recipient validation.

    This is intentionally conservative.
    We don't call a recipient fraudulent just because
    the format is unfamiliar.
    """

    if not recipient:
        return 0, None

    clean = recipient.replace(" ", "").replace("-", "")

    # Very long recipient identifiers can be suspicious.
    if len(clean) > 30:
        return 10, "Unusual recipient identifier"

    return 0, None


def transaction_type_risk(transaction_type: str):
    """
    Add small contextual risk based on transaction type.
    """

    if not transaction_type:
        return 0, None

    transaction_type = transaction_type.upper()

    if transaction_type == "BANK_TRANSFER":
        return 2, None

    if transaction_type == "CARD":
        return 1, None

    return 0, None


def apply_risk_policy(
    ml_probability: float,
    amount: float,
    recipient: str = "",
    transaction_type: str = ""
):
    """
    Combine ML risk with deterministic transaction rules.
    """

    # ML probability -> 0-100
    ml_score = float(ml_probability) * 100

    # Start with ML score
    final_score = ml_score

    reasons = []

    # Amount risk
   

    risk, reason = amount_risk(amount)

    final_score += risk

    if reason:
        reasons.append(reason)

    
    # Recipient risk
    

    risk, reason = recipient_risk(recipient)

    final_score += risk

    if reason:
        reasons.append(reason)

    
    # Transaction type risk
    

    risk, reason = transaction_type_risk(transaction_type)

    final_score += risk

    if reason:
        reasons.append(reason)

    
    # Clamp score
   

    final_score = min(round(final_score, 2), 100)

    
    # Risk level
   

    if final_score >= 81:
        risk_level = "CRITICAL"
        action = "BLOCK"

    elif final_score >= 61:
        risk_level = "HIGH"
        action = "REVIEW"

    elif final_score >= 31:
        risk_level = "MEDIUM"
        action = "REVIEW"

    else:
        risk_level = "LOW"
        action = "ALLOW"

   
    # Default explanation
    

    if not reasons:
        reasons.append(
            "No significant risk indicators detected"
        )

    return {
        "risk_score": final_score,
        "risk_level": risk_level,
        "recommended_action": action,
        "reasons": reasons
    }