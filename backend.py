"""
PlantDoc — FastAPI backend
Run: uvicorn backend:app --reload --port 3000

Expects in the same directory:
  - plantdoc_model.keras   (from Kaggle output)
  - class_names.json       (from Kaggle output)
"""

import json, io, re
from pathlib import Path

import numpy as np
from PIL import Image

import tensorflow as tf
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# ── Load model + labels ────────────────────────────────────────────────────────
MODEL_PATH  = Path("plantdoc_model.keras")
LABELS_PATH = Path("class_names.json")

if not MODEL_PATH.exists():
    raise FileNotFoundError(f"Model not found at {MODEL_PATH}. Download from Kaggle output.")
if not LABELS_PATH.exists():
    raise FileNotFoundError(f"class_names.json not found. Download from Kaggle output.")

print("Loading model...")
model = tf.keras.models.load_model(MODEL_PATH)
CLASS_NAMES: list[str] = json.loads(LABELS_PATH.read_text())
IMG_SIZE = 160
print(f"Model loaded — {len(CLASS_NAMES)} classes")

# ── Label parsing helpers ──────────────────────────────────────────────────────
# PlantVillage class names look like: "Tomato___Early_blight", "Apple___healthy"
def parse_class(label: str) -> tuple[str, str]:
    """Returns (plant, disease) from a PlantVillage label."""
    parts = label.split("___")
    plant   = parts[0].replace("_", " ").title() if len(parts) > 0 else "Unknown"
    disease = parts[1].replace("_", " ").title() if len(parts) > 1 else "Unknown"
    return plant, disease

def get_severity(disease: str) -> str:
    disease_lower = disease.lower()
    if "healthy" in disease_lower:
        return "None"
    severe_keywords = ["blight", "rot", "mosaic", "curl", "canker", "scab", "mildew"]
    mild_keywords   = ["spot", "rust", "leaf"]
    if any(k in disease_lower for k in severe_keywords):
        return "Severe" if "late" in disease_lower or "early" in disease_lower else "Moderate"
    if any(k in disease_lower for k in mild_keywords):
        return "Mild"
    return "Moderate"

TREATMENTS: dict[str, str] = {
    "healthy": "No treatment needed. Your plant looks healthy! Maintain regular watering and nutrition.",
    "early blight": "Remove affected leaves. Apply copper-based fungicide every 7–10 days. Avoid overhead watering.",
    "late blight": "Act fast — this spreads quickly. Remove all affected tissue. Apply chlorothalonil or mancozeb fungicide. Improve air circulation.",
    "leaf mold": "Reduce humidity and improve ventilation. Apply fungicide containing copper or mancozeb.",
    "septoria leaf spot": "Remove infected leaves immediately. Apply fungicide. Mulch around base to prevent soil splash.",
    "spider mites": "Spray with water to dislodge mites. Apply neem oil or insecticidal soap. Increase humidity.",
    "target spot": "Remove infected debris. Apply fungicide with azoxystrobin or pyraclostrobin.",
    "mosaic virus": "No cure — remove and destroy infected plants to prevent spread. Control aphids (common vector).",
    "yellow leaf curl": "Control whitefly populations. Remove infected plants. Use reflective mulch to deter insects.",
    "bacterial spot": "Apply copper-based bactericide. Avoid overhead irrigation. Remove heavily infected leaves.",
    "powdery mildew": "Apply sulfur-based fungicide or neem oil. Ensure good air circulation. Avoid wetting leaves.",
    "rust": "Apply fungicide with tebuconazole or propiconazole. Remove infected leaves and destroy them.",
    "black rot": "Prune infected areas with sterilised tools. Apply copper fungicide. Avoid injuring plants.",
    "esca": "Prune back to healthy wood. Seal pruning wounds. No chemical cure — prevention is key.",
    "haunglongbing": "No cure. Remove infected trees. Control psyllid insects with insecticides.",
    "common rust": "Apply fungicide early. Use resistant varieties in future plantings.",
    "grey leaf spot": "Apply strobilurin fungicide. Rotate crops. Remove crop residue after harvest.",
    "northern leaf blight": "Apply fungicide at first sign. Rotate crops. Use resistant hybrids.",
    "apple scab": "Apply fungicide during wet periods. Rake and destroy fallen leaves. Prune for air flow.",
    "cedar apple rust": "Apply myclobutanil fungicide. Remove nearby juniper trees if possible.",
    "cherry powdery mildew": "Apply sulfur or potassium bicarbonate. Prune to open canopy for airflow.",
    "corn cercospora": "Apply fungicide. Rotate crops. Use certified disease-free seed.",
    "grape leaf blight": "Apply mancozeb or copper fungicide. Prune infected canes. Improve row spacing.",
    "peach bacterial spot": "Apply copper bactericide in spring. Avoid overhead irrigation. Select resistant varieties.",
    "pepper bacterial spot": "Use disease-free seed. Apply copper fungicide. Rotate crops annually.",
    "potato late blight": "Destroy infected plants. Apply chlorothalonil. Do not compost infected material.",
    "strawberry leaf scorch": "Remove infected leaves. Apply myclobutanil fungicide. Renovate planting after harvest.",
    "squash powdery mildew": "Apply neem oil or potassium bicarbonate. Water at soil level only.",
}

def get_treatment(disease: str) -> str:
    disease_lower = disease.lower()
    for keyword, treatment in TREATMENTS.items():
        if keyword in disease_lower:
            return treatment
    if "healthy" in disease_lower:
        return TREATMENTS["healthy"]
    return (
        f"Consult a local agronomist for '{disease}'. General advice: isolate the plant, "
        "remove visibly affected leaves, and monitor for spread."
    )

# ── FastAPI app ────────────────────────────────────────────────────────────────
app = FastAPI(title="PlantDoc API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],     # tighten this in production
    allow_methods=["*"],
    allow_headers=["*"],
)

class ScanResult(BaseModel):
    disease:    str
    plantType:  str
    severity:   str
    treatment:  str
    confidence: float
    topPredictions: list[dict]

@app.get("/")
def root():
    return {"status": "ok", "classes": len(CLASS_NAMES)}

@app.post("/scan/upload", response_model=ScanResult)
async def scan_upload(image: UploadFile = File(...)):
    # Validate file type
    if not image.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image.")

    # Read + preprocess
    raw = await image.read()
    try:
        img = Image.open(io.BytesIO(raw)).convert("RGB")
        img = img.resize((IMG_SIZE, IMG_SIZE))
    except Exception:
        raise HTTPException(status_code=400, detail="Could not read image file.")

    arr  = np.array(img, dtype=np.float32)          # EfficientNet wants [0, 255]
    arr  = np.expand_dims(arr, 0)                    # (1, 224, 224, 3)

    preds = model.predict(arr, verbose=0)[0]          # (num_classes,)

    top3_idx = preds.argsort()[-3:][::-1]
    top3 = [
        {"label": CLASS_NAMES[i], "confidence": round(float(preds[i]) * 100, 1)}
        for i in top3_idx
    ]

    best_label = CLASS_NAMES[top3_idx[0]]
    confidence = round(float(preds[top3_idx[0]]) * 100, 1)

    plant, disease = parse_class(best_label)
    severity       = get_severity(disease)
    treatment      = get_treatment(disease)

    return ScanResult(
        disease        = disease,
        plantType      = plant,
        severity       = severity,
        treatment      = treatment,
        confidence     = confidence,
        topPredictions = top3,
    )
