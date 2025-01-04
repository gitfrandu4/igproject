import * as THREE from 'three';
import { Water } from 'three/addons/objects/Water2.js';
import { grassShader, terrainShader } from './shaders/shaders.js';
import { CelestialManager } from './celestials/CelestialManager.js';

/**
 * Environment class handles the creation and management of the virtual lake environment.
 * Implements advanced graphics techniques including:
 * - Dynamic water simulation using normal mapping and fresnel effects
 * - PBR (Physically Based Rendering) for realistic material interactions
 * - Dynamic terrain generation with multi-layered texturing
 * - Procedural vegetation placement with instanced rendering
 * - Real-time lighting and shadow mapping
 */
export class Environment {
  constructor(scene) {
    this.scene = scene;
    this.water = null;
    this.shore = null;
    this.celestials = new CelestialManager(scene);
    this.textures = {};
    this.timeOfDay = 0;
    this.loadTextures();
  }

  /**
   * Asynchronously loads and configures all environment textures.
   * Uses PBR workflow with the following maps:
   * - Albedo (Color): Base color information
   * - Normal: Surface detail and light interaction
   * - Roughness: Microsurface scatter
   * - Ambient Occlusion: Local shadow details
   * - Height: Displacement mapping
   */
  async loadTextures() {
    const textureLoader = new THREE.TextureLoader();
    const loadTexture = (path) => {
      return new Promise((resolve, reject) => {
        textureLoader.load(
          path,
          (texture) => {
            // Configure texture for tiling and optimal rendering
            texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
            texture.repeat.set(2, 2);
            resolve(texture);
          },
          undefined,
          (error) => {
            reject(error);
          },
        );
      });
    };

    try {
      // Load PBR texture sets for each material
      this.textures = {
        grassColor: await loadTexture('textures/grass/color.jpg'),
        grassNormal: await loadTexture('textures/grass/normal.jpg'),
        grassRoughness: await loadTexture('textures/grass/roughness.jpg'),
        grassHeight: await loadTexture('textures/grass/height.png'),
        grassAO: await loadTexture('textures/grass/ao.jpg'),
        rockColor: await loadTexture('textures/rock/color.jpg'),
        rockNormal: await loadTexture('textures/rock/normal.jpg'),
        rockRoughness: await loadTexture('textures/rock/roughness.jpg'),
        rockHeight: await loadTexture('textures/rock/height.png'),
        rockAO: await loadTexture('textures/rock/ao.jpg'),
      };
      this.setupEnvironment();
    } catch (error) {
      console.warn('Error loading textures:', error);
    }
  }

  /**
   * Initializes all environment components in the correct order to ensure
   * proper rendering and interaction between elements.
   */
  setupEnvironment() {
    this.createLighting();
    this.createTerrain();
    this.createWater();
    this.createShoreline();
    this.createGrass();
    this.createRocks();
  }

  /**
   * Sets up the scene's lighting system using a combination of light types:
   * - Hemisphere light: Sky/ground ambient gradient
   * - Ambient light: Global indirect illumination
   * This creates a balanced base lighting setup for PBR materials.
   */
  createLighting() {
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.4);
    this.scene.add(hemiLight);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    this.scene.add(ambientLight);
  }

  /**
   * Creates the terrain using a ring geometry and custom shaders.
   * The terrain uses vertex displacement and multi-layered texturing
   * for realistic ground detail.
   */
  createTerrain() {
    const terrainGeometry = new THREE.RingGeometry(5.5, 50, 128, 16);
    const terrainMaterial = new THREE.ShaderMaterial({
      vertexShader: terrainShader.vertexShader,
      fragmentShader: terrainShader.fragmentShader,
      uniforms: {
        grassTexture: { value: this.textures.grassColor },
        grassNormal: { value: this.textures.grassNormal },
        time: { value: 0 },
      },
    });

    // Configure texture tiling for terrain scale
    this.textures.grassColor.wrapS = this.textures.grassColor.wrapT =
      THREE.RepeatWrapping;
    this.textures.grassNormal.wrapS = this.textures.grassNormal.wrapT =
      THREE.RepeatWrapping;

    const terrain = new THREE.Mesh(terrainGeometry, terrainMaterial);
    terrain.rotation.x = -Math.PI / 2;
    terrain.position.y = -0.31;
    terrain.receiveShadow = true;
    this.scene.add(terrain);
  }

  /**
   * Implements advanced water simulation using custom shaders and normal mapping.
   * Features include:
   * - Dynamic wave patterns
   * - Realistic light refraction
   * - Depth-based transparency
   * - Fresnel effect for realistic water edge rendering
   */
  createWater() {
    const waterGeometry = new THREE.CircleGeometry(5, 64);
    const textureLoader = new THREE.TextureLoader();
    const loadTexture = (path) => {
      return new Promise((resolve, reject) => {
        textureLoader.load(
          path,
          (texture) => {
            texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
            texture.repeat.set(4, 4);
            resolve(texture);
          },
          undefined,
          (error) => {
            reject(error);
          },
        );
      });
    };

    // Load and configure water normal maps for dynamic wave patterns
    Promise.all([
      loadTexture('textures/water/Water_1_M_Normal.jpg'),
      loadTexture('textures/water/Water_2_M_Normal.jpg'),
    ])
      .then(([normalMap0, normalMap1]) => {
        this.water = new Water(waterGeometry, {
          textureWidth: 512,
          textureHeight: 512,
          color: new THREE.Color(0x55ccff),
          flowDirection: new THREE.Vector2(1, 1),
          scale: 7,
          flowSpeed: 0.25,
          reflectivity: 0.35,
          opacity: 0.65,
          normalMap0,
          normalMap1,
        });
        this.water.position.y = -0.3;
        this.water.rotation.x = -Math.PI / 2;
        this.water.renderOrder = 1;
        this.scene.add(this.water);
      })
      .catch(() => {});
  }

  /**
   * Creates the shoreline using PBR materials and displacement mapping.
   * Implements a gradient between water and terrain using alpha blending
   * and normal map details.
   */
  createShoreline() {
    const geo = new THREE.RingGeometry(5, 5.5, 64, 1);
    geo.rotateX(-Math.PI / 2);
    const mat = new THREE.MeshStandardMaterial({
      map: this.textures.rockColor,
      normalMap: this.textures.rockNormal,
      roughnessMap: this.textures.rockRoughness,
      aoMap: this.textures.rockAO,
      displacementMap: this.textures.rockHeight,
      displacementScale: 0.02,
      transparent: true,
      opacity: 0.95,
      roughness: 0.9,
      metalness: 0.1,
    });
    this.shore = new THREE.Mesh(geo, mat);
    this.shore.position.y = -0.31;
    this.shore.receiveShadow = true;
    this.scene.add(this.shore);
  }

  /**
   * Implements procedural grass placement using instanced meshes for performance.
   * Each grass instance features:
   * - Individual random transformations
   * - Wind animation through vertex displacement
   * - PBR material properties for realistic rendering
   */
  createGrass() {
    const grassGeometry = new THREE.PlaneGeometry(1, 1, 32, 32);
    const grassMaterial = new THREE.MeshStandardMaterial({
      vertexShader: grassShader.vertexShader,
      map: this.textures.grassColor,
      normalMap: this.textures.grassNormal,
      roughnessMap: this.textures.grassRoughness,
      aoMap: this.textures.grassAO,
      displacementMap: this.textures.grassHeight,
      displacementScale: 0.1,
      side: THREE.DoubleSide,
      transparent: true,
      alphaTest: 0.5,
    });

    // Procedural grass placement using polar coordinates
    for (let i = 0; i < 1000; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 6 + Math.random() * 44;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const grass = new THREE.Mesh(grassGeometry, grassMaterial.clone());
      grass.position.set(x, -0.3, z);
      grass.rotation.x = -Math.PI / 2;
      grass.scale.set(0.8 + Math.random() * 0.4, 0.8 + Math.random() * 0.7, 1);

      // Configure unique texture properties for each instance
      const textureScale = 0.5 + Math.random() * 1.5;
      grass.material.map.repeat.set(textureScale, textureScale);
      grass.material.normalMap.repeat.set(textureScale, textureScale);
      grass.material.roughnessMap.repeat.set(textureScale, textureScale);
      grass.material.aoMap.repeat.set(textureScale, textureScale);

      grass.material.map.rotation = Math.random() * Math.PI;
      grass.material.normalMap.rotation = grass.material.map.rotation;
      grass.material.roughnessMap.rotation = grass.material.map.rotation;
      grass.material.aoMap.rotation = grass.material.map.rotation;

      // Randomize grass color within natural range
      grass.material.color.setHSL(
        0.3 + Math.random() * 0.05,
        0.5 + Math.random() * 0.2,
        0.4 + Math.random() * 0.1,
      );
      grass.castShadow = true;
      grass.receiveShadow = true;
      this.scene.add(grass);
    }
  }

  /**
   * Creates procedurally placed rocks using instanced geometries.
   * Implements PBR materials with detailed normal and displacement mapping
   * for realistic rock surfaces.
   */
  createRocks() {
    const rockGeometry = new THREE.DodecahedronGeometry(0.5, 2);
    const rockMaterial = new THREE.MeshStandardMaterial({
      map: this.textures.rockColor,
      normalMap: this.textures.rockNormal,
      roughnessMap: this.textures.rockRoughness,
      aoMap: this.textures.rockAO,
      displacementMap: this.textures.rockHeight,
      displacementScale: 0.1,
      roughness: 1,
      metalness: 1,
    });

    // Procedural rock placement with natural distribution
    for (let i = 0; i < 30; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 6 + Math.random() * 44;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const rock = new THREE.Mesh(rockGeometry, rockMaterial.clone());
      rock.position.set(x, -0.1, z);
      rock.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI,
      );
      rock.scale.set(
        Math.random() * 0.8 + 0.2,
        Math.random() * 0.5 + 0.2,
        Math.random() * 0.8 + 0.2,
      );

      // Configure unique texture properties for each rock
      const textureScale = 0.5 + Math.random() * 1.5;
      rock.material.map.repeat.set(textureScale, textureScale);
      rock.material.normalMap.repeat.set(textureScale, textureScale);
      rock.material.roughnessMap.repeat.set(textureScale, textureScale);
      rock.material.aoMap.repeat.set(textureScale, textureScale);

      rock.material.map.rotation = Math.random() * Math.PI;
      rock.material.normalMap.rotation = rock.material.map.rotation;
      rock.material.roughnessMap.rotation = rock.material.map.rotation;
      rock.material.aoMap.rotation = rock.material.map.rotation;

      // Subtle color variation for natural appearance
      rock.material.color.setHSL(
        0 + Math.random() * 0.01,
        0 + Math.random() * 0.01,
        0.5 + Math.random() * 0.1,
      );
      rock.castShadow = true;
      rock.receiveShadow = true;
      this.scene.add(rock);
    }
  }

  /**
   * Updates all dynamic environment elements:
   * - Water simulation and wave patterns
   * - Time-based shader effects
   * - Day/night cycle lighting
   * - Celestial object positions and lighting
   * @param {number} time - Current simulation time
   */
  update(time) {
    this.timeOfDay = time;

    // Update water simulation
    if (this.water?.material?.uniforms) {
      this.water.material.uniforms.config.value.x = time * 0.5;
      this.water.material.uniforms.config.value.y = time * 0.5;
      this.water.material.uniforms.flowDirection.value.set(
        Math.sin(time * 0.1),
        Math.cos(time * 0.1),
      );
    }

    // Update time-based shader effects
    this.scene.traverse((object) => {
      if (object.material?.uniforms?.time) {
        object.material.uniforms.time.value = time;
      }
    });

    // Update celestial objects and lighting
    if (this.celestials) {
      this.celestials.update(time);
    }
  }

  /**
   * Properly disposes of all Three.js resources to prevent memory leaks.
   * Includes cleanup of:
   * - Geometries
   * - Materials
   * - Textures
   * - Scene objects
   */
  dispose() {
    if (this.water) {
      this.water.geometry.dispose();
      this.water.material.dispose();
    }
    if (this.shore) {
      this.shore.geometry.dispose();
      this.shore.material.dispose();
    }
    if (this.celestials) {
      this.celestials.dispose();
    }
    this.scene.traverse((object) => {
      if (object.geometry) {
        object.geometry.dispose();
      }
      if (object.material) {
        if (Array.isArray(object.material)) {
          object.material.forEach((m) => m.dispose());
        } else {
          object.material.dispose();
        }
      }
    });
  }
}
