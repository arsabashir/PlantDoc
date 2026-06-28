FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend.py .
COPY class_names.json .
COPY plantdoc_model.keras .

CMD ["uvicorn", "backend:app", "--host", "0.0.0.0", "--port", "8000"]