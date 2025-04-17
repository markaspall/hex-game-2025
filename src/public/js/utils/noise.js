/**
 * Perlin Noise Implementation
 * Based on the improved Perlin noise algorithm by Ken Perlin
 */

// A simple implementation of Perlin noise
class PerlinNoise {
    constructor(seed = Math.random()) {
        this.seed = seed;
        this.gradients = {};
        this.memory = {};
    }

    // Generate a random gradient vector
    getRandomGradient(ix, iy) {
        // Use a hash function to get a unique, but deterministic value for each coordinate
        const key = ix + "," + iy;
        
        if (!this.gradients[key]) {
            // Use the seed to generate a deterministic random angle
            const angle = 2 * Math.PI * this._random(ix, iy);
            this.gradients[key] = {
                x: Math.cos(angle),
                y: Math.sin(angle)
            };
        }
        
        return this.gradients[key];
    }

    // Interpolation function (cubic Hermite curve)
    smootherstep(t) {
        return t * t * t * (t * (t * 6 - 15) + 10);
    }

    // Linear interpolation
    lerp(a, b, t) {
        return a + t * (b - a);
    }

    // Compute dot product of distance and gradient vectors
    dotGridGradient(ix, iy, x, y) {
        // Get gradient at grid point
        const gradient = this.getRandomGradient(ix, iy);
        
        // Compute the distance vector
        const dx = x - ix;
        const dy = y - iy;
        
        // Compute the dot-product
        return dx * gradient.x + dy * gradient.y;
    }

    // Simple deterministic random function based on coordinates and seed
    _random(x, y) {
        const dot = x * 12.9898 + y * 78.233 + this.seed;
        return this._fract(Math.sin(dot) * 43758.5453123);
    }

    // Fractional part of a number
    _fract(n) {
        return n - Math.floor(n);
    }

    // Get noise value at coordinates (x, y)
    get(x, y) {
        const key = x + "," + y;
        
        // Check if we've already calculated this value
        if (this.memory[key]) {
            return this.memory[key];
        }
        
        // Get grid cell coordinates
        const x0 = Math.floor(x);
        const y0 = Math.floor(y);
        const x1 = x0 + 1;
        const y1 = y0 + 1;
        
        // Get interpolation weights
        const sx = this.smootherstep(x - x0);
        const sy = this.smootherstep(y - y0);
        
        // Interpolate between grid point gradients
        const n0 = this.dotGridGradient(x0, y0, x, y);
        const n1 = this.dotGridGradient(x1, y0, x, y);
        const ix0 = this.lerp(n0, n1, sx);
        
        const n2 = this.dotGridGradient(x0, y1, x, y);
        const n3 = this.dotGridGradient(x1, y1, x, y);
        const ix1 = this.lerp(n2, n3, sx);
        
        // Result is in range [-1, 1], so we normalize to [0, 1]
        const result = this.lerp(ix0, ix1, sy) * 0.5 + 0.5;
        
        // Cache the result
        this.memory[key] = result;
        
        return result;
    }
}

export default PerlinNoise;
