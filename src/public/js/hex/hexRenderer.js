/**
 * Hex Grid Renderer
 * Uses Three.js to render the hexagonal grid
 */

import * as THREE from 'three';
import HexGenerator from './hexGenerator.js';
import TerrainShader from './TerrainShader.js';
import TextureManager from './TextureManager.js';

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
        this.useDebugColors = false; // Disabled to use biome-based colors
        
        // Flag to use terrain shader with triplanar texturing
        this.useTerrainShader = false; // Disabled to use solid colors
        
        // Initialize terrain shader and texture manager
        if (this.useTerrainShader) {
            this.terrainShader = new TerrainShader();
            this.textureManager = new TextureManager();
        }
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
            side: THREE.FrontSide // Using single-sided rendering for better performance
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
            side: THREE.FrontSide // Using single-sided rendering for better performance
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
        
        // For texture indices
        const textureIndices = [];

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
        
        // Add texture index for this vertex if using terrain shader
        if (this.useTerrainShader) {
            // Make sure we have a valid biome index
            const biomeIndex = hex.biomeIndex !== undefined ? hex.biomeIndex : 0;
            // Use the atlas map if available, otherwise use the biome index directly
            const textureIndex = this.biomeToAtlasMap ? 
                (this.biomeToAtlasMap[biomeIndex] !== undefined ? this.biomeToAtlasMap[biomeIndex] : 0) : 
                biomeIndex;
            textureIndices.push(textureIndex);
        }

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
            
            // Add texture index for this vertex if using terrain shader
            if (this.useTerrainShader) {
                // Make sure we have a valid biome index
                const biomeIndex = hex.biomeIndex !== undefined ? hex.biomeIndex : 0;
                // Use the atlas map if available, otherwise use the biome index directly
                const textureIndex = this.biomeToAtlasMap ? 
                    (this.biomeToAtlasMap[biomeIndex] !== undefined ? this.biomeToAtlasMap[biomeIndex] : this.textureManager.getDefaultTextureIndex()) : 
                    biomeIndex;
                textureIndices.push(textureIndex);
            }

            // Create triangles with center point - counter-clockwise winding for front face visibility
            if (i < vertices.length - 1) {
                indices.push(0, i + 2, i + 1); // Reversed order for correct winding
            } else {
                indices.push(0, 1, i + 1); // Reversed order for correct winding
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

            // Original winding order for skirt triangles (already correct)
            indices.push(firstTriangleBaseIndex, firstTriangleBaseIndex + 1, firstTriangleBaseIndex + 2);

            // Add normals, UVs, and texture indices for each vertex of the first triangle
            // First triangle vertices: v1, v2, nv1 (first two from current hex, third from neighbor)
            
            // First vertex (v1) from current hex
            normals.push(0, 0, -1); // Face normal points outward
            uvs.push(0.5, 0.5); // Center of UV
            
            if (this.useTerrainShader) {
                // Use current hex's biome
                const biomeIndex1 = hex.biomeIndex !== undefined ? hex.biomeIndex : 0;
                const textureIndex1 = this.biomeToAtlasMap ? 
                    (this.biomeToAtlasMap[biomeIndex1] !== undefined ? this.biomeToAtlasMap[biomeIndex1] : this.textureManager.getDefaultTextureIndex()) : 
                    biomeIndex1;
                textureIndices.push(textureIndex1);
            }
            
            // Second vertex (v2) from current hex
            normals.push(0, 0, -1);
            uvs.push(0.5, 0.5);
            
            if (this.useTerrainShader) {
                // Use current hex's biome
                const biomeIndex2 = hex.biomeIndex !== undefined ? hex.biomeIndex : 0;
                const textureIndex2 = this.biomeToAtlasMap ? 
                    (this.biomeToAtlasMap[biomeIndex2] !== undefined ? this.biomeToAtlasMap[biomeIndex2] : 0) : 
                    biomeIndex2;
                textureIndices.push(textureIndex2);
            }
            
            // Third vertex (nv1) from neighbor hex
            normals.push(0, 0, -1);
            uvs.push(0.5, 0.5);
            
            if (this.useTerrainShader) {
                // Use neighbor hex's biome if it exists, otherwise use default
                const biomeIndex3 = neighbor && neighbor.biomeIndex !== undefined ? neighbor.biomeIndex : 0;
                const textureIndex3 = this.biomeToAtlasMap ? 
                    (this.biomeToAtlasMap[biomeIndex3] !== undefined ? this.biomeToAtlasMap[biomeIndex3] : this.textureManager.getDefaultTextureIndex()) : 
                    biomeIndex3;
                textureIndices.push(textureIndex3);
            }

            // Create the second triangle of the skirt (v1, nv1, nv2)
            const secondTriangleBaseIndex = positions.length / 3;

            positions.push(
                v1[0], v1[1], v1[2],
                nv1[0], nv1[1], nv1[2],
                nv2[0], nv2[1], nv2[2]
            );

            // Original winding order for skirt triangles (already correct)
            indices.push(secondTriangleBaseIndex, secondTriangleBaseIndex + 1, secondTriangleBaseIndex + 2);

            // Add normals, UVs, and texture indices for each vertex of the second triangle
            // Second triangle vertices: v1, nv1, nv2 (first from current hex, other two from neighbor)
            
            // First vertex (v1) from current hex
            normals.push(0, 0, -1); // Face normal points outward
            uvs.push(0.5, 0.5); // Center of UV
            
            if (this.useTerrainShader) {
                // Use current hex's biome
                const biomeIndex1 = hex.biomeIndex !== undefined ? hex.biomeIndex : 0;
                const textureIndex1 = this.biomeToAtlasMap ? 
                    (this.biomeToAtlasMap[biomeIndex1] !== undefined ? this.biomeToAtlasMap[biomeIndex1] : this.textureManager.getDefaultTextureIndex()) : 
                    biomeIndex1;
                textureIndices.push(textureIndex1);
            }
            
            // Second vertex (nv1) from neighbor hex
            normals.push(0, 0, -1);
            uvs.push(0.5, 0.5);
            
            if (this.useTerrainShader) {
                // Use neighbor hex's biome if neighbor exists, otherwise use current hex's biome
                const biomeIndex2 = neighbor && neighbor.biomeIndex !== undefined ? neighbor.biomeIndex : 
                                   (hex.biomeIndex !== undefined ? hex.biomeIndex : 0);
                const textureIndex2 = this.biomeToAtlasMap ? 
                    (this.biomeToAtlasMap[biomeIndex2] !== undefined ? this.biomeToAtlasMap[biomeIndex2] : this.textureManager.getDefaultTextureIndex()) : 
                    biomeIndex2;
                textureIndices.push(textureIndex2);
            }
            
            // Third vertex (nv2) from neighbor hex
            normals.push(0, 0, -1);
            uvs.push(0.5, 0.5);
            
            if (this.useTerrainShader) {
                // Use neighbor hex's biome if it exists, otherwise use default
                const biomeIndex3 = neighbor && neighbor.biomeIndex !== undefined ? neighbor.biomeIndex : 0;
                const textureIndex3 = this.biomeToAtlasMap ? 
                    (this.biomeToAtlasMap[biomeIndex3] !== undefined ? this.biomeToAtlasMap[biomeIndex3] : this.textureManager.getDefaultTextureIndex()) : 
                    biomeIndex3;
                textureIndices.push(textureIndex3);
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

                    // Counter-clockwise winding for front face visibility
                    indices.push(cornerTriangleBaseIndex, cornerTriangleBaseIndex + 2, cornerTriangleBaseIndex + 1);

                    // Add normals, UVs, and texture indices for each vertex of the corner triangle
                    // Each vertex comes from a different hex, so we need to use the correct biome for each
                    
                    // First vertex (v2) is from the current hex
                    normals.push(0, 1, 0); // Face normal points up like the hex top
                    uvs.push(0.5, 0.5); // Center of UV
                    
                    if (this.useTerrainShader) {
                        // Use current hex's biome
                        const biomeIndex1 = hex.biomeIndex !== undefined ? hex.biomeIndex : 0;
                        const textureIndex1 = this.biomeToAtlasMap ? 
                            (this.biomeToAtlasMap[biomeIndex1] !== undefined ? this.biomeToAtlasMap[biomeIndex1] : 0) : 
                            biomeIndex1;
                        textureIndices.push(textureIndex1);
                    }
                    
                    // Second vertex (nv1) is from the neighbor hex
                    normals.push(0, 1, 0);
                    uvs.push(0.5, 0.5);
                    
                    if (this.useTerrainShader) {
                        // Use neighbor hex's biome if it exists, otherwise use current hex's biome
                        const biomeIndex2 = neighbor && neighbor.biomeIndex !== undefined ? neighbor.biomeIndex : 
                                           (hex.biomeIndex !== undefined ? hex.biomeIndex : 0);
                        const textureIndex2 = this.biomeToAtlasMap ? 
                            (this.biomeToAtlasMap[biomeIndex2] !== undefined ? this.biomeToAtlasMap[biomeIndex2] : this.textureManager.getDefaultTextureIndex()) : 
                            biomeIndex2;
                        textureIndices.push(textureIndex2);
                    }
                    
                    // Third vertex (cwv2) is from the clockwise neighbor hex
                    normals.push(0, 1, 0);
                    uvs.push(0.5, 0.5);
                    
                    if (this.useTerrainShader) {
                        // Use clockwise neighbor hex's biome if it exists, otherwise use current hex's biome
                        const biomeIndex3 = cwNeighbor && cwNeighbor.biomeIndex !== undefined ? cwNeighbor.biomeIndex : 
                                           (hex.biomeIndex !== undefined ? hex.biomeIndex : 0);
                        const textureIndex3 = this.biomeToAtlasMap ? 
                            (this.biomeToAtlasMap[biomeIndex3] !== undefined ? this.biomeToAtlasMap[biomeIndex3] : this.textureManager.getDefaultTextureIndex()) : 
                            biomeIndex3;
                        textureIndices.push(textureIndex3);
                    }

                    console.log(`Added corner triangle successfully`);
                }
            }
        }

        // Debug log final state
        console.log(`Final geometry - positions: ${positions.length / 3}, indices: ${indices.length / 3}, normals: ${normals.length / 3}, uvs: ${uvs.length / 2}, textureIndices: ${textureIndices.length}`);

        return { positions, indices, normals, uvs, textureIndices };
    }

    /**
     * Render the hex grid
     * @param {Array} hexGrid - Array of hex data objects
     * @returns {THREE.Group} Group containing all hex meshes
     */
    renderGrid(hexGrid) {
        // Create a group to hold all hex meshes
        const group = new THREE.Group();
        
        // If using terrain shader, prepare the texture atlas
        if (this.useTerrainShader) {
            // Get unique biome indices in this chunk
            const uniqueBiomeIndices = [...new Set(hexGrid.map(hex => hex.biomeIndex))];
            console.log('Unique biome indices in chunk:', uniqueBiomeIndices);
            
            // Create mapping from biome index to atlas index
            this.biomeToAtlasMap = this.textureManager.createBiomeToAtlasMap(uniqueBiomeIndices);
            console.log('Biome to atlas map:', this.biomeToAtlasMap);
            
            // Load textures and create atlas
            this.textureManager.loadTextures(uniqueBiomeIndices)
                .then(textures => {
                    // Create texture atlas
                    const atlas = this.terrainShader.createTextureAtlas(textures);
                    
                    // Update shader parameters
                    this.terrainShader.updateParams({
                        textureAtlas: atlas,
                        textureCount: uniqueBiomeIndices.length,
                        useDebugColors: this.useDebugColors
                    });
                    
                    console.log('Texture atlas created with', uniqueBiomeIndices.length, 'textures');
                })
                .catch(error => {
                    console.error('Failed to load textures:', error);
                    // Fall back to debug colors if texture loading fails
                    this.terrainShader.updateParams({ useDebugColors: true });
                });
        }

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
        const { positions, indices, normals, uvs, textureIndices } = this.createHexGeometry(hex, hexGrid);
        console.log('number of positions', positions.length);
        console.log('number of indices', indices.length);
        console.log('number of normals', normals.length);
        console.log('number of uvs', uvs.length);
        if (this.useTerrainShader) {
            console.log('number of textureIndices', textureIndices.length);
        }

        // Set geometry attributes
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
        geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
        
        // Add texture indices as an attribute if using terrain shader
        if (this.useTerrainShader) {
            geometry.setAttribute('textureIndex', new THREE.Float32BufferAttribute(textureIndices, 1));
        }
        
        geometry.setIndex(indices);

        // Create mesh with appropriate material
        let meshMaterial = material;
        if (this.useTerrainShader) {
            meshMaterial = this.terrainShader.getMaterial();
        }
        
        const mesh = new THREE.Mesh(geometry, meshMaterial);
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