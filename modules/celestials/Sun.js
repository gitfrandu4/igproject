import * as THREE from 'three';
import { sunShader } from '../shaders/skyShaders.js';

export class Sun {
  constructor(scene) {
    this.scene = scene;
    this.sunSphere = null;
    this.directionalLight = null;
    this.ambientLight = null;
    this.hemiLight = null;
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

    // Create sun glow
    const glowGeometry = new THREE.SphereGeometry(22, 32, 32);
    const glowMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        color: { value: new THREE.Color(0xffdd66) },
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
          intensity *= 1.0 + sin(time * 3.0) * 0.2;
          gl_FragColor = vec4(color, intensity * 0.5);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
    });
    const sunGlow = new THREE.Mesh(glowGeometry, glowMaterial);
    this.sunSphere.add(sunGlow);

    // Create directional light (main sun light)
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

    // Create hemisphere light (sky light)
    this.hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.5);
    this.scene.add(this.hemiLight);

    // Create ambient light (general fill light)
    this.ambientLight = new THREE.AmbientLight(0x404040, 0.3);
    this.scene.add(this.ambientLight);
  }

  update(time, angle) {
    if (!this.sunSphere || !this.directionalLight) return;

    const radius = 300;
    const sunX = Math.cos(angle) * radius;
    const sunY = Math.sin(angle) * radius;

    // Update sun position
    this.sunSphere.position.set(sunX, sunY, 0);
    this.sunSphere.material.uniforms.time.value = time;

    // Update sun glow
    if (this.sunSphere.children[0]) {
      this.sunSphere.children[0].material.uniforms.time.value = time;
    }

    // Update directional light
    this.directionalLight.position
      .copy(this.sunSphere.position)
      .normalize()
      .multiplyScalar(50);

    // Calculate sun height factor (-1 to 1)
    const sunHeight = Math.sin(angle);

    // Update light intensities based on sun height
    this.directionalLight.intensity = Math.max(0.2, sunHeight * 0.8 + 0.2);
    this.hemiLight.intensity = Math.max(0.2, sunHeight * 0.3 + 0.2);
    this.ambientLight.intensity = Math.max(0.1, sunHeight * 0.2 + 0.1);

    // Update light colors based on time of day
    const sunsetFactor = 1 - Math.abs(sunHeight);
    const sunsetColor = new THREE.Color(0xff8844);
    const dayColor = new THREE.Color(0xffffff);
    const groundColor = new THREE.Color(0x444444);

    // Interpolate between day and sunset colors
    const currentSkyColor = new THREE.Color().lerpColors(
      dayColor,
      sunsetColor,
      sunsetFactor,
    );

    // Update light colors
    this.directionalLight.color.copy(currentSkyColor);

    // Update hemisphere light colors
    this.hemiLight.color.setHex(currentSkyColor.getHex()); // Sky color
    this.hemiLight.groundColor.setHex(groundColor.getHex()); // Ground color
  }

  dispose() {
    if (this.sunSphere) {
      this.sunSphere.geometry.dispose();
      this.sunSphere.material.dispose();
      if (this.sunSphere.children[0]) {
        this.sunSphere.children[0].geometry.dispose();
        this.sunSphere.children[0].material.dispose();
      }
      this.scene.remove(this.sunSphere);
    }
    if (this.directionalLight) {
      this.scene.remove(this.directionalLight);
    }
    if (this.hemiLight) {
      this.scene.remove(this.hemiLight);
    }
    if (this.ambientLight) {
      this.scene.remove(this.ambientLight);
    }
  }
}
