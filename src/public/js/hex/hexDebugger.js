/**
 * Hex Grid Debugger
 * Adds debug visualizations and interactions to the hex grid
 */

import * as THREE from 'three';
import HexGenerator from './hexGenerator.js';

class HexDebugger {
    constructor(scene, hexGrid, hexRenderer, camera) {
        this.scene = scene;
        this.hexGrid = hexGrid;
        this.hexRenderer = hexRenderer;
        this.camera = camera;
        this.labelGroup = new THREE.Group();
        this.scene.add(this.labelGroup);
        
        this.selectedHex = null;
        this.highlightedNeighbors = [];
        this.labels = [];
        
        // Set up raycaster for click detection
        this.raycaster = new THREE.Raycaster();
        this.setupClickHandler();
    }
    
    /**
     * Add all debug visualizations
     */
    addDebugVisualizations() {
        this.addCellLabels();
        this.addDirectionLabels();
        this.addVertexLabels();
    }
    
    /**
     * Add cell number labels to each hex
     */
    addCellLabels() {
        this.hexGrid.forEach((hex, index) => {
            const [x, y, z] = hex.position;
            const label = this.createTextLabel(`${index}`, x, y + 0.2, z, 0.5);
            this.labelGroup.add(label);
            this.labels.push(label);
        });
    }
    
    /**
     * Add direction labels (N, NE, SE, etc.) to each hex face
     */
    addDirectionLabels() {
        const directions = ['N', 'NE', 'SE', 'S', 'SW', 'NW'];
        
        this.hexGrid.forEach(hex => {
            const vertices = hex.vertices;
            const centerX = vertices.reduce((sum, v) => sum + v[0], 0) / vertices.length;
            const centerY = vertices[0][1]; // All vertices have the same elevation
            const centerZ = vertices.reduce((sum, v) => sum + v[2], 0) / vertices.length;
            
            // Add direction labels between vertices
            for (let i = 0; i < vertices.length; i++) {
                const currentVertex = vertices[i];
                const nextVertex = vertices[(i + 1) % vertices.length];
                
                // Calculate midpoint between vertices for direction label
                const midX = (currentVertex[0] + nextVertex[0]) / 2;
                const midY = currentVertex[1] + 0.05; // Slightly above the hex
                const midZ = (currentVertex[2] + nextVertex[2]) / 2;
                
                // Calculate position slightly outward from edge
                const dirX = (midX - centerX) * 1.1 + centerX;
                const dirZ = (midZ - centerZ) * 1.1 + centerZ;
                
                const label = this.createTextLabel(directions[i], dirX, midY, dirZ, 0.25);
                this.labelGroup.add(label);
                this.labels.push(label);
            }
        });
    }
    
    /**
     * Add vertex number labels (0-5) to each vertex
     */
    addVertexLabels() {
        this.hexGrid.forEach(hex => {
            const vertices = hex.vertices;
            
            // Add vertex number labels
            for (let i = 0; i < vertices.length; i++) {
                const vertex = vertices[i];
                const label = this.createTextLabel(`${i}`, vertex[0], vertex[1] + 0.1, vertex[2], 0.2);
                this.labelGroup.add(label);
                this.labels.push(label);
            }
        });
    }
    
    /**
     * Create a text label at the specified position
     */
    createTextLabel(text, x, y, z, size = 0.3) {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 128;
        canvas.height = 128;
        
        // Draw text on canvas
        context.fillStyle = 'rgba(0, 0, 0, 0.8)';
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.font = '80px Arial';
        context.fillStyle = 'white';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(text, canvas.width / 2, canvas.height / 2);
        
        // Create texture from canvas
        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.SpriteMaterial({ map: texture });
        const sprite = new THREE.Sprite(material);
        sprite.position.set(x, y, z);
        sprite.scale.set(size, size, size);
        
        return sprite;
    }
    
    /**
     * Set up click handler for hex selection
     */
    setupClickHandler() {
        const onDocumentMouseDown = (event) => {
            event.preventDefault();
            
            // Calculate mouse position in normalized device coordinates
            const mouse = new THREE.Vector2();
            mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
            mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
            
            // Update the picking ray with the camera and mouse position
            this.raycaster.setFromCamera(mouse, this.camera);
            
            // Calculate objects intersecting the picking ray
            const intersects = this.raycaster.intersectObjects(this.hexRenderer.meshes);
            
            if (intersects.length > 0) {
                this.handleHexClick(intersects[0].object);
            }
        };
        
        document.addEventListener('mousedown', onDocumentMouseDown, false);
    }
    
    /**
     * Handle hex click to highlight neighbors
     */
    handleHexClick(hexMesh) {
        // Clear previous highlights
        this.clearHighlights();
        
        // Find the hex data for the clicked mesh
        const hexIndex = this.hexRenderer.meshes.indexOf(hexMesh);
        const hex = this.hexGrid[hexIndex];
        this.selectedHex = hex;
        
        // Highlight the selected hex
        const originalMaterial = hexMesh.material;
        const highlightMaterial = originalMaterial.clone();
        highlightMaterial.color.set(0xffff00); // Yellow highlight
        hexMesh.material = highlightMaterial;
        this.highlightedNeighbors.push({ mesh: hexMesh, material: originalMaterial });
        
        // Create a hex generator to find neighbors
        // We already have the HexGenerator imported at the top level
        const hexGenerator = new HexGenerator();
        
        // Get all neighbors
        const directions = ['N', 'NE', 'SE', 'S', 'SW', 'NW'];
        directions.forEach(direction => {
            const neighbor = hexGenerator.getNeighbor(hex, direction, this.hexGrid);
            if (neighbor) {
                // Find the mesh for this neighbor
                const neighborIndex = this.hexGrid.findIndex(h => 
                    h.gridCoords[0] === neighbor.gridCoords[0] && 
                    h.gridCoords[1] === neighbor.gridCoords[1]
                );
                
                if (neighborIndex !== -1) {
                    const neighborMesh = this.hexRenderer.meshes[neighborIndex];
                    const originalMaterial = neighborMesh.material;
                    const neighborMaterial = originalMaterial.clone();
                    neighborMaterial.color.set(0x00ffff); // Cyan highlight for neighbors
                    neighborMesh.material = neighborMaterial;
                    
                    this.highlightedNeighbors.push({
                        mesh: neighborMesh,
                        material: originalMaterial
                    });
                    
                    // Add a label showing the direction
                    const [x, y, z] = neighbor.position;
                    const dirLabel = this.createTextLabel(direction, x, y + 0.5, z, 0.4);
                    this.labelGroup.add(dirLabel);
                    this.labels.push(dirLabel);
                }
            }
        });
        
        // Log info to console
        console.log(`Selected hex at grid coordinates: ${hex.gridCoords[0]},${hex.gridCoords[1]}`);
        console.log(`Elevation: ${hex.elevation}`);
        console.log('Vertices:', hex.vertices);
    }
    
    /**
     * Clear all highlighted hexes
     */
    clearHighlights() {
        this.highlightedNeighbors.forEach(({ mesh, material }) => {
            mesh.material.dispose();
            mesh.material = material;
        });
        this.highlightedNeighbors = [];
        
        // Remove temporary direction labels
        this.labels.forEach(label => {
            if (this.labelGroup.children.includes(label)) {
                this.labelGroup.remove(label);
                if (label.material.map) {
                    label.material.map.dispose();
                }
                label.material.dispose();
            }
        });
        
        // Re-add permanent labels
        this.labels = [];
        this.addCellLabels();
        this.addDirectionLabels();
        this.addVertexLabels();
    }
    
    /**
     * Remove all debug visualizations
     */
    clear() {
        this.clearHighlights();
        
        this.labels.forEach(label => {
            this.labelGroup.remove(label);
            if (label.material.map) {
                label.material.map.dispose();
            }
            label.material.dispose();
        });
        
        this.labels = [];
        this.scene.remove(this.labelGroup);
    }
}

export default HexDebugger;
