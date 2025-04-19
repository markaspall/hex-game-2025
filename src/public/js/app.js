/**
 * Main application entry point
 * Sets up the Three.js scene and manages hex grid
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import HexGenerator from './hex/hexGenerator.js';
// import HexRenderer from './hex/hexRenderer.js';
// import HexDebugger from './hex/hexDebugger.js';

class HexGame {
    constructor() {
        // Default parameters
        this.params = {
            gridSize: 16,
            hexSize: 1.0,
            hexGap: 0.1,
            debugMode: false
        };

        // FPS tracking variables
        this.fps = 0;
        this.frameCount = 0;
        this.lastTime = performance.now();
        this.fpsUpdateInterval = 500; // Update FPS every 500ms

        // Parse URL parameters
        this.parseUrlParams();

        // Set up the scene
        this.setupScene();

        // Set up event listeners
        window.addEventListener('resize', this.onWindowResize.bind(this));

        // Create UI controls
        this.createUI();

        // Initialize
        this.init();
    }

    /**
     * Parse URL parameters and update game settings
     */
    parseUrlParams() {
        const urlParams = new URLSearchParams(window.location.search);

        // Parse gridSize parameter
        if (urlParams.has('gridSize')) {
            const gridSize = parseInt(urlParams.get('gridSize'));
            if (!isNaN(gridSize) && gridSize > 0) {
                this.params.gridSize = gridSize;
                console.log(`Setting gridSize from URL: ${gridSize}`);
            }
        }

        // Parse hexSize parameter
        if (urlParams.has('hexSize')) {
            const hexSize = parseFloat(urlParams.get('hexSize'));
            if (!isNaN(hexSize) && hexSize > 0) {
                this.params.hexSize = hexSize;
                console.log(`Setting hexSize from URL: ${hexSize}`);
            }
        }

        // Parse hexGap parameter
        if (urlParams.has('hexGap')) {
            const hexGap = parseFloat(urlParams.get('hexGap'));
            if (!isNaN(hexGap) && hexGap >= 0) {
                this.params.hexGap = hexGap;
                console.log(`Setting hexGap from URL: ${hexGap}`);
            }
        }
    }

    /**
     * Create UI controls for the application
     */
    createUI() {
        // Create a container for UI elements
        const uiContainer = document.createElement('div');
        uiContainer.style.position = 'absolute';
        uiContainer.style.top = '10px';
        uiContainer.style.left = '10px';
        uiContainer.style.zIndex = '100';
        document.body.appendChild(uiContainer);

        // Create info display panel
        this.infoPanel = document.createElement('div');
        this.infoPanel.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        this.infoPanel.style.color = 'white';
        this.infoPanel.style.padding = '10px';
        this.infoPanel.style.borderRadius = '4px';
        this.infoPanel.style.marginTop = '10px';
        this.infoPanel.style.fontFamily = 'monospace';
        this.infoPanel.style.fontSize = '14px';
        this.infoPanel.style.lineHeight = '1.5';
        this.infoPanel.style.minWidth = '200px';
        this.updateInfoPanel();
        uiContainer.appendChild(this.infoPanel);
    }

    /**
     * Update the information panel with current stats
     */
    updateInfoPanel() {
        if (this.infoPanel) {
            this.infoPanel.innerHTML = `
                FPS: ${this.fps.toFixed(1)}<br>
                Hex Size: ${this.params.hexSize.toFixed(2)}<br>
                Hex Gap: ${this.params.hexGap.toFixed(2)}<br>
                Grid Size: ${this.params.gridSize}
            `;
        }
    }

    /**
     * Set up the Three.js scene, camera, renderer, and lighting
     */
    setupScene() {
        // Create scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87CEEB); // Sky blue background

        // Create camera
        this.camera = new THREE.PerspectiveCamera(
            75, window.innerWidth / window.innerHeight, 0.1, 1000
        );
        this.camera.position.set(0, 20, 20);
        this.camera.lookAt(0, 0, 0);

        // Create renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
        document.body.appendChild(this.renderer.domElement);

        // Add lighting
        // Ambient light
        const ambientLight = new THREE.AmbientLight(0x404040, 1);
        this.scene.add(ambientLight);

        // Directional light (sun)
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(10, 20, 10);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        this.scene.add(directionalLight);

        // Add orbit controls for camera
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;

        // Add grid helper for reference
        const gridHelper = new THREE.GridHelper(50, 50);
        this.scene.add(gridHelper);
    }

    /**
     * Initialize the hex grid
     */
    async init() {
        try {
            // Create hex generator and renderer
            this.hexGenerator = new HexGenerator(
                this.params.gridSize,
                this.params.hexSize,
                this.params.hexGap
            );

            // Render the scene - now using async method
            const meshes = await this.hexGenerator.renderGrid(this.scene);
            this.hexMeshes = meshes;
            console.log('Hex grid generated successfully with', meshes.length, 'hexes');

            // Center camera on the grid
            const gridCenter = this.calculateGridCenter();
            this.controls.target.set(gridCenter.x, 0, gridCenter.z);
            this.camera.position.set(gridCenter.x, 20, gridCenter.z + 20);
            this.controls.update();
                
            // Start animation loop
            this.animate();
        } catch (error) {
            console.error('Error initializing hex grid:', error);
        }
    }

    /**
     * Calculate the center point of the hex grid
     * @returns {THREE.Vector3} Center point coordinates
     */
    calculateGridCenter() {
        // if (!this.hexGrid || this.hexGrid.length === 0) {
        //     return new THREE.Vector3();
        // }

        // // Get grid extents
        // const minX = Math.min(...this.hexGrid.map(hex => hex.position[0]));
        // const maxX = Math.max(...this.hexGrid.map(hex => hex.position[0]));
        // const minZ = Math.min(...this.hexGrid.map(hex => hex.position[2]));
        // const maxZ = Math.max(...this.hexGrid.map(hex => hex.position[2]));

        // // Calculate center
        // return new THREE.Vector3(
        //     minX + (maxX - minX) / 2,
        //     0,
        //     minZ + (maxZ - minZ) / 2
        // );

        return new THREE.Vector3(0, 0, 0);
    }

    /**
     * Animation loop
     */
    animate() {
        requestAnimationFrame(this.animate.bind(this));

        // Update controls
        this.controls.update();

        // Render the scene
        this.renderer.render(this.scene, this.camera);

        // Calculate FPS
        this.frameCount++;
        const currentTime = performance.now();
        const elapsedTime = currentTime - this.lastTime;

        if (elapsedTime >= this.fpsUpdateInterval) {
            this.fps = (this.frameCount * 1000) / elapsedTime;
            this.frameCount = 0;
            this.lastTime = currentTime;

            // Update the info panel with current FPS and other stats
            this.updateInfoPanel();
        }
    }

    /**
     * Handle window resize
     */
    onWindowResize() {
        // Update camera aspect ratio
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();

        // Update renderer size
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    /**
     * Update hex grid parameters and regenerate
     * @param {Object} params - New parameters
     */
    async updateGrid(params) {
        // Update parameters
        this.params = { ...this.params, ...params };

        // Clear old grid and debug visualizations
        if (this.hexMeshes) {
            // Remove each mesh from the scene
            this.hexMeshes.forEach(mesh => this.scene.remove(mesh));
        }

        // Create new hex generator with updated parameters
        this.hexGenerator = new HexGenerator(
            this.params.gridSize,
            this.params.hexSize,
            this.params.hexGap
        );

        try {
            // Regenerate grid
            const meshes = await this.hexGenerator.generateHexGrid(this.scene);
            this.hexMeshes = meshes;
            console.log('Hex grid updated successfully with', meshes.length, 'hexes');
        } catch (error) {
            console.error('Error updating hex grid:', error);
        }
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.hexGame = new HexGame();
});