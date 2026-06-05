const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
dotenv.config();

const db = require('./db');
const scanRoute = require('./routes/scans');



const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use('/scan', scanRoute);

app.get('/', (req, res) => {
    res.send('PlantDoc server is running!');
});

app.listen(PORT, () => {
    console.log(`Server started on http://localhost:${PORT}`);
});