import * as THREE from 'three';

export class Stars {
  constructor(scene) {
    this.scene = scene;
    this.stars = null;
    this.createStars();
  }

  createStars() {
    const starsGeometry = new THREE.BufferGeometry();
    const starsVertices = [];
    const starColors = [];

    for (let i = 0; i < 2000; i++) {
      const r = 350;
      const theta = 2 * Math.PI * Math.random();
      const phi = Math.acos(2 * Math.random() - 1);
      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta);
      const z = r * Math.cos(phi);

      starsVertices.push(x, y, z);

      // Random star color (white to slight blue)
      const intensity = 0.5 + Math.random() * 0.5;
      starColors.push(intensity, intensity, intensity + Math.random() * 0.2);
    }

    starsGeometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(starsVertices, 3),
    );
    starsGeometry.setAttribute(
      'color',
      new THREE.Float32BufferAttribute(starColors, 3),
    );

    const starsMaterial = new THREE.PointsMaterial({
      size: 2,
      vertexColors: true,
      transparent: true,
      blending: THREE.AdditiveBlending,
    });

    this.stars = new THREE.Points(starsGeometry, starsMaterial);
    this.scene.add(this.stars);
  }

  update(time) {
    if (!this.stars) return;

    // Update stars visibility based on time of day
    const dayFactor = (Math.sin(time * 0.02) + 1) * 0.5;
    this.stars.material.opacity = 1 - dayFactor;
  }

  dispose() {
    if (this.stars) {
      this.stars.geometry.dispose();
      this.stars.material.dispose();
      this.scene.remove(this.stars);
    }
  }
}