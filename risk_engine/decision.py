def get_recommended_action(
    risk_score: float
) -> str:

    if risk_score <= 30:
        return "ALLOW"

    if risk_score <= 70:
        return "REVIEW"

    if risk_score <= 90:
        return "REVIEW"

    return "BLOCK"