const FormData = require('form-data');
const fs = require('fs');
const fetch = require('node-fetch');

const MODEL_SERVICE_URL =
    process.env.MODEL_SERVICE_URL || 'http://localhost:8000';

async function analyzePlant(imagePath) {

    const form = new FormData();
    form.append('image', fs.createReadStream(imagePath));

    console.log("Connecting to model:");
    console.log(`${MODEL_SERVICE_URL}/scan/upload`);

    const response = await fetch(
        `${MODEL_SERVICE_URL}/scan/upload`,
        {
            method: 'POST',
            body: form,
            headers: form.getHeaders()
        }
    );

    if (!response.ok) {

        const body = await response.text();

        throw new Error(
            `Model server returned ${response.status}\n${body}`
        );
    }

    const data = await response.json();

    console.log("Model response:");
    console.log(data);

    return {
        disease: data.disease,
        severity: data.severity,
        treatment: data.treatment,
        plantType: data.plantType,
        confidence: data.confidence
    };
}

module.exports = { analyzePlant };