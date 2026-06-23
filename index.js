const express= require('express');
const app= express();
const port= process.env.PORT || 5000;
console.log(port);

app.get('/', (req, res) => {
    res.send('Saludando desde el servidor');
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});