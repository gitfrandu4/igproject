import * as THREE from 'three';

/**
 * Class representing the star field in the night sky
 * Creates and manages a large sphere with a star texture mapped to its interior
 */
export class Stars {
  /**
   * @param {THREE.Scene} scene - The Three.js scene to add the stars to
   */
  constructor(scene) {
    this.scene = scene;
    this.stars = null;
    this.createStars();
  }

  /**
   * Creates the star field using a large textured sphere
   * Stars are rendered on the interior of the sphere using BackSide material
   */
  createStars() {
    // Large sphere (radius: 400) to encompass the entire scene
    const geometry = new THREE.SphereGeometry(400, 32, 32);

    const textureLoader = new THREE.TextureLoader();
    const starTexture = textureLoader.load('textures/solarsystem/2k_stars.jpg');

    // Material configuration for realistic star rendering:
    // - BackSide: Renders on interior of sphere
    // - Additive blending: Creates bright star effect
    // - Transparency: Allows day/night cycle fading
    const material = new THREE.MeshBasicMaterial({
      map: starTexture,
      side: THREE.BackSide,
      transparent: true,
      opacity: 1.0,
      blending: THREE.AdditiveBlending,
    });

    this.stars = new THREE.Mesh(geometry, material);
    this.scene.add(this.stars);
  }

  /**
   * Updates star visibility and rotation based on time
   * @param {number} time - Current time value for animation
   */
  update(time) {
    if (!this.stars) return;

    // Fade stars based on day/night cycle (dayFactor oscillates between 0 and 1)
    const dayFactor = (Math.sin(time * 0.02) + 1) * 0.5;
    this.stars.material.opacity = Math.max(0, 1 - dayFactor * 1.5);

    // Subtle rotation effect (0.01 radians per time unit)
    this.stars.rotation.y = time * 0.01;
  }

  /**
   * Properly disposes of all Three.js resources to prevent memory leaks
   */
  dispose() {
    if (this.stars) {
      this.stars.geometry.dispose();
      this.stars.material.dispose();
      if (this.stars.material.map) {
        this.stars.material.map.dispose();
      }
      this.scene.remove(this.stars);
    }
  }
}
