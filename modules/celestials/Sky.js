import * as THREE from 'three';
import { skyShader } from '../shaders/skyShaders.js';

export class Sky {
  constructor(scene) {
    this.scene = scene;
    this.sky = null;
    this.createSky();
  }

  createSky() {
    const skyGeometry = new THREE.SphereGeometry(400, 32, 32);
    const skyMaterial = new THREE.ShaderMaterial({
      uniforms: skyShader.uniforms,
      vertexShader: skyShader.vertexShader,
      fragmentShader: skyShader.fragmentShader,
      side: THREE.BackSide,
    });

    this.sky = new THREE.Mesh(skyGeometry, skyMaterial);
    this.scene.add(this.sky);
  }

  update(time) {
    if (this.sky && this.sky.material.uniforms) {
      this.sky.material.uniforms.time.value = time;
    }
  }

  dispose() {
    if (this.sky) {
      this.sky.geometry.dispose();
      this.sky.material.dispose();
      this.scene.remove(this.sky);
    }
  }
}
