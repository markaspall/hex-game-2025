/**
 * Terrain Shader for Hex Grid
 * Implements triplanar texturing similar to Unity's approach
 * Uses a texture atlas for efficient rendering
 */

import * as THREE from 'three';

class TerrainShader {
    constructor() {
        // Default parameters
        this.params = {
            scale: 2.0,            // Increase scale to make textures more visible
            blendSharpness: 2.0,    // Increase sharpness for more defined transitions
            useDebugColors: false   // Disable debug colors to show textures
        };

        // Initialize shader materials
        this.initShaders();
    }

    /**
     * Initialize shader materials
     */
    initShaders() {
        // Vertex shader - handles position, normal, and passing texture indices
        const vertexShader = `
            // Attributes passed from geometry
            attribute float textureIndex;
            
            // Variables passed to fragment shader
            varying vec3 vPosition;
            varying vec3 vNormal;
            varying float vTextureIndex;
            
            void main() {
                // Pass values to fragment shader
                vPosition = position;
                vNormal = normalize(normalMatrix * normal);
                
                // Pass the texture index directly without interpolation
                // This ensures clean boundaries between different textures
                vTextureIndex = textureIndex;
                
                // Standard vertex transformation
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `;

        // Fragment shader - implements triplanar texturing with atlas
        const fragmentShader = `
            uniform sampler2D textureAtlas;
            uniform float textureCount;
            uniform float scale;
            uniform float blendSharpness;
            uniform bool useDebugColors;
            
            // Variables from vertex shader
            varying vec3 vPosition;
            varying vec3 vNormal;
            varying float vTextureIndex;
            
            // Sample texture using triplanar mapping with atlas
            vec4 sampleTriplanar(vec3 position, vec3 normal, float textureIndex) {
                // Round the texture index to the nearest integer to prevent interpolation between textures
                // This ensures clean boundaries between different biomes
                float roundedIndex = floor(textureIndex + 0.5);
                
                // Calculate blend weights based on normal
                vec3 blend = abs(normal);
                
                // Apply blending sharpness - higher values create sharper transitions
                blend = pow(blend, vec3(blendSharpness));
                blend /= (blend.x + blend.y + blend.z);
                
                // Scale the position for texture sampling
                vec3 scaledPos = position * scale;
                
                // Calculate UV offset for the texture in the atlas using the rounded index
                float vOffset = roundedIndex / textureCount;
                float vScale = 1.0 / textureCount;
                
                // Sample texture from three directions with correct atlas offset
                // XZ plane (top-down view) - most important for terrain
                vec2 yUV = vec2(scaledPos.x, scaledPos.z);
                yUV.y = (yUV.y * vScale) + vOffset;
                vec4 yTexture = texture2D(textureAtlas, yUV);
                
                // YZ plane (side view)
                vec2 xUV = vec2(scaledPos.z, scaledPos.y);
                xUV.y = (xUV.y * vScale) + vOffset;
                vec4 xTexture = texture2D(textureAtlas, xUV);
                
                // XY plane (front view)
                vec2 zUV = vec2(scaledPos.x, scaledPos.y);
                zUV.y = (zUV.y * vScale) + vOffset;
                vec4 zTexture = texture2D(textureAtlas, zUV);
                
                // Blend the results
                return xTexture * blend.x + yTexture * blend.y + zTexture * blend.z;
            }
            
            void main() {
                if (useDebugColors) {
                    // Use debug coloring based on position
                    float colorValue = abs(floor(vPosition.x * 7.0 + vPosition.z * 13.0));
                    int colorIndex = int(mod(colorValue, 8.0));
                    
                    if (colorIndex == 0) {
                        gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0); // Red
                    } else if (colorIndex == 1) {
                        gl_FragColor = vec4(0.0, 1.0, 0.0, 1.0); // Green
                    } else if (colorIndex == 2) {
                        gl_FragColor = vec4(0.0, 0.0, 1.0, 1.0); // Blue
                    } else if (colorIndex == 3) {
                        gl_FragColor = vec4(1.0, 1.0, 0.0, 1.0); // Yellow
                    } else if (colorIndex == 4) {
                        gl_FragColor = vec4(1.0, 0.0, 1.0, 1.0); // Magenta
                    } else if (colorIndex == 5) {
                        gl_FragColor = vec4(0.0, 1.0, 1.0, 1.0); // Cyan
                    } else if (colorIndex == 6) {
                        gl_FragColor = vec4(0.5, 0.0, 0.5, 1.0); // Purple
                    } else {
                        gl_FragColor = vec4(1.0, 0.5, 0.0, 1.0); // Orange
                    }
                } else {
                    // Round the texture index to ensure clean texture boundaries
                    float roundedIndex = floor(vTextureIndex + 0.5);
                    
                    // Sample using triplanar mapping with the atlas and the rounded index
                    vec4 color = sampleTriplanar(vPosition, vNormal, roundedIndex);
                    gl_FragColor = color;
                }
            }
        `;

        // Create the shader material
        this.material = new THREE.ShaderMaterial({
            uniforms: {
                textureAtlas: { value: null },
                textureCount: { value: 1.0 },
                scale: { value: this.params.scale },
                blendSharpness: { value: this.params.blendSharpness },
                useDebugColors: { value: this.params.useDebugColors }
            },
            vertexShader: vertexShader,
            fragmentShader: fragmentShader,
            side: THREE.FrontSide // Using single-sided rendering for better performance
        });
    }

    /**
     * Create a texture atlas from an array of textures
     * @param {Array} textures - Array of loaded THREE.Texture objects
     * @returns {THREE.Texture} The combined texture atlas
     */
    createTextureAtlas(textures) {
        // Determine atlas size based on number and size of textures
        // For simplicity, we'll assume all textures are the same size
        const textureSize = textures[0].image.width;
        const atlasWidth = textureSize;
        const atlasHeight = textureSize * textures.length;
        
        // Create a canvas to combine textures
        const canvas = document.createElement('canvas');
        canvas.width = atlasWidth;
        canvas.height = atlasHeight;
        const ctx = canvas.getContext('2d');
        
        // Draw each texture into the canvas
        textures.forEach((texture, i) => {
            // Create a temporary canvas to draw the texture
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = textureSize;
            tempCanvas.height = textureSize;
            const tempCtx = tempCanvas.getContext('2d');
            tempCtx.drawImage(texture.image, 0, 0);
            
            // Draw the texture into the atlas
            ctx.drawImage(tempCanvas, 0, i * textureSize);
        });
        
        // Create a Three.js texture from the canvas
        const atlasTexture = new THREE.CanvasTexture(canvas);
        atlasTexture.wrapS = THREE.RepeatWrapping;
        atlasTexture.wrapT = THREE.RepeatWrapping;
        
        return atlasTexture;
    }

    /**
     * Load textures and create atlas
     * @param {Array} textureUrls - Array of texture URLs to load
     * @returns {Promise} Promise that resolves when atlas is created
     */
    loadTextures(textureUrls) {
        return new Promise((resolve, reject) => {
            const textureLoader = new THREE.TextureLoader();
            const textures = [];
            let loadedCount = 0;

            textureUrls.forEach((url, index) => {
                textureLoader.load(
                    url,
                    (texture) => {
                        textures[index] = texture;
                        loadedCount++;
                        
                        if (loadedCount === textureUrls.length) {
                            // All textures loaded, create atlas
                            const atlas = this.createTextureAtlas(textures);
                            
                            // Update the shader uniforms
                            this.material.uniforms.textureAtlas.value = atlas;
                            this.material.uniforms.textureCount.value = textureUrls.length;
                            
                            resolve(atlas);
                        }
                    },
                    undefined,
                    (error) => {
                        console.error('Error loading texture:', error);
                        reject(error);
                    }
                );
            });
        });
    }

    /**
     * Update shader parameters
     * @param {Object} params - New parameters
     */
    updateParams(params) {
        this.params = { ...this.params, ...params };
        
        // Update shader uniforms
        this.material.uniforms.scale.value = this.params.scale;
        this.material.uniforms.blendSharpness.value = this.params.blendSharpness;
        this.material.uniforms.useDebugColors.value = this.params.useDebugColors;
        
        // Update texture atlas if provided
        if (params.textureAtlas) {
            this.material.uniforms.textureAtlas.value = params.textureAtlas;
        }
        
        // Update texture count if provided
        if (params.textureCount) {
            this.material.uniforms.textureCount.value = params.textureCount;
        }
    }

    /**
     * Get the shader material
     * @returns {THREE.ShaderMaterial} The shader material
     */
    getMaterial() {
        return this.material;
    }
}

export default TerrainShader;
