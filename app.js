const dotenv = require('dotenv');
dotenv.config();
const express = require('express');
const cors = require('cors');
require('./db');

const app = express();
app.use(cors());
app.use(express.json());

const produtosRoutes = require('./routes/produtos');
app.use('/produtos', produtosRoutes);

module.exports = app;