const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const db = require('../db');
const { analyzePlant } = require('../model');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '../uploads'));
    },
    filename: (req, file, cb) => {
        const uniqueName = Date.now() + '-' + file.originalname;
        cb(null, uniqueName);
    }
});

const upload = multer({ storage });

router.get('/', (req, res) => {
    res.send('Scan route is working!');
});

router.post('/upload', upload.single('image'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({
            error: 'No image uploaded'
        });
    }

    try {
        console.log("========== NEW SCAN ==========");
        console.log("Uploaded file:", req.file.filename);

        const imagePath = req.file.path;

        console.log("Calling Python model...");
        const result = await analyzePlant(imagePath);

        console.log("Python returned:");
        console.log(result);

        db.query(
            `INSERT INTO scans
            (image_scans, disease_name, severity, treatment, plant_type, confidence)
            VALUES (?, ?, ?, ?, ?, ?)`,
            [
                req.file.filename,
                result.disease,
                result.severity,
                result.treatment,
                result.plantType,
                result.confidence
            ],
            (err, data) => {

                if (err) {
                    console.error("========== MYSQL ERROR ==========");
                    console.error(err);

                    return res.status(500).json({
                        stage: "database",
                        code: err.code,
                        message: err.sqlMessage,
                        sql: err.sql
                    });
                }

                console.log("Inserted scan:", data.insertId);

                res.json({
                    message: "Analysis complete!",
                    scan_id: data.insertId,
                    filename: req.file.filename,
                    disease: result.disease,
                    severity: result.severity,
                    treatment: result.treatment,
                    plantType: result.plantType,
                    confidence: result.confidence
                });
            }
        );

    } catch (err) {

        console.error("========== SCAN ERROR ==========");
        console.error(err);

        return res.status(500).json({
            stage: "analysis",
            message: err.message,
            stack: err.stack
        });
    }
});

module.exports = router;