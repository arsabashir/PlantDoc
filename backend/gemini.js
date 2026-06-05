const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const dotenv = require('dotenv');

dotenv.config();


const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function analyzePlant(imagePath) {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash', generationConfig:{temperature: 0} });

  const imageData = fs.readFileSync(imagePath);
  const base64Image = imageData.toString('base64');

  const prompt = `You are a plant disease expert. Analyze this plant leaf image and provide: 1. Disease name (or Healthy if no disease) 2. Severity (Mild/Moderate/Severe or None if healthy) 3. Treatment recommendation. Reply in this exact JSON format: {"disease": "disease name here", "severity": "severity here", "treatment": "treatment details here"}`;

  const result = await model.generateContent([
    prompt,
    {
      inlineData: {
        mimeType: 'image/jpeg',
        data: base64Image
      }
    }
  ]);

  const text = result.response.text();
console.log('Gemini raw response:', text);
const jsonMatch = text.match(/\{[\s\S]*\}/);
if (!jsonMatch) throw new Error('No JSON found in response');
return JSON.parse(jsonMatch[0]);
}

module.exports = { analyzePlant };