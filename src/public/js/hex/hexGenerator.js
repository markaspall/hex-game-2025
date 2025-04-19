/**
 * Hex Grid Generator
 * Creates the data structure for a flat-topped hexagonal grid
 * and handles mesh generation
 */

import * as THREE from 'three';
import HexUtils from '../utils/HexUtils.js';
import PerturbationUtils from '../utils/PerturbationUtils.js';

class HexGenerator {
    constructor(gridSize = 16, hexSize = 1, hexGap = 0.1) {
        // Initialize utility classes
        this.hexUtils = new HexUtils(gridSize, hexSize, hexGap);
        this.perturbUtils = new PerturbationUtils();

        // Store grid parameters
        this.gridSize = gridSize;
        this.hexSize = hexSize;
        this.hexGap = hexGap;

        // Get hex dimensions from hexUtils
        this.effectiveSize = this.hexUtils.effectiveSize;
        this.width = this.hexUtils.width;
        this.height = this.hexUtils.height;
    }

    /**
     * Render hex grid data
     * @param {THREE.Scene} scene - Scene to render the grid into
     * @returns {THREE.Group} Group of hex meshes
     */
    renderGrid(scene) {
        // Create a group to hold all hex meshes
        const group = new THREE.Group();
        const meshes = [];

        // Define biome color map
        const biomeColors = [
            0x8BC34A, // Light green (grass/plains)
            0x4CAF50, // Medium green (forest)
            0x795548, // Brown (mountains)
            0xFFEB3B  // Yellow (desert)
        ];

        // For flat-topped hexagons
        // Width is 2 * size, height is sqrt(3) * size
        const hexWidth = 2 * this.effectiveSize;
        const hexHeight = Math.sqrt(3) * this.effectiveSize;

        // Calculate spacing with gaps
        const colSpacing = hexWidth * 3 / 4 + this.hexGap;  // Horizontal distance between hex centers
        const rowSpacing = hexHeight + this.hexGap;       // Vertical distance between hex centers

        // Get direction maps from hexUtils
        const { directions, edgeVertexMap, oppositeDirection, clockwiseDirection } = this.hexUtils.getDirectionMaps();

        // Generate hexes and meshes
        for (let row = 0; row < this.gridSize; row++) {
            for (let col = 0; col < this.gridSize; col++) {
                // Calculate center position for this hex with proper spacing
                // For flat-topped hex grid, odd columns are offset vertically
                const centerX = col * colSpacing;
                const centerZ = row * rowSpacing + ((col % 2) * (rowSpacing / 2));

                // Get elevation from perlin noise
                const elevation = this.perturbUtils.getElevation(centerX, centerZ);                
                const perturbedElevation = this.perturbUtils.perturbY(centerX, elevation, centerZ);

                // Generate vertices for this hex
                const vertices = this.hexUtils.generateHexVertices(centerX, centerZ);

                // Determine biome index based on elevation
                const biomeIndex = this.perturbUtils.getBiomeIndex(perturbedElevation, biomeColors.length);
                const featureIndex = 0;

                // Create hex object with necessary data
                const hex = {
                    gridCoords: [col, row],
                    center: [centerX, perturbedElevation, centerZ],
                    vertices: vertices,
                    elevation: perturbedElevation,
                    biomeIndex: biomeIndex,
                    featureIndex: featureIndex
                };

                // Create mesh for this hex
                const mesh = this.createHexMesh(hex, directions, edgeVertexMap, oppositeDirection, clockwiseDirection, biomeColors);
                group.add(mesh);
                meshes.push(mesh);
            }
        }

        // Add the group to the scene
        scene.add(group);
        return group;
    }

    /**
     * Create a hex face geometry from vertices
     * @param {Object} hex - Hex data object
     * @param {Array} directions - Array of direction strings
     * @param {Object} edgeVertexMap - Mapping of directions to vertex indices
     * @param {Object} oppositeDirection - Mapping of directions to their opposites
     * @param {Object} clockwiseDirection - Mapping of directions to their clockwise neighbors
     * @param {Array} biomeColors - Array of biome colors
     * @returns {THREE.Mesh} Mesh representing the hex
     */
    createHexMesh(hex, directions, edgeVertexMap, oppositeDirection, clockwiseDirection, biomeColors) {
        const geometry = new THREE.BufferGeometry();

        // Get face data
        const { positions, indices, normals, uvs } = this.createHexGeometry(hex, directions, edgeVertexMap, oppositeDirection, clockwiseDirection);

        // Set geometry attributes
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
        geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
        geometry.setIndex(indices);

        // Create material based on biome index
        const colorIndex = hex.biomeIndex < biomeColors.length ? hex.biomeIndex : 0;
        const material = new THREE.MeshStandardMaterial({
            color: biomeColors[colorIndex],
            flatShading: true,
            side: THREE.FrontSide
        });

        // Create mesh
        const mesh = new THREE.Mesh(geometry, material);
        mesh.userData = {
            gridCoords: hex.gridCoords,
            elevation: hex.elevation,
            biomeIndex: hex.biomeIndex,
            featureIndex: hex.featureIndex
        };

        return mesh;
    }

    /**
     * Create a hex face geometry from vertices
     * @param {Object} hex - Hex data object
     * @param {Array} directions - Array of direction strings
     * @param {Object} edgeVertexMap - Mapping of directions to vertex indices
     * @param {Object} oppositeDirection - Mapping of directions to their opposites
     * @param {Object} clockwiseDirection - Mapping of directions to their clockwise neighbors
     * @returns {Object} Object containing positions, indices, normals, and uvs
     */
    createHexGeometry(hex, directions, edgeVertexMap, oppositeDirection, clockwiseDirection) {
        const vertices = hex.vertices;
        const center = hex.center;

        // For flat top hex, the center point is the average of all vertices
        const centerX = center[0];
        const centerY = center[1];
        const centerZ = center[2];

        // Create arrays for the top face (the hex face itself)
        const positions = [];
        const indices = [];
        const normals = [];
        const uvs = [];

        // Add center point first
        // Note: vertices[0][1] is a hack that will bite me later
        positions.push(centerX, vertices[0][1], centerZ);
        normals.push(0, 1, 0); // Top face normal points up
        uvs.push(0.5, 0.5); // Center of UV

        // Add vertices
        for (let i = 0; i < vertices.length; i++) {
            const vertex = vertices[i];
            positions.push(vertex[0], vertex[1], vertex[2]);
            normals.push(0, 1, 0); // Top face normal points up

            // Calculate UV coordinates (map the hex to a circle)
            const angle = (Math.PI / 3) * i;
            const u = 0.5 + 0.5 * Math.cos(angle);
            const v = 0.5 + 0.5 * Math.sin(angle);
            uvs.push(u, v);

            // Create triangles with center point - counter-clockwise winding for front face visibility
            if (i < vertices.length - 1) {
                indices.push(0, i + 2, i + 1); // Reversed order for correct winding
            } else {
                indices.push(0, 1, i + 1); // Reversed order for correct winding
            }
        }

        // Now create skirts for specific directions
        // We only process SE, S, and SW to avoid duplicate connections
        const skirtDirections = ['SE', 'S', 'SW'];

        for (const direction of skirtDirections) {
            // Get the neighbor hex
            const neighborHex = this.hexUtils.getNeighbor(hex, direction);
            
            // Get neighbor vertices
            const neighborVertices = neighborHex.vertices;

            // Determine the opposite direction
            const neighborDirection = oppositeDirection[direction];

            // Get the correct edge vertices from the edge map
            const [v1Index, v2Index] = edgeVertexMap[direction];
            const v1 = vertices[v1Index];
            const v2 = vertices[v2Index];

            // Get opposite edge vertices on the neighbor hex
            const [nv1Index, nv2Index] = edgeVertexMap[neighborDirection];
            const nv1 = neighborVertices[nv1Index];
            const nv2 = neighborVertices[nv2Index];

            // Create the first triangle of the skirt (v1, v2, nv1)
            const firstTriangleBaseIndex = positions.length / 3;

            positions.push(
                v1[0], v1[1], v1[2],
                v2[0], v2[1], v2[2],
                nv1[0], nv1[1], nv1[2]
            );

            // Original winding order for skirt triangles
            indices.push(firstTriangleBaseIndex, firstTriangleBaseIndex + 1, firstTriangleBaseIndex + 2);

            // Add normals and UVs for each vertex of the first triangle
            // First triangle vertices: v1, v2, nv1 (first two from current hex, third from neighbor)
            normals.push(0, 0, -1, 0, 0, -1, 0, 0, -1); // Face normal points outward
            uvs.push(0.5, 0.5, 0.5, 0.5, 0.5, 0.5); // Center of UV

            // Create the second triangle of the skirt (v1, nv1, nv2)
            const secondTriangleBaseIndex = positions.length / 3;

            positions.push(
                v1[0], v1[1], v1[2],
                nv1[0], nv1[1], nv1[2],
                nv2[0], nv2[1], nv2[2]
            );

            // Original winding order for skirt triangles
            indices.push(secondTriangleBaseIndex, secondTriangleBaseIndex + 1, secondTriangleBaseIndex + 2);

            // Add normals and UVs for each vertex of the second triangle
            normals.push(0, 0, -1, 0, 0, -1, 0, 0, -1); // Face normal points outward
            uvs.push(0.5, 0.5, 0.5, 0.5, 0.5, 0.5); // Center of UV

            // Now create the corner triangle to fill the gap
            // We need to find the next neighbor in the clockwise direction
            const cwDirection = clockwiseDirection[direction];
            const cwNeighborHex = this.hexUtils.getNeighbor(hex, cwDirection);
            
            // Get clockwise neighbor vertices
            const cwNeighborVertices = cwNeighborHex.vertices;

            // Get the clockwise neighbor's opposite direction to our clockwise direction
            const cwNeighborDirection = oppositeDirection[cwDirection];

            // Get the first vertex from the clockwise neighbor's opposite edge
            const [cwv1Index, cwv2Index] = edgeVertexMap[cwNeighborDirection];
            const cwv2 = cwNeighborVertices[cwv2Index];

            // Create the corner triangle (v2, nv1, cwv1)
            const cornerTriangleBaseIndex = positions.length / 3;

            positions.push(
                v2[0], v2[1], v2[2],
                nv1[0], nv1[1], nv1[2],
                cwv2[0], cwv2[1], cwv2[2]
            );

            // Counter-clockwise winding for front face visibility
            indices.push(cornerTriangleBaseIndex, cornerTriangleBaseIndex + 2, cornerTriangleBaseIndex + 1);

            // Add normals and UVs for the corner triangle
            normals.push(0, 1, 0, 0, 1, 0, 0, 1, 0); // Face normal points up like the hex top
            uvs.push(0.5, 0.5, 0.5, 0.5, 0.5, 0.5); // Center of UV
        }

        return { positions, indices, normals, uvs };
    }
}

export default HexGenerator;