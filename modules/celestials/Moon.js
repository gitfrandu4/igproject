import * as THREE from 'three';
import { moonShader } from '../shaders/skyShaders.js';

export class Moon {
  constructor(scene) {
    this.scene = scene;
    this.moonSphere = null;
    this.moonLight = null;
    this.loadMoonTexture();
  }

  async loadMoonTexture() {
    const textureLoader = new THREE.TextureLoader();
    try {
      const moonTexture = await new Promise((resolve) =>
        textureLoader.load('textures/solarsystem/2k_moon.jpg', resolve),
      );

      // Generate normal map from the texture
      const normalMap = this.generateNormalMap(moonTexture);

      this.createMoon(moonTexture, normalMap);
    } catch (error) {
      console.warn('Error loading moon texture, falling back to basic moon');
      this.createMoon();
    }
  }

  generateNormalMap(texture) {
    // Create a canvas to process the texture
    const canvas = document.createElement('canvas');
    const size = texture.image.width;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    // Draw the texture
    ctx.drawImage(texture.image, 0, 0);
    const imageData = ctx.getImageData(0, 0, size, size);
    const pixels = imageData.data;

    // Create normal map data
    const normalData = new Uint8Array(size * size * 4);

    for (let i = 0; i < size; i++) {
      for (let j = 0; j < size; j++) {
        const x = (i + 1) % size;
        const y = (j + 1) % size;

        // Get heights using grayscale values
        const center = pixels[(i + j * size) * 4] / 255;
        const right = pixels[(x + j * size) * 4] / 255;
        const bottom = pixels[(i + y * size) * 4] / 255;

        // Calculate normal
        const dx = (center - right) * 2.0;
        const dy = (center - bottom) * 2.0;
        const dz = 0.5;

        // Normalize
        const length = Math.sqrt(dx * dx + dy * dy + dz * dz);

        // Store normal (convert from -1:1 to 0:1 range)
        const index = (i + j * size) * 4;
        normalData[index] = ((dx / length) * 0.5 + 0.5) * 255;
        normalData[index + 1] = ((dy / length) * 0.5 + 0.5) * 255;
        normalData[index + 2] = ((dz / length) * 0.5 + 0.5) * 255;
        normalData[index + 3] = 255;
      }
    }

    // Create normal map texture
    const normalMap = new THREE.DataTexture(
      normalData,
      size,
      size,
      THREE.RGBAFormat,
    );
    normalMap.needsUpdate = true;
    return normalMap;
  }

  createMoon(moonTexture = null, normalMap = null) {
    const moonGeometry = new THREE.SphereGeometry(15, 64, 64);
    let moonMaterial;

    if (moonTexture) {
      // Configurar repetición y filtrado de la textura
      moonTexture.wrapS = moonTexture.wrapT = THREE.RepeatWrapping;
      moonTexture.minFilter = THREE.LinearFilter;
      moonTexture.magFilter = THREE.LinearFilter;

      // Material con textura mejorado
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
      // Material básico con shader
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

    // Create moon glow with less intensity
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

    // Create moon light with adjusted color
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

    // Add an ambient light specific for the moon
    this.moonAmbient = new THREE.PointLight(0x666677, 0.2);
    this.moonSphere.add(this.moonAmbient);

    this.scene.add(this.moonLight);
  }

  update(time, angle) {
    if (!this.moonSphere || !this.moonLight) return;

    const radius = 300;
    const moonX = Math.cos(angle + Math.PI) * radius;
    const moonY = Math.sin(angle + Math.PI) * radius;

    // Update moon position
    this.moonSphere.position.set(moonX, moonY, 0);

    // Keep moon facing the scene center
    this.moonSphere.lookAt(0, 0, 0);

    // Update moon shader if using basic material
    if (this.moonSphere.material.uniforms) {
      this.moonSphere.material.uniforms.time.value = time;
    }

    // Update moon glow
    if (this.moonSphere.children[0]) {
      this.moonSphere.children[0].material.uniforms.time.value = time;
    }

    // Update moon light
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
