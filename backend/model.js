const FormData = require('form-data');
const fs = require('fs');
const fetch = require('node-fetch');

async function analyzePlant(imagePath) {
    const form = new FormData();
    form.append('image', fs.createReadStream(imagePath));

    const response = await fetch('http://localhost:8000/scan/upload', {
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