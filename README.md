# Hex Game 2025

A 3D hexagonal terrain game engine with AI-generated content.

## Design Concept

This project explores the creation of a dynamic, infinite world using a hexagonal grid system combined with AI-generated terrain and models. The core innovation is using artificial intelligence to create meaningful and coherent terrain instead of traditional procedural generation methods.

### Key Design Aspects

#### Hexagonal Terrain System

The world is built on a hex grid where each hexagon represents approximately 25cm in real-world scale. This system offers several advantages:
- Natural-looking terrain with six-directional connectivity
- Efficient storage and rendering of large worlds
- Clean transitions between different elevation levels

Each hexagon connects to its neighbors through a specialized geometry system:
- Two triangles form a rectangular "skirt" that joins adjacent hexagon faces
- A third triangle fills the remaining gap to the side
- This approach prevents visual gaps while allowing for smooth elevation changes

![Hex Terrain Visualization](docs/hex_terrain.png)

#### Chunking System

The world is divided into chunks (16x16 hexagons by default) that are:
- Dynamically loaded/unloaded as the player moves
- Self-contained with their own biome and feature arrays
- Optimized for memory efficiency and performance

#### Memory-Efficient Data Structure

A key feature is the bit-packed data format:
- Each hexagon's data is stored in a single byte:
  - 2 bits for biome index (4 biomes per chunk)
  - 1 bit for feature index (2 features per chunk)
  - 5 bits for height offset (32 possible height values)
- This allows for an infinite variety of biomes and features across the entire world while keeping memory usage minimal
- Each chunk maintains arrays of biomes and features that the bit-packed data references

#### AI-Generated Content

Instead of using traditional noise-based procedural generation, this system leverages AI to:
1. Generate text descriptions of terrain
2. Parse these descriptions into structured terrain data
3. Create relevant 3D models for new biomes
4. Ensure logical transitions between neighboring chunks

The AI considers:
- Adjacent chunk context for coherent transitions
- World position for logical biome distribution
- Elevation patterns that make geographical sense
- Feature placement (rivers, paths, etc.) with natural flow

#### Model Generation and Caching

When creating new biomes, the system:
- Dynamically generates 3D models for elements (trees, rocks, etc.)
- Caches these models for reuse across the world
- Maintains memory efficiency while providing variety

#### Custom Terrain Shader

A specialized shader system handles:
- Biome color blending at transitions
- Height-based shading (higher elevations are lighter, lower are darker)
- Feature overlays (like animated water for rivers)
- Subtle texture variation to avoid flat colors

## Technical Implementation

### Core Components

1. **ChunkManager** - Handles dynamic loading/unloading of chunks based on player position
2. **AITerrainGenerator** - Interfaces with AI services to generate terrain descriptions
3. **TerrainDataCompressor** - Encodes/decodes the bit-packed terrain format
4. **HexGeometryGenerator** - Creates the specialized hexagon geometry with connecting triangles
5. **ModelFactory** - Generates and caches 3D models for biomes
6. **TerrainShader** - Implements the custom shader for terrain rendering

### AI Integration

The system uses OpenRouter (which can access models like Claude or GPT-4) to generate terrain. It provides the AI with:
- Current world position
- Neighboring chunk information
- Available biomes and features
- Specific parameters about the desired output

The AI responds with rich descriptive text that the parser then converts into the game's data format.

### Extending the System

The modular architecture allows for easy extension:
- Add new biome types with associated models
- Create new feature types with specialized rendering
- Implement gameplay mechanics that interact with terrain types
- Incorporate new AI models as they become available

## Getting Started

### Prerequisites

- Node.js 14+
- A modern browser supporting WebGL
- OpenRouter API key (optional, for AI-generated content)

### Installation

1. Clone the repository
2. Run `npm install` to install dependencies
3. Configure your OpenRouter API key in the settings (optional)
4. Run `npm run dev` to start the development server

### Usage

- Use mouse to rotate camera
- WASD keys to move
- See the debug panel for current position and performance stats

## Future Development

- Physics integration for terrain interaction
- Weather and time systems
- Multiplayer capability
- Gameplay mechanics built around the terrain system
- Enhanced AI prompting for more specific terrain outcomes
- Mobile support

## Credits

This project combines Three.js for rendering, AI services for content generation, and custom algorithms for the hexagonal terrain system.