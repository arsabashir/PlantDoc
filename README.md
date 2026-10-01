🌿 PlantDoc
Upload a photo of a plant leaf and get an instant disease diagnosis with plain-language treatment advice.
Live demo: https://plant-doc-nu.vercel.app
How it works
Model: EfficientNetB0 (transfer learning, TensorFlow/Keras), 97.5% validation accuracy
Backend: Python (backend.py) serves predictions
Advice: Gemini API explains the disease and how to treat it
Frontend: Web UI in frontend/, deployed on Vercel
Deployment: Dockerized backend
Run locally
git clone https://github.com/arsabashir/PlantDoc.git
cd PlantDoc
pip install -r requirements.txt
export GEMINI_API_KEY=your_key_here
python backend.py
