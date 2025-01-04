import * as THREE from 'three';
import { moonShader } from '../shaders/skyShaders.js';

/**
 * Class representing the Moon with dynamic lighting and texture effects
 * Features procedural normal mapping and atmospheric glow
 */
export class Moon {
  /**
   * @param {THREE.Scene} scene - The Three.js scene to add the moon and its lighting to
   */
  constructor(scene) {
    this.scene = scene;
    this.moonSphere = null;
    this.moonLight = null;
    this.loadMoonTexture();
  }

  /**
   * Asynchronously loads the moon texture and generates its normal map
   * Falls back to a basic shader-based moon if texture loading fails
   */
  async loadMoonTexture() {
    const textureLoader = new THREE.TextureLoader();
    try {
      const moonTexture = await new Promise((resolve) =>
        textureLoader.load('textures/solarsystem/2k_moon.jpg', resolve),
      );

      const normalMap = this.generateNormalMap(moonTexture);
      this.createMoon(moonTexture, normalMap);
    } catch (error) {
      console.warn('Error loading moon texture, falling back to basic moon');
      this.createMoon();
    }
  }

  /**
   * Generates a normal map from a grayscale texture using height differentials
   * @param {THREE.Texture} texture - The source texture to generate normals from
   * @returns {THREE.DataTexture} Generated normal map
   */
  generateNormalMap(texture) {
    const canvas = document.createElement('canvas');
    const size = texture.image.width;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    ctx.drawImage(texture.image, 0, 0);
    const imageData = ctx.getImageData(0, 0, size, size);
    const pixels = imageData.data;
    const normalData = new Uint8Array(size * size * 4);

    for (let i = 0; i < size; i++) {
      for (let j = 0; j < size; j++) {
        const x = (i + 1) % size;
        const y = (j + 1) % size;

        // Calculate height differentials from grayscale values
        const center = pixels[(i + j * size) * 4] / 255;
        const right = pixels[(x + j * size) * 4] / 255;
        const bottom = pixels[(i + y * size) * 4] / 255;

        // Compute normal vector components
        const dx = (center - right) * 2.0;
        const dy = (center - bottom) * 2.0;
        const dz = 0.5;

        // Normalize the vector
        const length = Math.sqrt(dx * dx + dy * dy + dz * dz);

        // Convert from [-1,1] to [0,1] range and store
        const index = (i + j * size) * 4;
        normalData[index] = ((dx / length) * 0.5 + 0.5) * 255;
        normalData[index + 1] = ((dy / length) * 0.5 + 0.5) * 255;
        normalData[index + 2] = ((dz / length) * 0.5 + 0.5) * 255;
        normalData[index + 3] = 255;
      }
    }

    const normalMap = new THREE.DataTexture(
      normalData,
      size,
      size,
      THREE.RGBAFormat,
    );
    normalMap.needsUpdate = true;
    return normalMap;
  }

  /**
   * Creates the moon's visual representation and lighting system
   * @param {THREE.Texture} moonTexture - Optional texture for detailed moon surface
   * @param {THREE.Texture} normalMap - Optional normal map for surface detail
   */
  createMoon(moonTexture = null, normalMap = null) {
    const moonGeometry = new THREE.SphereGeometry(15, 64, 64);
    let moonMaterial;

    if (moonTexture) {
      // Configure texture settings
      moonTexture.wrapS = moonTexture.wrapT = THREE.RepeatWrapping;
      moonTexture.minFilter = THREE.LinearFilter;
      moonTexture.magFilter = THREE.LinearFilter;

      // Create physically-based material with textures
      moonMaterial = new THREE.MeshStandardMaterial({
        map: moonTexture,
        normalMap: normalMap,
        normalScale: new THREE.Vector2(1.0, 1.0),
        roughness: 0.85,
        metalness: 0.0,
        emissive: new THREE.Color(0x222222),
        emissiveIntensity: 0.1,
        bumpMap: moonTexture,
        bumpScale: 0.8,
        color: 0xffffff,
      });
    } else {
      // Fallback shader-based material
      moonMaterial = new THREE.ShaderMaterial({
        uniforms: moonShader.uniforms,
        vertexShader: moonShader.vertexShader,
        fragmentShader: moonShader.fragmentShader,
        transparent: true,
        blending: THREE.AdditiveBlending,
      });
    }

    this.moonSphere = new THREE.Mesh(moonGeometry, moonMaterial);
    this.scene.add(this.moonSphere);

    // Create subtle atmospheric glow effect
    const glowGeometry = new THREE.SphereGeometry(16, 64, 64);
    const glowMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        color: { value: new THREE.Color(0x666677) },
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
          float intensity = pow(0.6 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
          intensity *= 0.8 + sin(time) * 0.05;
          gl_FragColor = vec4(color, intensity * 0.2);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      depthWrite: false,
    });
    const moonGlow = new THREE.Mesh(glowGeometry, glowMaterial);
    this.moonSphere.add(moonGlow);

    // Setup moon lighting system
    this.moonLight = new THREE.DirectionalLight(0x666677, 0.5);
    this.moonLight.castShadow = true;
    this.moonLight.shadow.mapSize.width = 2048;
    this.moonLight.shadow.mapSize.height = 2048;
    this.moonLight.shadow.camera.near = 0.5;
    this.moonLight.shadow.camera.far = 100;
    this.moonLight.shadow.camera.left = -30;
    this.moonLight.shadow.camera.right = 30;
    this.moonLight.shadow.camera.top = 30;
    this.moonLight.shadow.camera.bottom = -30;
    this.moonLight.shadow.radius = 2;
    this.moonLight.shadow.bias = -0.0001;

    // Add local ambient light for subtle illumination
    this.moonAmbient = new THREE.PointLight(0x666677, 0.2);
    this.moonSphere.add(this.moonAmbient);

    this.scene.add(this.moonLight);
  }

  /**
   * Updates moon position, rotation, and lighting based on time and angle
   * @param {number} time - Current time for animation
   * @param {number} angle - Current angle in radians (moon is opposite to sun)
   */
  update(time, angle) {
    if (!this.moonSphere || !this.moonLight) return;

    const radius = 300;
    const moonX = Math.cos(angle + Math.PI) * radius;
    const moonY = Math.sin(angle + Math.PI) * radius;

    // Position moon opposite to sun
    this.moonSphere.position.set(moonX, moonY, 0);
    this.moonSphere.lookAt(0, 0, 0);

    // Update shader animations if using basic material
    if (this.moonSphere.material.uniforms) {
      this.moonSphere.material.uniforms.time.value = time;
    }

    // Update atmospheric glow effect
    if (this.moonSphere.children[0]) {
      this.moonSphere.children[0].material.uniforms.time.value = time;
    }

    // Update directional light position
    this.moonLight.position
      .copy(this.moonSphere.position)
      .normalize()
      .multiplyScalar(50);

    // Calculate light intensity based on moon height and sun position
    const moonHeight = Math.sin(angle + Math.PI);
    const sunHeight = Math.sin(angle);
    const moonIntensity =
      Math.max(0, moonHeight) * Math.max(0, -sunHeight) * 0.3;
    this.moonLight.intensity = moonIntensity;
  }

  /**
   * Properly disposes of all Three.js resources
   */
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
