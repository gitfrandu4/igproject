import * as THREE from 'three';
import { sunShader } from '../shaders/skyShaders.js';
import { sunGlowShader } from '../shaders/sunShaders.js';

/**
 * Class representing the Sun with dynamic lighting effects
 * Manages the sun's visual representation and its lighting influence on the scene
 */
export class Sun {
  /**
   * @param {THREE.Scene} scene - The Three.js scene to add the sun and lights to
   */
  constructor(scene) {
    this.scene = scene;
    this.sunSphere = null;
    this.directionalLight = null;
    this.ambientLight = null;
    this.hemiLight = null;
    this.createSun();
  }

  /**
   * Creates the sun's visual components and lighting system
   * Includes: sun sphere, glow effect, and three types of lighting
   */
  createSun() {
    // Main sun sphere with custom shader
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

    // Atmospheric glow effect using a larger sphere with custom shader
    const glowGeometry = new THREE.SphereGeometry(22, 32, 32);
    const glowMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        color: { value: new THREE.Color(0xffdd66) },
      },
      vertexShader: sunGlowShader.vertexShader,
      fragmentShader: sunGlowShader.fragmentShader,
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
    });

    const sunGlow = new THREE.Mesh(glowGeometry, glowMaterial);
    this.sunSphere.add(sunGlow);

    // Primary directional light with shadow configuration
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

    // Hemisphere light for sky-ground ambient gradient
    this.hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.5);
    this.scene.add(this.hemiLight);

    // Ambient light for general scene illumination
    this.ambientLight = new THREE.AmbientLight(0x404040, 0.3);
    this.scene.add(this.ambientLight);
  }

  /**
   * Updates sun position and lighting based on time and angle
   * @param {number} time - Current time for animation
   * @param {number} angle - Current angle of the sun in radians
   */
  update(time, angle) {
    if (!this.sunSphere || !this.directionalLight) return;

    const radius = 300;
    const sunX = Math.cos(angle) * radius;
    const sunY = Math.sin(angle) * radius;

    // Update sun sphere and glow positions
    this.sunSphere.position.set(sunX, sunY, 0);
    this.sunSphere.material.uniforms.time.value = time;

    if (this.sunSphere.children[0]) {
      this.sunSphere.children[0].material.uniforms.time.value = time;
    }

    // Update directional light to match sun position
    this.directionalLight.position
      .copy(this.sunSphere.position)
      .normalize()
      .multiplyScalar(50);

    // Calculate sun height for day/night cycle (-1 to 1)
    const sunHeight = Math.sin(angle);

    // Adjust light intensities based on sun height
    this.directionalLight.intensity = Math.max(0.2, sunHeight * 0.8 + 0.2);
    this.hemiLight.intensity = Math.max(0.2, sunHeight * 0.3 + 0.2);
    this.ambientLight.intensity = Math.max(0.1, sunHeight * 0.2 + 0.1);

    // Calculate sunset color transition
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

    // Update all light colors
    this.directionalLight.color.copy(currentSkyColor);
    this.hemiLight.color.setHex(currentSkyColor.getHex());
    this.hemiLight.groundColor.setHex(groundColor.getHex());
  }

  /**
   * Properly disposes of all Three.js resources
   */
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
    if (this.directionalLight) this.scene.remove(this.directionalLight);
    if (this.hemiLight) this.scene.remove(this.hemiLight);
    if (this.ambientLight) this.scene.remove(this.ambientLight);
  }
}
