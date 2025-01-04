import * as THREE from 'three';
import { Water } from 'three/addons/objects/Water2.js';
import { Sky } from 'three/addons/objects/Sky.js';
import { grassShader, terrainShader } from './shaders.js';

export class Environment {
  constructor(scene) {
    this.scene = scene;
    this.water = null;
    this.sky = null;
    this.sun = null;
    this.textures = {};
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
            console.error(`Error loading texture ${path}:`, error);
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
      console.error('Error loading textures:', error);
    }
  }

  setupEnvironment() {
    this.createLighting();
    this.createSky();
    this.createTerrain();
    this.createWater();
    this.createGrass();
    this.createRocks();
  }

  createLighting() {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);

    this.sun = new THREE.DirectionalLight(0xffffff, 1);
    this.sun.position.set(0, 10, 0);
    this.sun.castShadow = true;

    this.sun.shadow.mapSize.width = 2048;
    this.sun.shadow.mapSize.height = 2048;
    this.sun.shadow.camera.near = 0.5;
    this.sun.shadow.camera.far = 50;
    this.sun.shadow.camera.left = -10;
    this.sun.shadow.camera.right = 10;
    this.sun.shadow.camera.top = 10;
    this.sun.shadow.camera.bottom = -10;

    this.scene.add(this.sun);
  }

  createSky() {
    this.sky = new Sky();
    this.sky.scale.setScalar(450000);
    this.scene.add(this.sky);

    const skyUniforms = this.sky.material.uniforms;
    skyUniforms['turbidity'].value = 10;
    skyUniforms['rayleigh'].value = 2;
    skyUniforms['mieCoefficient'].value = 0.005;
    skyUniforms['mieDirectionalG'].value = 0.8;

    const phi = THREE.MathUtils.degToRad(90 - 2);
    const theta = THREE.MathUtils.degToRad(180);
    const sunPosition = new THREE.Vector3();
    sunPosition.setFromSphericalCoords(1, phi, theta);

    skyUniforms['sunPosition'].value.copy(sunPosition);
    this.sun.position.copy(sunPosition).multiplyScalar(10);
  }

  createTerrain() {
    const terrainGeometry = new THREE.RingGeometry(5.5, 20, 64, 8);
    const terrainMaterial = new THREE.ShaderMaterial({
      vertexShader: terrainShader.vertexShader,
      fragmentShader: terrainShader.fragmentShader,
      uniforms: {
        time: { value: 0 },
      },
    });
    const terrain = new THREE.Mesh(terrainGeometry, terrainMaterial);
    terrain.rotation.x = -Math.PI / 2;
    terrain.position.y = -0.31;
    terrain.renderOrder = 0;
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
            console.error(`Error loading texture ${path}:`, error);
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
          color: 0x0064ff,
          flowDirection: new THREE.Vector2(1, 1),
          scale: 4,
          flowSpeed: 0.1,
          reflectivity: 0.5,
          opacity: 0.8,
          normalMap0,
          normalMap1,
        });

        this.water.position.y = -0.3;
        this.water.rotation.x = -Math.PI / 2;
        this.water.renderOrder = 1;
        this.scene.add(this.water);
      })
      .catch((error) => {
        console.error('Failed to load water textures:', error);
      });
  }

  createGrass() {
    const grassGeometry = new THREE.PlaneGeometry(1, 1, 32, 32);
    const grassMaterial = new THREE.MeshStandardMaterial({
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
      const radius = 6 + Math.random() * 13;
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
      const radius = 6 + Math.random() * 13;
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

      rock.castShadow = true;
      rock.receiveShadow = true;
      this.scene.add(rock);
    }
  }

  update(time) {
    if (this.water && this.water.material.uniforms) {
      this.water.material.uniforms.config.value.x = time * 0.5;
      this.water.material.uniforms.config.value.y = time * 0.5;
      this.water.material.uniforms.flowDirection.value.set(
        Math.sin(time * 0.1),
        Math.cos(time * 0.1),
      );
    }

    this.scene.traverse((object) => {
      if (
        object.material &&
        object.material.uniforms &&
        object.material.uniforms.time
      ) {
        object.material.uniforms.time.value = time;
      }
    });
  }

  dispose() {
    if (this.water) {
      this.water.geometry.dispose();
      this.water.material.dispose();
    }

    this.scene.traverse((object) => {
      if (object.geometry) {
        object.geometry.dispose();
      }
      if (object.material) {
        if (Array.isArray(object.material)) {
          object.material.forEach((material) => material.dispose());
        } else {
          object.material.dispose();
        }
      }
    });
  }
}
