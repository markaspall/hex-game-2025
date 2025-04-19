/**
 * Hex Grid Utilities
 * Provides functions for hex grid navigation and coordinate calculations
 */

import PerturbationUtils from './PerturbationUtils.js';

class HexUtils {
    constructor(gridSize = 16, hexSize = 1, hexGap = 0.1) {
        this.perturbUtils = new PerturbationUtils();
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

        return [newCol, newRow];
    }

    /**
  * Get a neighboring hex in the specified direction
  * @param {Object} hex - Current hex object
  * @param {string} direction - Direction: 'N', 'NE', 'SE', 'S', 'SW', or 'NW'
  * @returns {Object} Neighboring hex object, or null if no neighbor exists
  */
    getNeighbor(hex, direction) {
        const neighborCoords = this.getNeighborCoords(hex.gridCoords, direction);

        const [neighborCol, neighborRow] = neighborCoords;

        // Calculate center position for the neighbor hex
        const colSpacing = this.width * 3 / 4 + this.hexGap;
        const rowSpacing = this.height + this.hexGap;

        const neighborCenterX = neighborCol * colSpacing;
        const neighborCenterZ = neighborRow * rowSpacing + ((neighborCol % 2) * (rowSpacing / 2));

        // Get elevation and generate vertices
        const elevation = this.perturbUtils.getElevation(neighborCenterX, neighborCenterZ);
        const perturbedElevation = this.perturbUtils.perturbY(neighborCenterX, elevation, neighborCenterZ);
        
        // Get base vertices and apply perturbation
        const vertices = this.generateHexVertices(neighborCenterX, neighborCenterZ);

        // Create and return neighbor hex object
        return {
            gridCoords: neighborCoords,
            center: [neighborCenterX, perturbedElevation, neighborCenterZ],
            vertices: vertices,
            elevation: perturbedElevation,
            biomeIndex: Math.floor(elevation * 4), // Simple biome determination
            featureIndex: 0
        };
    }

    /**
     * Generate the vertices for a single flat-topped hexagon in clockwise order
     * @param {number} centerX - world position of hex center x
     * @param {number} centerZ - world position of hex center z
     * @returns {Array} Array of vertex positions [x, y, z]
     */
    generateHexVertices(centerX, centerZ) {
        const vertices = [];
        for (let i = 0; i < 6; i++) {
            const vertex = this.getHexVertex(centerX, centerZ, i);
            vertices.push(vertex);
        }
        return vertices;
    }

    /**
     * Get the vertex coordinates for a specific vertex of the hexagon
     * @param {number} centerX - world position of hex center x
     * @param {number} centerZ - world position of hex center z
     * @param {number} i - Index of the vertex (0-5)
     * @returns {Array} Array of vertex coordinates [x, y, z]
     */
    getHexVertex(centerX, centerZ, i) {
        const angles = [0, 60, 120, 180, 240, 300];
        const angle = (Math.PI / 180) * angles[i];

        // Calculate base vertex position
        const x = centerX + this.effectiveSize * Math.cos(angle);
        const z = centerZ + this.effectiveSize * Math.sin(angle);

        const [px, pz] = this.perturbUtils.perturbXZ(x, z);

        const py = this.perturbUtils.getElevation(centerX, centerZ);
        const perturbedElevation = this.perturbUtils.perturbY(centerX, py, centerZ);

        return [px, perturbedElevation, pz];
    }

    /**
     * Get direction maps for mesh generation
     * @returns {Object} Object containing directions, edgeVertexMap, oppositeDirection, and clockwiseDirection
     */
    getDirectionMaps() {
        // Direction maps for mesh generation
        const directions = ['N', 'NE', 'SE', 'S', 'SW', 'NW'];

        // Edge vertex map
        const edgeVertexMap = {
            'N': [4, 5],  // North: between top-left and top-right
            'NE': [5, 0], // Northeast: between top-right and right
            'SE': [0, 1], // Southeast: between right and bottom-right
            'S': [1, 2],  // South: between bottom-right and bottom-left
            'SW': [2, 3], // Southwest: between bottom-left and left
            'NW': [3, 4]  // Northwest: between left and top-left
        };

        // Opposite direction map
        const oppositeDirection = {
            'N': 'S',
            'NE': 'SW',
            'SE': 'NW',
            'S': 'N',
            'SW': 'NE',
            'NW': 'SE'
        };

        // Clockwise direction map (next direction clockwise)
        const clockwiseDirection = {
            'N': 'NE',
            'NE': 'SE',
            'SE': 'S',
            'S': 'SW',
            'SW': 'NW',
            'NW': 'N'
        };

        return { directions, edgeVertexMap, oppositeDirection, clockwiseDirection };
    }
}

export default HexUtils;
