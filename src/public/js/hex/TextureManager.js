/**
 * Texture Manager for Hex Grid
 * Handles loading and managing textures for different biomes
 */

import * as THREE from 'three';

class TextureManager {
    constructor() {
        // Map of biome indices to texture paths based on the chunk data
        this.biomeTextureMap = {
            0: '/assets/textures/grass.png', // Plains (lower elevations)
            1: '/assets/textures/rock.png',  // Forest (medium elevations)
            2: '/assets/textures/mud.png',   // Desert (medium-high elevations)
            3: '/assets/textures/snow.png',  // Mountain (higher elevations)
            4: '/assets/textures/sand.png',   // Not used in current chunk data
            // Blue is used as a fallback for undefined biomes
            'default': '/assets/textures/blue.png'
        };
        
        // Cache for loaded textures
        this.textureCache = {};
        
        // Texture loader
        this.textureLoader = new THREE.TextureLoader();
    }
    
    /**
     * Get texture paths for specified biome indices
     * @param {Array} biomeIndices - Array of biome indices
     * @returns {Array} Array of texture paths
     */
    getTexturePaths(biomeIndices) {
        return biomeIndices.map(index => {
            // Use default texture if biome index is not in the map
            return this.biomeTextureMap[index] || this.biomeTextureMap[0];
        });
    }
    
    /**
     * Load textures for specified biome indices
     * @param {Array} biomeIndices - Array of biome indices
     * @returns {Promise} Promise that resolves with loaded textures
     */
    loadTextures(biomeIndices) {
        const texturePaths = this.getTexturePaths(biomeIndices);
        const texturePromises = [];
        
        texturePaths.forEach(path => {
            // Check if texture is already cached
            if (this.textureCache[path]) {
                texturePromises.push(Promise.resolve(this.textureCache[path]));
            } else {
                // Load texture and add to cache
                const promise = new Promise((resolve, reject) => {
                    this.textureLoader.load(
                        path,
                        (texture) => {
                            texture.wrapS = THREE.RepeatWrapping;
                            texture.wrapT = THREE.RepeatWrapping;
                            this.textureCache[path] = texture;
                            resolve(texture);
                        },
                        undefined,
                        (error) => {
                            console.error('Error loading texture:', error);
                            reject(error);
                        }
                    );
                });
                
                texturePromises.push(promise);
            }
        });
        
        return Promise.all(texturePromises);
    }
    
    /**
     * Create a mapping from biome indices to atlas indices
     * @param {Array} biomeIndices - Array of unique biome indices in the chunk
     * @returns {Object} Mapping from biome index to atlas index
     */
    createBiomeToAtlasMap(biomeIndices) {
        const map = {};
        
        // Make sure we include the default texture
        if (!biomeIndices.includes('default')) {
            biomeIndices.push('default');
        }
        
        biomeIndices.forEach((biomeIndex, i) => {
            map[biomeIndex] = i;
        });
        
        // Store the default texture index for easy access
        this.defaultTextureIndex = map['default'];
        
        return map;
    }
    
    /**
     * Get the default texture index to use for fallback cases
     * @returns {number} Default texture index
     */
    getDefaultTextureIndex() {
        return this.defaultTextureIndex !== undefined ? this.defaultTextureIndex : 0;
    }
}

export default TextureManager;
