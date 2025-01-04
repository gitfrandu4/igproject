import * as THREE from 'three';
import { moonShader } from '../shaders/skyShaders.js';

export class Moon {
  constructor(scene) {
    this.scene = scene;
    this.moonSphere = null;
    this.moonLight = null;
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

    const glowGeometry = new THREE.SphereGeometry(17, 32, 32);
    const glowMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        color: { value: new THREE.Color(0xaaaacc) },
      },
      vertexShader: `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform vec3 color;
        varying vec3 vNormal;
        void main() {
          float intensity = pow(0.6 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 3.0);
          intensity *= 0.8 + sin(time) * 0.1;
          gl_FragColor = vec4(color, intensity * 0.3);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
    });
    const moonGlow = new THREE.Mesh(glowGeometry, glowMaterial);
    this.moonSphere.add(moonGlow);

    this.moonLight = new THREE.DirectionalLight(0xaaaacc, 0.3);
    this.moonLight.castShadow = true;
    this.moonLight.shadow.mapSize.width = 2048;
    this.moonLight.shadow.mapSize.height = 2048;
    this.moonLight.shadow.camera.near = 0.5;
    this.moonLight.shadow.camera.far = 100;
    this.moonLight.shadow.camera.left = -30;
    this.moonLight.shadow.camera.right = 30;
    this.moonLight.shadow.camera.top = 30;
    this.moonLight.shadow.camera.bottom = -30;

    this.moonLight.shadow.radius = 3;
    this.moonLight.shadow.bias = -0.0001;

    this.scene.add(this.moonLight);
  }

  update(time, angle) {
    if (!this.moonSphere || !this.moonLight) return;

    const radius = 300;
    const moonX = Math.cos(angle + Math.PI) * radius;
    const moonY = Math.sin(angle + Math.PI) * radius;

    this.moonSphere.position.set(moonX, moonY, 0);
    this.moonSphere.material.uniforms.time.value = time;

    if (this.moonSphere.children[0]) {
      this.moonSphere.children[0].material.uniforms.time.value = time;
    }

    this.moonLight.position
      .copy(this.moonSphere.position)
      .normalize()
      .multiplyScalar(50);

    const moonHeight = Math.sin(angle + Math.PI);

    const sunHeight = Math.sin(angle);
    const moonIntensity =
      Math.max(0, moonHeight) * Math.max(0, -sunHeight) * 0.3;
    this.moonLight.intensity = moonIntensity;
  }

  dispose() {
    if (this.moonSphere) {
      this.moonSphere.geometry.dispose();
      this.moonSphere.material.dispose();
      if (this.moonSphere.children[0]) {
        this.moonSphere.children[0].geometry.dispose();
        this.moonSphere.children[0].material.dispose();
      }
      this.scene.remove(this.moonSphere);
    }
    if (this.moonLight) {
      this.scene.remove(this.moonLight);
    }
  }
}
