/**
 * Perturbation Utilities
 * Provides functions for noise-based terrain perturbation
 */

import PerlinNoise from './noise.js';

class PerturbationUtils {
    constructor(seed = null, perturbationScale = 0.5, noiseScale = 0.1, elevationNoiseScale = 0.025, elevationScale = 12, elevationPerturbationScale = 3.0) {
        // Initialize Perlin noise generator with a random seed if none provided
        this.noise = new PerlinNoise(seed !== null ? seed : Math.random() * 10000);
        
        // Create a second noise generator with a different seed for more variation
        this.secondaryNoise = new PerlinNoise(seed !== null ? seed + 5432 : Math.random() * 10000);
        
        // Perturbation settings
        this.perturbationScale = perturbationScale; // Scale of the perturbation (0-1, where 1 is full hexSize)
        this.noiseScale = noiseScale; // Scale of the noise (smaller = more gradual changes)
        this.elevationNoiseScale = elevationNoiseScale; // Scale of the elevation noise (smaller = more gradual changes)
        this.elevationScale = elevationScale; // Scale of the elevation (height multiplier for terrain)
        this.elevationPerturbationScale = elevationPerturbationScale; // Scale of the elevation perturbation (local variations)
        
        // For 25cm wide hexes, we want appropriate height variations
        this.baseHeightCm = 5; // Base height in cm above zero level
        
        // Additional parameters for more varied terrain
        this.ridgeInfluence = 0.4; // How much ridge-like features influence the terrain
        this.valleyDepth = 0.6;   // How deep valleys can be
    }

    /**
     * Get perturbation vector based on noise at a given position
     * @param {number} x - X coordinate
     * @param {number} z - Z coordinate
     * @returns {Array} Perturbed [x, z] coordinates
     */
    perturbXZ(x, z) {
        // Use both noise generators for more varied perturbation
        const primaryNoiseX = this.noise.get(x * this.noiseScale, z * this.noiseScale);
        const primaryNoiseZ = this.noise.get(x * this.noiseScale + 200, z * this.noiseScale + 200);
        
        // Secondary noise at different frequencies
        const secondaryNoiseX = this.secondaryNoise.get(x * this.noiseScale * 1.7 + 300, z * this.noiseScale * 1.7);
        const secondaryNoiseZ = this.secondaryNoise.get(x * this.noiseScale * 1.7, z * this.noiseScale * 1.7 + 300);
        
        // Add small-scale detail
        const detailNoiseX = this.noise.get(x * this.noiseScale * 4 + 700, z * this.noiseScale * 4) * 0.2;
        const detailNoiseZ = this.noise.get(x * this.noiseScale * 4, z * this.noiseScale * 4 + 700) * 0.2;
        
        // Combine noise sources with different weights
        const combinedNoiseX = primaryNoiseX * 0.6 + secondaryNoiseX * 0.3 + detailNoiseX;
        const combinedNoiseZ = primaryNoiseZ * 0.6 + secondaryNoiseZ * 0.3 + detailNoiseZ;
        
        // Create flow-like patterns by adding cross-influence between X and Z
        // This creates more natural, flowing perturbations rather than random jitter
        const flowX = primaryNoiseZ * 0.15;
        const flowZ = primaryNoiseX * 0.15;
        
        // Final combined noise with flow influence
        const finalNoiseX = combinedNoiseX * 0.85 + flowX;
        const finalNoiseZ = combinedNoiseZ * 0.85 + flowZ;
        
        // Convert noise from [0,1] to [-1,1] range and scale by perturbation amount
        // Apply a slight non-linear transformation for more varied results
        const perturbX = (finalNoiseX * 2 - 1) * this.perturbationScale * (1 + secondaryNoiseX * 0.5);
        const perturbZ = (finalNoiseZ * 2 - 1) * this.perturbationScale * (1 + secondaryNoiseZ * 0.5);
        
        return [
            x + perturbX,
            z + perturbZ
        ];
    }

    /**
     * Get perturbation for Y coordinate based on noise at a given position
     * @param {number} x - X coordinate
     * @param {number} y - Base Y coordinate (elevation)
     * @param {number} z - Z coordinate
     * @returns {number} Perturbed Y coordinate
     */
    perturbY(x, y, z) {
        // Use different noise coordinates for each axis to avoid symmetry
        const primaryNoise = this.noise.get(x * this.elevationNoiseScale + 300, z * this.elevationNoiseScale + 300);
        const secondaryNoise = this.secondaryNoise.get(x * this.elevationNoiseScale * 1.7 + 500, z * this.elevationNoiseScale * 1.7 + 500);
        
        // Create ridge-like features by using absolute value of noise
        const ridgeNoise = Math.abs(primaryNoise * 2 - 1) * this.ridgeInfluence;
        
        // Create valley-like features by inverting ridge noise
        const valleyNoise = (1 - Math.abs(secondaryNoise * 2 - 1)) * this.valleyDepth;
        
        // Combine different noise types for more varied terrain
        // Mix primary noise with ridge and valley features
        let combinedNoise = primaryNoise * 0.6 + ridgeNoise * 0.3 - valleyNoise * 0.3 + secondaryNoise * 0.4;
        
        // Add small-scale detail
        combinedNoise += this.noise.get(x * this.elevationNoiseScale * 5 + 700, z * this.elevationNoiseScale * 5 + 700) * 0.2;
        
        // Convert noise to appropriate range and apply perturbation
        const perturbation = (combinedNoise * 2 - 1) * this.elevationPerturbationScale;
        
        // Apply the perturbation and round to two decimal places
        const py = Math.round((y + perturbation) * 100) / 100;
        return py;
    }

    /**
     * Get elevation value based on noise at a given position
     * @param {number} x - X coordinate
     * @param {number} z - Z coordinate
     * @returns {number} Elevation value between 0 and 1
     */
    getElevation(x, z) {
        // Use both noise generators for more variation
        let primaryNoise = this.noise.get(x * this.elevationNoiseScale, z * this.elevationNoiseScale);
        let secondaryNoise = this.secondaryNoise.get(x * this.elevationNoiseScale * 1.3, z * this.elevationNoiseScale * 1.3);
        
        // Create fractal noise with multiple octaves for natural-looking terrain
        // Primary noise octaves
        let elevation = primaryNoise;
        elevation += 0.5 * this.noise.get(x * this.elevationNoiseScale * 2, z * this.elevationNoiseScale * 2);
        elevation += 0.25 * this.noise.get(x * this.elevationNoiseScale * 4, z * this.elevationNoiseScale * 4);
        elevation += 0.125 * this.noise.get(x * this.elevationNoiseScale * 8, z * this.elevationNoiseScale * 8);
        
        // Secondary noise octaves (at different frequencies for more variation)
        let secondaryElevation = secondaryNoise;
        secondaryElevation += 0.4 * this.secondaryNoise.get(x * this.elevationNoiseScale * 2.5, z * this.elevationNoiseScale * 2.5);
        secondaryElevation += 0.2 * this.secondaryNoise.get(x * this.elevationNoiseScale * 5, z * this.elevationNoiseScale * 5);
        
        // Create ridge-like features for mountains
        const ridgeNoise = Math.pow(Math.abs(primaryNoise * 2 - 1), 1.5) * this.ridgeInfluence;
        
        // Create valley-like features
        const valleyNoise = Math.pow(1 - Math.abs(secondaryNoise * 2 - 1), 2) * this.valleyDepth;
        
        // Combine all noise types with appropriate weights
        elevation = (elevation / 1.875) * 0.65;  // Primary noise contribution
        secondaryElevation = (secondaryElevation / 1.6) * 0.35;  // Secondary noise contribution
        
        // Mix all terrain features
        let finalElevation = elevation + secondaryElevation + ridgeNoise - valleyNoise;
        
        // Apply overall scaling
        finalElevation *= this.elevationScale;
        
        // Add base height to ensure we have some minimum elevation
        finalElevation += this.baseHeightCm / 25; // Convert cm to units where 1 unit = 25cm
        
        // Round to two decimal places
        return Math.round(finalElevation * 100) / 100;
    }

    /**
     * Get biome index based on elevation
     * @param {number} elevation - Elevation value between 0 and 1
     * @param {number} biomeCount - Number of possible biomes
     * @returns {number} Biome index
     */
    getBiomeIndex(elevation, biomeCount) {
        return Math.floor(elevation * biomeCount);
    }
}

export default PerturbationUtils;
