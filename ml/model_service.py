from pathlib import Path
import pickle
import numpy as np
import pandas as pd
import xgboost as xgb



# PATHS


BASE_DIR = Path(__file__).resolve().parent

MODEL_PATH = BASE_DIR / "model_v21.pkl"
FEATURE_PATH = BASE_DIR / "feature_columns_v21.pkl"
DEFAULTS_PATH = BASE_DIR / "inference_defaults.pkl"



# LOAD MODEL


with open(MODEL_PATH, "rb") as f:
    model = pickle.load(f)

with open(FEATURE_PATH, "rb") as f:
    feature_columns = pickle.load(f)

with open(DEFAULTS_PATH, "rb") as f:
    inference = pickle.load(f)


# ============================================================
# LOAD ARTIFACT INFORMATION
# ============================================================

categorical_features = inference["categorical_features"]

categorical_defaults = inference.get(
    "categorical_defaults",
    {}
)

categorical_vocabularies = inference.get(
    "categorical_vocabularies",
    {}
)

numeric_defaults = inference.get(
    "numeric_defaults",
    {}
)


print("MODEL LOADED:", type(model).__name__)
print("FEATURES LOADED:", len(feature_columns))
print("CATEGORICAL FEATURES:", len(categorical_features))



# GET CATEGORIES DIRECTLY FROM TRAINED XGBOOST MODEL


def get_model_categorical_vocabularies():
    """
    Get the EXACT categorical vocabularies stored inside
    the trained XGBoost model.

    This is more reliable than using categories generated
    independently from the raw CSV.
    """

    booster = model.get_booster()

    try:
        categories_arrow = booster.get_categories(
            export_to_arrow=True
        ).to_arrow()

        categories_dict = dict(categories_arrow)

    except Exception as e:

        raise RuntimeError(
            "Unable to read categorical vocabularies "
            f"from trained XGBoost model: {e}"
        )

    result = {}

    for feature in categorical_features:

        raw_categories = categories_dict.get(
            feature,
            []
        )

        cleaned = []

        for value in raw_categories:

            # PyArrow scalar
            if hasattr(value, "as_py"):
                value = value.as_py()

            if value is not None:
                cleaned.append(str(value))

        result[feature] = cleaned

    return result


# IMPORTANT:
# These categories come from model_v21.pkl itself.
model_categorical_vocabularies = (
    get_model_categorical_vocabularies()
)


print(
    "MODEL CATEGORIES LOADED:",
    len(model_categorical_vocabularies)
)



# SHOW CATEGORY INFORMATION


for feature in categorical_features:

    model_vocab = model_categorical_vocabularies.get(
        feature,
        []
    )

    artifact_vocab = categorical_vocabularies.get(
        feature,
        []
    )

    print(
        f"{feature}: "
        f"model={len(model_vocab)}, "
        f"artifact={len(artifact_vocab)}"
    )



# SAFE NUMERIC DEFAULT


def _safe_numeric_default(feature):

    value = numeric_defaults.get(
        feature,
        0.0
    )

    if value is None:
        return 0.0

    try:
        return float(value)

    except Exception:
        return 0.0



# SAFE CATEGORICAL DEFAULT


def _safe_categorical_default(feature):

    # ALWAYS prefer the model vocabulary.
    model_vocab = model_categorical_vocabularies.get(
        feature,
        []
    )

    if not model_vocab:
        return np.nan

    # Candidate default from inference artifact.
    default = categorical_defaults.get(
        feature,
        None
    )

    # Use it only if the TRAINED MODEL knows it.
    if default is not None:

        default = str(default)

        if default in model_vocab:
            return default

    # Otherwise use a category the model definitely knows.
    return model_vocab[0]



# BUILD TRANSACTION DATAFRAME


def build_transaction_dataframe(transaction_amount):
    """
    Build exactly the 450 features expected by model_v21.

    Categorical columns are created using the EXACT
    categorical vocabulary stored inside model_v21.pkl.
    """



    X = pd.DataFrame(
        {
            feature: [np.nan]
            for feature in feature_columns
        }
    )

   
    # Transaction amount
    

    if "TransactionAmt" in X.columns:

        X["TransactionAmt"] = pd.Series(
            [float(transaction_amount)],
            index=X.index,
            dtype="float64"
        )

   
    # NUMERIC FEATURES
    

    for feature in feature_columns:

        if feature in categorical_features:
            continue

        if feature == "TransactionAmt":
            continue

        value = _safe_numeric_default(feature)

        X[feature] = pd.Series(
            [value],
            index=X.index,
            dtype="float64"
        )

    # CATEGORICAL FEATURES
    

    for feature in categorical_features:

        # EXACT categories from trained model
        vocabulary = model_categorical_vocabularies.get(
            feature,
            []
        )

        if not vocabulary:

            # No known categories.
            X[feature] = pd.Series(
                [np.nan],
                index=X.index,
                dtype="category"
            )

            continue

        # Find a valid default.
        value = _safe_categorical_default(
            feature
        )

        # Construct categorical column FIRST.
        X[feature] = pd.Series(
            pd.Categorical(
                [value],
                categories=vocabulary
            ),
            index=X.index
        )

 

    X = X[feature_columns]

    return X



# SANITIZE CATEGORICAL COLUMNS


def sanitize_categorical_columns(X):

    X = X.copy()

    for feature in categorical_features:

        if feature not in X.columns:
            continue

        vocabulary = model_categorical_vocabularies.get(
            feature,
            []
        )

        if not vocabulary:

            X[feature] = pd.Series(
                pd.Categorical(
                    X[feature],
                    categories=[]
                ),
                index=X.index
            )

            continue

        # Convert to string only where values exist.
        values = X[feature].copy()

        values = values.map(
            lambda x:
                str(x)
                if pd.notna(x)
                else np.nan
        )

        # Anything unknown to the TRAINED MODEL becomes NaN.
        values = values.where(
            values.isin(vocabulary),
            np.nan
        )

        # Rebuild categorical column with EXACT model levels.
        X[feature] = pd.Series(
            pd.Categorical(
                values,
                categories=vocabulary
            ),
            index=X.index
        )

    return X



# PREDICT


def predict_transaction(transaction_amount):

    
    # Build dataframe
  

    X = build_transaction_dataframe(
        transaction_amount
    )

    
    # Sanitize categorical columns
  

    X = sanitize_categorical_columns(X)


    if list(X.columns) != list(feature_columns):

        raise ValueError(
            "Feature order mismatch between inference "
            "dataframe and trained model."
        )

    if X.shape[1] != 450:

        raise ValueError(
            f"Expected 450 features, got {X.shape[1]}"
        )

    
    # Verify categorical dtypes
    

    for feature in categorical_features:

        if not pd.api.types.is_categorical_dtype(
            X[feature]
        ):

            raise TypeError(
                f"Feature '{feature}' is not categorical."
            )

    
    # PREDICTION
    

    probability = float(
        model.predict_proba(X)[0][1]
    )

    
    # RISK SCORE
    

    risk_score = round(
        probability * 100,
        2
    )

    
    # RISK LEVEL
    

    if probability >= 0.80:

        risk_level = "CRITICAL"
        action = "BLOCK"

    elif probability >= 0.60:

        risk_level = "HIGH"
        action = "REVIEW"

    elif probability >= 0.30:

        risk_level = "MEDIUM"
        action = "MONITOR"

    else:

        risk_level = "LOW"
        action = "ALLOW"

    
    # RESULT
   

    return {
        "fraud_probability": round(
            probability,
            4
        ),
        "risk_score": risk_score,
        "risk_level": risk_level,
        "recommended_action": action
    }