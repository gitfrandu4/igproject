import * as THREE from 'three';
import { Water } from 'three/addons/objects/Water2.js';
import { grassShader, terrainShader } from './shaders/shaders.js';
import { CelestialManager } from './celestials/CelestialManager.js';

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

  async loadTextures() {
    const textureLoader = new THREE.TextureLoader();
    const loadTexture = (path) => {
      return new Promise((resolve, reject) => {
        textureLoader.load(
          path,
          (texture) => {
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

  setupEnvironment() {
    this.createLighting();
    this.createTerrain();
    this.createWater();
    this.createShoreline();
    this.createGrass();
    this.createRocks();
  }

  createLighting() {
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.4);
    this.scene.add(hemiLight);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    this.scene.add(ambientLight);
  }

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

    // Enable texture repetition for the grass texture
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
    Promise.all([
      loadTexture('textures/water/Water_1_M_Normal.jpg'),
      loadTexture('textures/water/Water_2_M_Normal.jpg'),
    ])
      .then(([normalMap0, normalMap1]) => {
        this.water = new Water(waterGeometry, {
          textureWidth: 512,
          textureHeight: 512,
          color: new THREE.Color(0x55ccff), // Lighter blue color
          flowDirection: new THREE.Vector2(1, 1),
          scale: 7,
          flowSpeed: 0.25,
          reflectivity: 0.35, // Reduced reflectivity
          opacity: 0.65, // More transparent
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
    for (let i = 0; i < 1000; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 6 + Math.random() * 44;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const grass = new THREE.Mesh(grassGeometry, grassMaterial.clone());
      grass.position.set(x, -0.3, z);
      grass.rotation.x = -Math.PI / 2;
      grass.scale.set(0.8 + Math.random() * 0.4, 0.8 + Math.random() * 0.7, 1);

      const textureScale = 0.5 + Math.random() * 1.5;
      grass.material.map.repeat.set(textureScale, textureScale);
      grass.material.normalMap.repeat.set(textureScale, textureScale);
      grass.material.roughnessMap.repeat.set(textureScale, textureScale);
      grass.material.aoMap.repeat.set(textureScale, textureScale);

      grass.material.map.rotation = Math.random() * Math.PI;
      grass.material.normalMap.rotation = grass.material.map.rotation;
      grass.material.roughnessMap.rotation = grass.material.map.rotation;
      grass.material.aoMap.rotation = grass.material.map.rotation;

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

      const textureScale = 0.5 + Math.random() * 1.5;
      rock.material.map.repeat.set(textureScale, textureScale);
      rock.material.normalMap.repeat.set(textureScale, textureScale);
      rock.material.roughnessMap.repeat.set(textureScale, textureScale);
      rock.material.aoMap.repeat.set(textureScale, textureScale);

      rock.material.map.rotation = Math.random() * Math.PI;
      rock.material.normalMap.rotation = rock.material.map.rotation;
      rock.material.roughnessMap.rotation = rock.material.map.rotation;
      rock.material.aoMap.rotation = rock.material.map.rotation;

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

  update(time) {
    this.timeOfDay = time;

    // Update water if available
    if (this.water?.material?.uniforms) {
      this.water.material.uniforms.config.value.x = time * 0.5;
      this.water.material.uniforms.config.value.y = time * 0.5;
      this.water.material.uniforms.flowDirection.value.set(
        Math.sin(time * 0.1),
        Math.cos(time * 0.1),
      );
    }

    // Update materials with time uniforms
    this.scene.traverse((object) => {
      if (object.material?.uniforms?.time) {
        object.material.uniforms.time.value = time;
      }
    });

    // Update celestials
    if (this.celestials) {
      this.celestials.update(time);
    }
  }

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
