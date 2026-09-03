def generate_reasons(
    fraud_probability: float,
    risk_score: float,
    transaction_amount: float
) -> list[str]:

    reasons = []

    if fraud_probability >= 0.90:
        reasons.append(
            "Very high fraud probability"
        )

    elif fraud_probability >= 0.70:
        reasons.append(
            "High fraud probability"
        )

    elif fraud_probability >= 0.40:
        reasons.append(
            "Elevated fraud probability"
        )

    if transaction_amount >= 10000:
        reasons.append(
            "High transaction amount"
        )

    elif transaction_amount >= 5000:
        reasons.append(
            "Above-normal transaction amount"
        )

    if risk_score >= 90:
        reasons.append(
            "Transaction exceeds critical risk threshold"
        )

    elif risk_score >= 70:
        reasons.append(
            "Transaction exceeds high-risk threshold"
        )

    if not reasons:
        reasons.append(
            "No significant risk indicators detected"
        )

    return reasons