import * as THREE from 'three';
import { skyShader } from '../shaders/skyShaders.js';

/**
 * Class representing the dynamic sky dome
 * Creates a large sphere with a custom shader for realistic sky rendering
 */
export class Sky {
  /**
   * @param {THREE.Scene} scene - The Three.js scene to add the sky to
   */
  constructor(scene) {
    this.scene = scene;
    this.sky = null;
    this.createSky();
  }

  /**
   * Creates the sky dome using a large inverted sphere with a custom shader
   * The shader handles atmospheric scattering and day/night transitions
   */
  createSky() {
    // Large sphere (radius: 400) rendered from the inside
    const skyGeometry = new THREE.SphereGeometry(400, 32, 32);
    const skyMaterial = new THREE.ShaderMaterial({
      uniforms: skyShader.uniforms,
      vertexShader: skyShader.vertexShader,
      fragmentShader: skyShader.fragmentShader,
      side: THREE.BackSide, // Render on interior of sphere
    });

    this.sky = new THREE.Mesh(skyGeometry, skyMaterial);
    this.scene.add(this.sky);
  }

  /**
   * Updates the sky shader uniforms for animation
   * @param {number} time - Current time value for sky color transitions
   */
  update(time) {
    if (this.sky && this.sky.material.uniforms) {
      this.sky.material.uniforms.time.value = time;
    }
  }

  /**
   * Properly disposes of all Three.js resources
   */
  dispose() {
    if (this.sky) {
      this.sky.geometry.dispose();
      this.sky.material.dispose();
      this.scene.remove(this.sky);
    }
  }
}
