import * as THREE from 'three';

export class Stars {
  constructor(scene) {
    this.scene = scene;
    this.stars = null;
    this.createStars();
  }

  createStars() {
    // Create a large sphere for the starfield
    const geometry = new THREE.SphereGeometry(400, 32, 32);

    // Load the star texture
    const textureLoader = new THREE.TextureLoader();
    const starTexture = textureLoader.load('textures/solarsystem/2k_stars.jpg');

    // Create material with the star texture
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

  update(time) {
    if (!this.stars) return;

    // Update stars visibility
    const dayFactor = (Math.sin(time * 0.02) + 1) * 0.5;
    this.stars.material.opacity = Math.max(0, 1 - dayFactor * 1.5);

    // Slow rotation of the star field
    this.stars.rotation.y = time * 0.01;
  }

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
