import * as THREE from 'three';
import { sunShader } from '../shaders/skyShaders.js';

export class Sun {
  constructor(scene) {
    this.scene = scene;
    this.sunSphere = null;
    this.directionalLight = null;
    this.createSun();
  }

  createSun() {
    // Create sun sphere
    const sunGeometry = new THREE.SphereGeometry(20, 32, 32);
    const sunMaterial = new THREE.ShaderMaterial({
      uniforms: sunShader.uniforms,
      vertexShader: sunShader.vertexShader,
      fragmentShader: sunShader.fragmentShader,
      transparent: true,
      blending: THREE.AdditiveBlending,
    });

    this.sunSphere = new THREE.Mesh(sunGeometry, sunMaterial);
    this.scene.add(this.sunSphere);

    // Create directional light
    this.directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    this.directionalLight.castShadow = true;
    this.directionalLight.shadow.mapSize.width = 4096;
    this.directionalLight.shadow.mapSize.height = 4096;
    this.directionalLight.shadow.camera.near = 0.5;
    this.directionalLight.shadow.camera.far = 100;
    this.directionalLight.shadow.camera.left = -30;
    this.directionalLight.shadow.camera.right = 30;
    this.directionalLight.shadow.camera.top = 30;
    this.directionalLight.shadow.camera.bottom = -30;
    this.scene.add(this.directionalLight);
  }

  update(time, angle) {
    if (!this.sunSphere || !this.directionalLight) return;

    const radius = 300;
    const sunX = Math.cos(angle) * radius;
    const sunY = Math.sin(angle) * radius;

    // Update sun position
    this.sunSphere.position.set(sunX, sunY, 0);
    this.sunSphere.material.uniforms.time.value = time;

    // Update directional light
    this.directionalLight.position
      .copy(this.sunSphere.position)
      .normalize()
      .multiplyScalar(50);
    this.directionalLight.intensity = Math.max(
      0.2,
      Math.sin(angle) * 0.8 + 0.2,
    );
  }

  dispose() {
    if (this.sunSphere) {
      this.sunSphere.geometry.dispose();
      this.sunSphere.material.dispose();
      this.scene.remove(this.sunSphere);
    }
    if (this.directionalLight) {
      this.scene.remove(this.directionalLight);
    }
  }
}
