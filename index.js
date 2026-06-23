import {pool} from './src/db/connection.js'
import express from "express"
import dotenv from "dotenv"

dotenv.config()
const app= express();
const port= process.env.PORT || 5000;

app.get('/', (req, res) => {
    res.send('Saludando desde el servidor');
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});