
# VR Fishing Project

This project demonstrates core concepts of Informática Gráfica, including real-time 3D rendering, shader programming, and basic VR interaction. It uses Three.js for visuals, custom shaders for fish and terrain, and a VR-enabled renderer for immersive participation.

## Features

- 3D Environment: Managed by the SceneManager and Environment modules, includes custom water and terrain.
- Fish Models: Loaded through the FishManager, showcasing advanced shader effects (caustics, rim lighting, pulsing glow).
- FishingRod Mechanics: Grab, cast, and release logic, complete with line physics and pointer interaction.

## Informática Gráfica Highlights

- Custom Shaders: Demonstrates fragment and vertex shaders for fish, grass, and terrain.
- Lighting & Materials: Uses directional, ambient light, HDR tone mapping, physically-based materials, and ACES tone mapping.
- VR Integration: Renders using WebXR for a more interactive, immersive fishing experience.

## Getting Started

1. Place the code in a local or remote server environment.  
2. Run an HTTP server (e.g., using Node.js, Python, or a local dev tool).  
3. Access the index.html file to launch the main application in the browser.  
4. Click on “Enter VR” (if supported) to explore the environment in VR mode (e.g. in Oculus).

## Project Structure

- **modules/SceneManager.js**: Creates and configures the scene, camera, and renderer.  
- **modules/FishManager.js**: Loads fish models and applies custom shaders.  
- **modules/FishingRod.js**: Handles fishing rod logic, pointer, and line updates.  
- **modules/Environment.js**: Builds the terrain, water, and vegetation with custom shaders.  
- **index.html**: Entry point with references to scripts and import maps.  
- **game.js**: Initializes and runs the scene, managers, and main loop.

## Notes

- VR requires a compatible browser with WebXR support (e.g., Chrome on Oculus).
- Third-party libraries (Three.js, Water2, FBXLoader) must be properly linked in the project folder.

## Further Reading

- [Three.js Documentation](https://threejs.org/) for detailed reference on classes and features.  
- [WebXR Device API](https://developer.mozilla.org/docs/Web/API/WebXR_Device_API) for VR/AR capabilities.  
- Informática Gráfica course materials for additional examples of shader math and pipeline concepts.
