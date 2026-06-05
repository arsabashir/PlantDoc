const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const db = require('../db');
const { analyzePlant } = require('../gemini');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '../uploads'));
    },
    filename: (req, file, cb) => {
        const uniqueName = Date.now() + '-' + file.originalname;
        cb(null, uniqueName);
    }
});
const upload = multer({ storage});

router.get('/', (req, res) => {
    res.send('Scan route is working!');
});

router.post('/upload', upload.single('image'), async(req, res) => {
    if (!req.file) {
        return res.status(400).json({error: 'No image uploaded'});
    }

    try {
        const imagePath = req.file.path;
        const result = await analyzePlant(imagePath);

        db.query(
            'INSERT INTO scans (image_scans, disease_name, severity, treatment) VALUES (?, ?, ?, ?)',
            [req.file.filename, result.disease, result.severity, result.treatment],
            (err, data) => {
                if (err) {
                    return res.status(500).json({error: 'Database error', details: err});
                }
                res.json({
                    message: 'Analysis complete!',
                    scan_id: data.insertId,
                    filename: req.file.filename,
                    disease: result.disease,
                    severity: result.severity,
                    treatment: result.treatment
                });
            }
        );
    } catch (err) {
        res.status(500).json({error: 'AI analyis failed', details: err.message});
    }
    });
module.exports = router;