/**
 * Hex Game Server
 * Express.js server to serve the game and assets
 */

const express = require('express');
const path = require('path');
const fs = require('fs');

// Create Express app
const app = express();
const port = process.env.PORT || 3000;

// Set up EJS as the view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/assets', express.static(path.join(__dirname, '..', 'assets')));

// Serve node_modules for client-side imports
app.use('/node_modules', express.static(path.join(__dirname, '..', 'node_modules')));

// Routes
app.get('/', (req, res) => {
    res.render('index', {
        title: 'Hex Game 2025',
        description: 'A 3D hexagonal terrain game engine with AI-generated content.'
    });
});

// Game route with parameters
app.get('/game', (req, res) => {
    // Get parameters with defaults
    const gridSize = parseInt(req.query.gridSize) || 16;
    const hexSize = parseFloat(req.query.hexSize) || 1.0;
    const hexGap = parseFloat(req.query.hexGap) || 0.1;
    
    res.render('game', {
        title: 'Hex Game 2025',
        gridSize,
        hexSize,
        hexGap
    });
});

// Start server
app.listen(port, () => {
    console.log(`Hex Game server running at http://localhost:${port}`);
});