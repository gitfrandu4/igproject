import * as THREE from 'three';
import { moonShader } from '../shaders/skyShaders.js';

export class Moon {
  constructor(scene) {
    this.scene = scene;
    this.moonSphere = null;
    this.createMoon();
  }

  createMoon() {
    const moonGeometry = new THREE.SphereGeometry(15, 32, 32);
    const moonMaterial = new THREE.ShaderMaterial({
      uniforms: moonShader.uniforms,
      vertexShader: moonShader.vertexShader,
      fragmentShader: moonShader.fragmentShader,
      transparent: true,
      blending: THREE.AdditiveBlending,
    });

    this.moonSphere = new THREE.Mesh(moonGeometry, moonMaterial);
    this.scene.add(this.moonSphere);
  }

  update(time, angle) {
    if (!this.moonSphere) return;

    const radius = 300;
    const moonX = Math.cos(angle + Math.PI) * radius;
    const moonY = Math.sin(angle + Math.PI) * radius;

    this.moonSphere.position.set(moonX, moonY, 0);
    this.moonSphere.material.uniforms.time.value = time;
  }

  dispose() {
    if (this.moonSphere) {
      this.moonSphere.geometry.dispose();
      this.moonSphere.material.dispose();
      this.scene.remove(this.moonSphere);
    }
  }
}
