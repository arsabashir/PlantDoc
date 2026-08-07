const FormData = require('form-data');
const fs = require('fs');
const fetch = require('node-fetch');

const MODEL_SERVICE_URL = process.env.MODEL_SERVICE_URL || 'http://localhost:8000';

async function analyzePlant(imagePath) {
    const form = new FormData();
    form.append('image', fs.createReadStream(imagePath));

    const response = await fetch(`${MODEL_SERVICE_URL}/scan/upload`, {
        method: 'POST',
        body: form,
        headers: form.getHeaders()
    });

    if (!response.ok) {
        throw new Error(`Model server error: ${response.statusText}`);
    }

    const data = await response.json();
    return {
        disease: data.disease,
        severity: data.severity,
        treatment: data.treatment,
        plantType: data.plantType,
        confidence: data.confidence
    };
}

module.exports = { analyzePlant };