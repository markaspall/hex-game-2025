/**
 * Hex Grid Generator
 * Creates the data structure for a flat-topped hexagonal grid
 */

import PerlinNoise from '../utils/noise.js';

class HexGenerator {
    constructor(gridSize = 16, hexSize = 1, hexGap = 0.1) {
        this.gridSize = gridSize;
        this.hexSize = hexSize;
        this.hexGap = hexGap;

        // Calculate hex dimensions with gap
        this.effectiveSize = hexSize - hexGap;

        // Calculate hex metrics
        this.width = this.effectiveSize * 2;
        this.height = Math.sqrt(3) * this.effectiveSize;

        // For flat-top hex, the width is 2*size and height is sqrt(3)*size
        this.horizDistance = this.width * 3 / 4; // Distance between hex centers horizontally
        this.vertDistance = this.height; // Distance between hex centers vertically
        
        // Initialize Perlin noise generator with a random seed
        this.noise = new PerlinNoise(Math.random() * 10000);
        
        // Perturbation settings
        this.perturbationScale = 0.25; // Scale of the perturbation (0-1, where 1 is full hexSize)
        this.noiseScale = 0.2; // Scale of the noise (smaller = more gradual changes)
    }

    /**
 * Get the coordinates of a neighboring hex in the specified direction
 * @param {Array} coords - [col, row] coordinates of the current hex
 * @param {string} direction - Direction: 'N', 'NE', 'SE', 'S', 'SW', or 'NW'
 * @returns {Array} [col, row] coordinates of the neighboring hex, or null if out of bounds
 */
    getNeighborCoords(coords, direction) {
        const [col, row] = coords;
        const isOddColumn = col % 2 === 1;
        let newCol, newRow;

        // Direction vectors for flat-topped hexagons
        // Different for odd and even columns due to the offset
        switch (direction) {
            case 'N':
                newCol = col;
                newRow = row - 1;
                break;
            case 'NE':
                newCol = col + 1;
                newRow = isOddColumn ? row : row - 1;
                break;
            case 'SE':
                newCol = col + 1;
                newRow = isOddColumn ? row + 1 : row;
                break;
            case 'S':
                newCol = col;
                newRow = row + 1;
                break;
            case 'SW':
                newCol = col - 1;
                newRow = isOddColumn ? row + 1 : row;
                break;
            case 'NW':
                newCol = col - 1;
                newRow = isOddColumn ? row : row - 1;
                break;
            default:
                return null;
        }

        // Check if the resulting coordinates are within bounds
        if (newCol < 0 || newCol >= this.gridSize || newRow < 0 || newRow >= this.gridSize) {
            return null;
        }

        return [newCol, newRow];
    }

    /**
     * Get a neighboring hex in the specified direction
     * @param {Object} hex - Current hex object
     * @param {string} direction - Direction: 'N', 'NE', 'SE', 'S', 'SW', or 'NW'
     * @param {Array} hexGrid - The complete hex grid
     * @returns {Object} Neighboring hex object, or null if no neighbor exists
     */
    getNeighbor(hex, direction, hexGrid) {
        const neighborCoords = this.getNeighborCoords(hex.gridCoords, direction);
        if (!neighborCoords) {
            return null;
        }

        // Find the hex with these coordinates in the grid
        return hexGrid.find(h =>
            h.gridCoords[0] === neighborCoords[0] &&
            h.gridCoords[1] === neighborCoords[1]
        );
    }

    /**
     * Get all neighboring hexes
     * @param {Object} hex - Current hex object
     * @param {Array} hexGrid - The complete hex grid
     * @returns {Object} Object with all neighbors, keyed by direction
     */
    getAllNeighbors(hex, hexGrid) {
        const directions = ['N', 'NE', 'SE', 'S', 'SW', 'NW'];
        const neighbors = {};

        directions.forEach(dir => {
            neighbors[dir] = this.getNeighbor(hex, dir, hexGrid);
        });

        return neighbors;
    }

    /**
     * Generate the vertices for a single flat-topped hexagon in clockwise order
     * @param {number} centerX - X coordinate of hex center
     * @param {number} centerY - Y coordinate of hex center
     * @param {number} elevation - Vertical elevation of the hex
     * @returns {Array} Array of vertex positions [x, y, z]
     */
    generateHexVertices(centerX, centerY, elevation = 0) {
        const vertices = [];

        // For a flat-topped hexagon with clockwise ordering
        // 0: right (0°), 1: bottom-right (60°), 2: bottom-left (120°), 
        // 3: left (180°), 4: top-left (240°), 5: top-right (300°)
        const angles = [0, 60, 120, 180, 240, 300];
        
        // Apply perturbation to the center position based on noise
        const centerNoise = this.getPerturbation(centerX, centerY);
        const perturbedCenterX = centerX + centerNoise.x;
        const perturbedCenterY = centerY + centerNoise.z;
        
        // Small vertical variation for the center based on noise
        const centerElevationOffset = this.noise.get(centerX * this.noiseScale * 0.5, centerY * this.noiseScale * 0.5) * 0.2;
        const perturbedElevation = elevation + centerElevationOffset;

        for (let i = 0; i < 6; i++) {
            // Convert degrees to radians
            const angle = (Math.PI / 180) * angles[i];
            
            // Calculate base vertex position
            const baseX = perturbedCenterX + this.effectiveSize * Math.cos(angle);
            const baseZ = perturbedCenterY + this.effectiveSize * Math.sin(angle);
            
            // Get perturbation for this vertex
            const perturbation = this.getPerturbation(baseX, baseZ);
            
            // Apply perturbation to vertex
            const x = baseX + perturbation.x;
            const y = perturbedElevation + perturbation.y; // Y is up in Three.js
            const z = baseZ + perturbation.z;

            vertices.push([x, y, z]);
        }

        return vertices;
    }

    /**
     * Get perturbation vector based on noise at a given position
     * @param {number} x - X coordinate
     * @param {number} z - Z coordinate
     * @returns {Object} Perturbation vector {x, y, z}
     */
    getPerturbation(x, z) {
        // Use different noise coordinates for each axis to avoid symmetry
        const noiseX = this.noise.get(x * this.noiseScale, z * this.noiseScale);
        const noiseY = this.noise.get(x * this.noiseScale + 100, z * this.noiseScale + 100);
        const noiseZ = this.noise.get(x * this.noiseScale + 200, z * this.noiseScale + 200);
        
        // Convert noise from [0,1] to [-1,1] range and scale by perturbation amount
        const maxOffset = this.effectiveSize * this.perturbationScale;
        return {
            x: (noiseX * 2 - 1) * maxOffset,
            y: (noiseY * 2 - 1) * maxOffset * 0.3, // Less vertical variation
            z: (noiseZ * 2 - 1) * maxOffset
        };
    }
    
    /**
     * Generate hex grid data
     * @param {Array} elevationData - Array of elevation values
     * @returns {Array} Array of hex data objects
     */
    generateGrid(elevationData) {
        const hexGrid = [];

        // For flat-topped hexagons
        // Width is 2 * size, height is sqrt(3) * size
        const hexWidth = 2 * this.effectiveSize;
        const hexHeight = Math.sqrt(3) * this.effectiveSize;

        // Calculate spacing with gaps
        const colSpacing = hexWidth * 3 / 4 + this.hexGap;  // Horizontal distance between hex centers
        const rowSpacing = hexHeight + this.hexGap;       // Vertical distance between hex centers

        for (let row = 0; row < this.gridSize; row++) {
            for (let col = 0; col < this.gridSize; col++) {
                // Calculate the index in the elevation data
                const index = row * this.gridSize + col;

                // Get elevation from data or default to 0
                const elevation = elevationData && elevationData[index] ?
                    elevationData[index].heightOffset : 0;

                // Calculate center position for this hex with proper spacing
                // For flat-topped hex grid, odd columns are offset vertically
                const centerX = col * colSpacing;
                const centerY = row * rowSpacing + ((col % 2) * (rowSpacing / 2));

                // Generate vertices for this hex
                const vertices = this.generateHexVertices(centerX, centerY, elevation);

                // Get biome and feature information if available
                const biomeIndex = elevationData && elevationData[index] ?
                    elevationData[index].biomeIndex : 0;
                const featureIndex = elevationData && elevationData[index] ?
                    elevationData[index].featureIndex : 0;

                // Create a hex data object
                hexGrid.push({
                    position: [centerX, elevation, centerY],
                    vertices: vertices,
                    elevation: elevation,
                    gridCoords: [col, row],
                    biomeIndex: biomeIndex,
                    featureIndex: featureIndex
                });
            }
        }

        return hexGrid;
    }

    /**
     * Load elevation data from JSON file
     * @param {Object} jsonData - JSON data object containing hex information
     * @returns {Array} Processed elevation data array
     */
    parseElevationData(jsonData) {
        if (!jsonData || !jsonData.hexes) {
            return [];
        }

        return jsonData.hexes;
    }
}

// Export the class for use in other modules
export default HexGenerator;