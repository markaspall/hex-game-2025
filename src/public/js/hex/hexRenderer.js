/**
 * Hex Grid Renderer
 * Uses Three.js to render the hexagonal grid
 */

import * as THREE from 'three';
import HexGenerator from './hexGenerator.js';

class HexRenderer {
    constructor(scene) {
        this.scene = scene;
        this.meshes = [];
        
        // Define biome color map
        this.biomeColors = [
            0x8BC34A, // Light green (grass/plains)
            0x4CAF50, // Medium green (forest)
            0x795548, // Brown (mountains)
            0xFFEB3B  // Yellow (desert)
        ];
        
        // Flag to use debug colors instead of biome colors
        this.useDebugColors = false;
    }

    /**
     * Generate random color 
     * @returns {number} Random color as a number
     */
    getRandomColor() {
        return Math.random() * 0xffffff;
    }

    /**
     * Create a material with a random color
     * @returns {THREE.MeshStandardMaterial} Three.js material
     */
    createRandomMaterial() {
        return new THREE.MeshStandardMaterial({
            color: this.getRandomColor(),
            flatShading: true,
            side: THREE.DoubleSide
        });
    }
    
    /**
     * Create a material based on biome index
     * @param {number} biomeIndex - Index of the biome
     * @returns {THREE.MeshStandardMaterial} Three.js material
     */
    createBiomeMaterial(biomeIndex) {
        // Use debug colors if enabled
        if (this.useDebugColors) {
            return this.createRandomMaterial();
        }
        
        // Ensure biomeIndex is valid
        const colorIndex = biomeIndex < this.biomeColors.length ? biomeIndex : 0;
        
        return new THREE.MeshStandardMaterial({
            color: this.biomeColors[colorIndex],
            flatShading: true,
            side: THREE.DoubleSide
        });
    }

    /**
 * Create a hex face geometry from vertices
 * @param {Array} vertices - Array of vertex coordinates
 * @returns {Array} Array containing positions, indices, and normals
 */
    createHexGeometry(hex, hexGrid) {
        const vertices = hex.vertices;
        const gridCoords = hex.gridCoords;

        const directions = ['N', 'NE', 'SE', 'S', 'SW', 'NW'];

        // Edge vertex map as per cheat sheet
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

        // we need an instance of hexGenerator
        const hexGenerator = new HexGenerator();

        // For flat top hex, the center point is the average of all vertices
        const centerX = vertices.reduce((sum, v) => sum + v[0], 0) / vertices.length;
        const centerY = vertices[0][1]; // All vertices have the same elevation
        const centerZ = vertices.reduce((sum, v) => sum + v[2], 0) / vertices.length;

        // Create arrays for the top face (the hex face itself)
        const positions = [];
        const indices = [];
        const normals = [];
        const uvs = [];

        // Add center point first
        positions.push(centerX, centerY, centerZ);
        normals.push(0, 1, 0); // Top face normal points up
        uvs.push(0.5, 0.5); // Center of UV

        // Debug log initial state
        console.log(`Hex at ${gridCoords[0]},${gridCoords[1]} - Starting geometry creation`);
        console.log(`Initial positions: ${positions.length / 3}, indices: ${indices.length / 3}, normals: ${normals.length / 3}`);

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

            // Create triangles with center point
            if (i < vertices.length - 1) {
                indices.push(0, i + 1, i + 2);
            } else {
                indices.push(0, i + 1, 1);
            }
        }

        // Keep track of processed connections to avoid duplicates
        const processedConnections = new Set();

        // Now create skirts for specific directions
        // We only process SE, S, and SW to avoid duplicate connections
        const skirtDirections = ['SE', 'S', 'SW'];

        for (const direction of skirtDirections) {
            // Debug log - considering a skirt for this direction
            console.log(`Considering skirt for direction ${direction}`);

            const thisHex = hexGrid.find(h => h.gridCoords[0] === gridCoords[0] && h.gridCoords[1] === gridCoords[1]);

            // Get the neighbor hex
            const neighbor = hexGenerator.getNeighbor(thisHex, direction, hexGrid);
            if (!neighbor) {
                console.log(`No neighbor found in direction ${direction} for hex ${gridCoords[0]},${gridCoords[1]}. So no skirt`);
                continue;
            }
            console.log(`Neighbor found in direction ${direction} for hex ${gridCoords[0]},${gridCoords[1]}. So adding skirt`);

            // Get the neighbor hex vertices
            const neighborVertices = neighbor.vertices;

            // Determine the opposite direction
            const neighborDirection = oppositeDirection[direction];

            console.log(`Creating skirt for edge ${direction} (opposite: ${neighborDirection}) between hex ${gridCoords[0]},${gridCoords[1]} and ${neighbor.gridCoords[0]},${neighbor.gridCoords[1]}`);

            // Get the correct edge vertices from the edge map
            const edgeIndex = directions.indexOf(direction);
            const [v1Index, v2Index] = edgeVertexMap[direction];
            const v1 = vertices[v1Index];
            const v2 = vertices[v2Index];

            // Get opposite edge vertices on the neighbor hex
            const [nv1Index, nv2Index] = edgeVertexMap[neighborDirection];
            const nv1 = neighborVertices[nv1Index];
            const nv2 = neighborVertices[nv2Index];

            // Debug log vertex positions
            console.log(`Edge vertex 1: [${v1}], Edge vertex 2: [${v2}]`);
            console.log(`Neighbor edge vertex 1: [${nv1}], Neighbor edge vertex 2: [${nv2}]`);

            // Create the first triangle of the skirt (v1, v2, nv1)
            const firstTriangleBaseIndex = positions.length / 3;

            positions.push(
                v1[0], v1[1], v1[2],
                v2[0], v2[1], v2[2],
                nv1[0], nv1[1], nv1[2]
            );

            indices.push(firstTriangleBaseIndex, firstTriangleBaseIndex + 1, firstTriangleBaseIndex + 2);

            // Add normals and UVs for each vertex of the first triangle
            for (let j = 0; j < 3; j++) {
                normals.push(0, 0, -1); // Face normal points outward
                uvs.push(0.5, 0.5); // Center of UV
            }

            // Create the second triangle of the skirt (v1, nv1, nv2)
            const secondTriangleBaseIndex = positions.length / 3;

            positions.push(
                v1[0], v1[1], v1[2],
                nv1[0], nv1[1], nv1[2],
                nv2[0], nv2[1], nv2[2]
            );

            indices.push(secondTriangleBaseIndex, secondTriangleBaseIndex + 1, secondTriangleBaseIndex + 2);

            // Add normals and UVs for each vertex of the second triangle
            for (let j = 0; j < 3; j++) {
                normals.push(0, 0, -1); // Face normal points outward
                uvs.push(0.5, 0.5); // Center of UV
            }

            // Now create the corner triangle to fill the gap
            // We need to find the next neighbor in the clockwise direction
            const cwDirection = clockwiseDirection[direction];
            const cwNeighbor = hexGenerator.getNeighbor(thisHex, cwDirection, hexGrid);

            if (cwNeighbor) {
                // Create a unique ID for this corner triangle
                const cornerHexIds = [
                    `${gridCoords[0]},${gridCoords[1]}`,
                    `${neighbor.gridCoords[0]},${neighbor.gridCoords[1]}`,
                    `${cwNeighbor.gridCoords[0]},${cwNeighbor.gridCoords[1]}`
                ].sort();
                const cornerTriangleId = `${cornerHexIds[0]}-${cornerHexIds[1]}-${cornerHexIds[2]}`;

                // Skip if already processed
                if (!processedConnections.has(cornerTriangleId)) {
                    processedConnections.add(cornerTriangleId);

                    // Get the clockwise neighbor's opposite direction to our clockwise direction
                    const cwNeighborDirection = oppositeDirection[cwDirection];

                    // Get the first vertex from the clockwise neighbor's opposite edge
                    const [cwv1Index, cwv2Index] = edgeVertexMap[cwNeighborDirection];
                    const cwv2 = cwNeighbor.vertices[cwv2Index];

                    console.log(`Creating corner triangle between current hex, neighbor, and CW neighbor`);

                    // Create the corner triangle (v2, nv1, cwv1)
                    const cornerTriangleBaseIndex = positions.length / 3;

                    positions.push(
                        v2[0], v2[1], v2[2],
                        nv1[0], nv1[1], nv1[2],
                        cwv2[0], cwv2[1], cwv2[2]
                    );

                    indices.push(cornerTriangleBaseIndex, cornerTriangleBaseIndex + 1, cornerTriangleBaseIndex + 2);

                    // Add normals and UVs for each vertex of the corner triangle
                    for (let j = 0; j < 3; j++) {
                        normals.push(0, 1, 0); // Face normal points up like the hex top
                        uvs.push(0.5, 0.5); // Center of UV
                    }

                    console.log(`Added corner triangle successfully`);
                }
            }
        }

        // Final debug log
        console.log(`Final geometry - positions: ${positions.length / 3}, indices: ${indices.length}, normals: ${normals.length / 3}, uvs: ${uvs.length / 2}`);

        return { positions, indices, normals, uvs };
    }

    // /**
    //  * Create a hex face geometry from vertices
    //  * @param {Array} vertices - Array of vertex coordinates
    //  * @returns {Array} Array containing positions, indices, and normals
    //  */
    // createHexGeometry(hex, hexGrid) {

    //     const vertices = hex.vertices;
    //     const gridCoords = hex.gridCoords;

    //     const directions = ['N', 'NE', 'SE', 'S', 'SW', 'NW'];

    //     // we need an instance of hexGenerator
    //     const hexGenerator = new HexGenerator();

    //     // For flat top hex, the center point is the average of all vertices
    //     const centerX = vertices.reduce((sum, v) => sum + v[0], 0) / vertices.length;
    //     const centerY = vertices[0][1]; // All vertices have the same elevation
    //     const centerZ = vertices.reduce((sum, v) => sum + v[2], 0) / vertices.length;

    //     // Create arrays for the top face (the hex face itself)
    //     const positions = [];
    //     const indices = [];
    //     const normals = [];
    //     const uvs = [];

    //     // Add center point first
    //     positions.push(centerX, centerY, centerZ);
    //     normals.push(0, 1, 0); // Top face normal points up
    //     uvs.push(0.5, 0.5); // Center of UV

    //     // Debug log initial state
    //     console.log(`Hex at ${gridCoords[0]},${gridCoords[1]} - Starting geometry creation`);
    //     console.log(`Initial positions: ${positions.length / 3}, indices: ${indices.length / 3}, normals: ${normals.length / 3}`);

    //     // Add vertices
    //     for (let i = 0; i < vertices.length; i++) {
    //         const vertex = vertices[i];
    //         positions.push(vertex[0], vertex[1], vertex[2]);
    //         normals.push(0, 1, 0); // Top face normal points up

    //         // Calculate UV coordinates (map the hex to a circle)
    //         const angle = (Math.PI / 3) * i;
    //         const u = 0.5 + 0.5 * Math.cos(angle);
    //         const v = 0.5 + 0.5 * Math.sin(angle);
    //         uvs.push(u, v);

    //         // Create triangles with center point
    //         if (i < vertices.length - 1) {
    //             indices.push(0, i + 1, i + 2);
    //         } else {
    //             indices.push(0, i + 1, 1);
    //         }

    //         // Debug log after adding the hex triangle
    //         console.log(`After adding hex triangle ${i} with direction ${directions[i]}: positions: ${positions.length / 3}, indices: ${indices.length / 3}, normals: ${normals.length / 3}`);

    //         // We only need skirts for these directions.
    //         if (directions[i] != 'SE' &&
    //             directions[i] != 'S' &&
    //             directions[i] != 'SW') {
    //             continue;
    //         }

    //         // Debug log - considering a skirt for this direction
    //         console.log(`Considering skirt for direction ${directions[i]}`);

    //         const thisHex = hexGrid.find(h => h.gridCoords[0] === gridCoords[0] && h.gridCoords[1] === gridCoords[1]);

    //         // Get the neighbor hex
    //         const neighbor = hexGenerator.getNeighbor(thisHex, directions[i], hexGrid);
    //         if (!neighbor) {
    //             console.log(`No neighbor found in direction ${directions[i]} for hex ${gridCoords[0]},${gridCoords[1]}. So no skirt`);
    //             continue;
    //         }
    //         console.log(`Neighbor found in direction ${directions[i]} for hex ${gridCoords[0]},${gridCoords[1]}. So adding skirt`);

    //         // Get the neighbor hex vertices on it's opposite named edge to the one we are on 
    //         // So if we are on the S of this hex, we need the N of the neighbor
    //         const neighborVertices = neighbor.vertices;

    //         // Determine the opposite direction
    //         let neighborDirection;
    //         switch (directions[i]) {
    //             case 'N': neighborDirection = 'S'; break;
    //             case 'NE': neighborDirection = 'SW'; break;
    //             case 'SE': neighborDirection = 'NW'; break;
    //             case 'S': neighborDirection = 'N'; break;
    //             case 'SW': neighborDirection = 'NE'; break;
    //             case 'NW': neighborDirection = 'SE'; break;
    //         }

    //         console.log(`Creating skirt for edge ${directions[i]} (opposite: ${neighborDirection}) between hex ${gridCoords[0]},${gridCoords[1]} and ${neighbor.gridCoords[0]},${neighbor.gridCoords[1]}`);

    //         // Get the current vertex and the next vertex (for the edge)
    //         const currentVertex = vertices[i];
    //         const nextVertexIndex = (i + 1) % vertices.length;
    //         const nextVertex = vertices[nextVertexIndex];

    //         // Find the corresponding vertices on the neighbor hex
    //         // We need to find the two vertices that form the opposite edge
    //         const dirIndex = directions.indexOf(neighborDirection);
    //         if (dirIndex === -1) {
    //             console.error(`Invalid neighbor direction: ${neighborDirection}`);
    //             continue;
    //         }

    //         const neighborVertex1 = neighborVertices[dirIndex];
    //         const neighborVertex2 = neighborVertices[(dirIndex + 1) % neighborVertices.length];

    //         // Debug log vertex positions
    //         console.log(`Current vertex: [${currentVertex}], Next vertex: [${nextVertex}]`);
    //         console.log(`Neighbor vertex 1: [${neighborVertex1}], Neighbor vertex 2: [${neighborVertex2}]`);

    //         // Create the first triangle of the skirt (current vertex, next vertex, neighbor vertex 1)
    //         // Get the current index (positions array contains x,y,z values, so divide by 3 to get vertex count)
    //         const firstTriangleBaseIndex = positions.length / 3;

    //         // Debug log before adding the first triangle
    //         console.log(`Before first triangle: positions: ${positions.length / 3}, indices: ${indices.length / 3}, normals: ${normals.length / 3}`);

    //         // Add vertices for the first triangle
    //         positions.push(
    //             currentVertex[0], currentVertex[1], currentVertex[2],
    //             nextVertex[0], nextVertex[1], nextVertex[2],
    //             neighborVertex1[0], neighborVertex1[1], neighborVertex1[2]
    //         );

    //         // Add indices for the first triangle
    //         // Since we just added 3 vertices (9 values), their indices are firstTriangleBaseIndex, +1, and +2
    //         indices.push(firstTriangleBaseIndex, firstTriangleBaseIndex + 1, firstTriangleBaseIndex + 2);

    //         // Add normals and UVs for each vertex of the first triangle
    //         for (let j = 0; j < 3; j++) {
    //             normals.push(0, -1, 0); // Bottom face normal points down
    //             uvs.push(0.5, 0.5); // Center of UV
    //         }

    //         // Debug log after adding the first triangle
    //         console.log(`After first triangle: positions: ${positions.length / 3}, indices: ${indices.length / 3}, normals: ${normals.length / 3}`);

    //         // // Create the second triangle of the skirt (next vertex, neighbor vertex 2, neighbor vertex 1)
    //         // // Get the current index for the second triangle
    //         // const secondTriangleBaseIndex = positions.length / 3;

    //         // positions.push(
    //         //     nextVertex[0], nextVertex[1], nextVertex[2],
    //         //     neighborVertex2[0], neighborVertex2[1], neighborVertex2[2],
    //         //     neighborVertex1[0], neighborVertex1[1], neighborVertex1[2]
    //         // );

    //         // // Add indices for the second triangle
    //         // indices.push(secondTriangleBaseIndex, secondTriangleBaseIndex + 1, secondTriangleBaseIndex + 2);

    //         // // Add normals and UVs for each vertex of the second triangle
    //         // for (let j = 0; j < 3; j++) {
    //         //     normals.push(0, -1, 0); // Bottom face normal points down
    //         //     uvs.push(0.5, 0.5); // Center of UV
    //         // }
    //     }

    //     // Final debug log
    //     console.log(`Final geometry - positions: ${positions.length / 3}, indices: ${indices.length}, normals: ${normals.length / 3}, uvs: ${uvs.length / 2}`);

    //     return { positions, indices, normals, uvs };
    // }

    /**
     * Render the hex grid
     * @param {Array} hexGrid - Array of hex data objects
     * @returns {THREE.Group} Group containing all hex meshes
     */
    renderGrid(hexGrid) {
        // Create a group to hold all hex meshes
        const group = new THREE.Group();

        // Create mesh for each hex
        hexGrid.forEach(hex => {
            const material = this.createBiomeMaterial(hex.biomeIndex);
            const mesh = this.createHexMesh(hex, hexGrid, material);
            group.add(mesh);
            this.meshes.push(mesh);
        });

        // Add the group to the scene
        this.scene.add(group);
        return group;
    }

    /**
     * Create a mesh for a single hex
     * @param {Object} hex - Hex data object
     * @param {THREE.Material} material - Material to use for the hex
     * @returns {THREE.Mesh} Mesh representing the hex
     */
    createHexMesh(hex, hexGrid, material) {
        const geometry = new THREE.BufferGeometry();

        // Get face data
        const { positions, indices, normals, uvs } = this.createHexGeometry(hex, hexGrid);
        console.log('number of positions', positions.length);
        console.log('number of indices', indices.length);
        console.log('number of normals', normals.length);
        console.log('number of uvs', uvs.length);

        // Set geometry attributes
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
        geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
        geometry.setIndex(indices);

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
     * Clear all hex meshes from the scene
     */
    clear() {
        this.meshes.forEach(mesh => {
            this.scene.remove(mesh);
            mesh.geometry.dispose();
            mesh.material.dispose();
        });

        this.meshes = [];
    }
}

// Export the class for use in other modules
export default HexRenderer;