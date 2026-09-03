import os
import pickle
import pandas as pd
import numpy as np

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

MODEL_PATH = os.path.join(BASE, "ml", "model_v21.pkl")
FEATURE_PATH = os.path.join(BASE, "ml", "feature_columns_v21.pkl")

TRAIN_TRANSACTION = os.path.join(
    BASE, "data", "raw", "ieee-fraud-detection", "train_transaction.csv"
)

TRAIN_IDENTITY = os.path.join(
    BASE, "data", "raw", "ieee-fraud-detection", "train_identity.csv"
)

OUTPUT = os.path.join(BASE, "ml", "inference_defaults.pkl")


print("=" * 60)
print("BUILDING INFERENCE ARTIFACT")
print("=" * 60)


with open(FEATURE_PATH, "rb") as f:
    feature_columns = pickle.load(f)

print("Features:", len(feature_columns))



with open(MODEL_PATH, "rb") as f:
    model = pickle.load(f)

booster = model.get_booster()

categorical_features = [
    feature_columns[i]
    for i, t in enumerate(booster.feature_types)
    if t == "c"
]

print("Categorical features:", len(categorical_features))



print("Loading transaction data...")

transaction_cols = [
    c for c in feature_columns
    if c in pd.read_csv(
        TRAIN_TRANSACTION,
        nrows=0
    ).columns
]

transactions = pd.read_csv(
    TRAIN_TRANSACTION,
    usecols=transaction_cols
)

print("Transaction rows:", len(transactions))


print("Loading identity data...")

identity_header = pd.read_csv(
    TRAIN_IDENTITY,
    nrows=0
)

identity_cols = [
    c for c in feature_columns
    if c in identity_header.columns
]

identity = pd.read_csv(
    TRAIN_IDENTITY,
    usecols=identity_cols
)

print("Identity rows:", len(identity))



vocabularies = {}
defaults = {}

for feature in categorical_features:

    # First try transaction data
    if feature in transactions.columns:
        series = transactions[feature]

    # Otherwise identity data
    elif feature in identity.columns:
        series = identity[feature]

    else:
        print("WARNING: missing:", feature)
        vocabularies[feature] = ["__MISSING__"]
        defaults[feature] = "__MISSING__"
        continue

    # Convert to string while preserving non-null values
    values = series.dropna().astype(str)

    unique_values = sorted(values.unique().tolist())

    # IMPORTANT:
    # If no values exist, create a deterministic category.
    if len(unique_values) == 0:
        unique_values = ["__MISSING__"]

    vocabularies[feature] = unique_values

    # Most frequent category = safest default
    mode = values.mode()

    if len(mode) > 0:
        defaults[feature] = str(mode.iloc[0])
    else:
        defaults[feature] = unique_values[0]

    print(
        f"{feature}: "
        f"{len(unique_values)} categories, "
        f"default={defaults[feature]!r}"
    )



numeric_defaults = {}

all_columns = list(dict.fromkeys(
    list(transactions.columns) +
    list(identity.columns)
))

for feature in feature_columns:

    if feature in categorical_features:
        continue

    if feature in transactions.columns:

        series = pd.to_numeric(
            transactions[feature],
            errors="coerce"
        )

    elif feature in identity.columns:

        series = pd.to_numeric(
            identity[feature],
            errors="coerce"
        )

    else:
        numeric_defaults[feature] = 0.0
        continue

    median = series.median()

    if pd.isna(median):
        median = 0.0

    numeric_defaults[feature] = float(median)


artifact = {
    "feature_columns": feature_columns,
    "categorical_features": categorical_features,
    "categorical_vocabularies": vocabularies,
    "categorical_defaults": defaults,
    "numeric_defaults": numeric_defaults,
}

with open(OUTPUT, "wb") as f:
    pickle.dump(artifact, f)

print()
print("=" * 60)
print("INFERENCE ARTIFACT CREATED")
print("=" * 60)
print("Path:", OUTPUT)
print("Features:", len(feature_columns))
print("Categorical:", len(categorical_features))
print("Vocabularies:", len(vocabularies))