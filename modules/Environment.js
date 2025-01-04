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
    this.setupEnvironment();
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
    // Add ambient light for general illumination
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);

    // Add directional light to simulate sun
    this.sun = new THREE.DirectionalLight(0xffffff, 1);
    this.sun.position.set(0, 10, 0);
    this.sun.castShadow = true;

    // Improve shadow quality
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

    // Set up sun position for nice daytime sky
    const phi = THREE.MathUtils.degToRad(90 - 2);
    const theta = THREE.MathUtils.degToRad(180);
    const sunPosition = new THREE.Vector3();
    sunPosition.setFromSphericalCoords(1, phi, theta);

    skyUniforms['sunPosition'].value.copy(sunPosition);
    this.sun.position.copy(sunPosition).multiplyScalar(10);
  }

  createTerrain() {
    // Create terrain with shader - make it a ring around the water
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
    terrain.position.y = -0.31; // Slightly lower than water to prevent z-fighting
    terrain.renderOrder = 0; // Ensure terrain renders first
    this.scene.add(terrain);
  }

  createWater() {
    // Create a more organic water shape using circle segments
    const waterGeometry = new THREE.CircleGeometry(5, 64);
    const textureLoader = new THREE.TextureLoader();

    // Add error handling for texture loading
    const loadTexture = (path) => {
      return new Promise((resolve, reject) => {
        textureLoader.load(
          path,
          (texture) => {
            // Add texture repetition for better detail
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

    // Load water textures with error handling
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
        this.water.renderOrder = 1; // Ensure water renders after terrain
        this.scene.add(this.water);
      })
      .catch((error) => {
        console.error('Failed to load water textures:', error);
      });
  }

  createGrass() {
    const grassGeometry = new THREE.PlaneGeometry(1, 1, 10, 10);
    const grassMaterial = new THREE.ShaderMaterial({
      vertexShader: grassShader.vertexShader,
      fragmentShader: grassShader.fragmentShader,
      uniforms: {
        time: { value: 0 },
      },
      side: THREE.DoubleSide,
      transparent: true,
    });

    // Add grass patches around the water
    for (let i = 0; i < 200; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 6 + Math.random() * 13; // Between 6 and 19 units from center
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;

      const grass = new THREE.Mesh(grassGeometry, grassMaterial.clone());
      grass.position.set(x, -0.3, z); // Align with terrain
      grass.rotation.x = -Math.PI / 2;
      grass.scale.set(0.3 + Math.random() * 0.4, 0.3 + Math.random() * 0.7, 1);
      this.scene.add(grass);
    }
  }

  createRocks() {
    const rockGeometry = new THREE.DodecahedronGeometry(0.5, 1);
    const rockMaterial = new THREE.MeshStandardMaterial({
      color: 0x808080,
      roughness: 0.9,
      metalness: 0.1,
      normalScale: new THREE.Vector2(1, 1),
    });

    // Add rocks around the water
    for (let i = 0; i < 20; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 6 + Math.random() * 13; // Between 6 and 19 units from center
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;

      const rock = new THREE.Mesh(rockGeometry, rockMaterial);
      rock.position.set(x, -0.3, z);
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
      this.scene.add(rock);
    }
  }

  update(time) {
    // Update water shader
    if (this.water && this.water.material.uniforms) {
      this.water.material.uniforms.config.value.x = time * 0.5;
      this.water.material.uniforms.config.value.y = time * 0.5;
      this.water.material.uniforms.flowDirection.value.set(
        Math.sin(time * 0.1),
        Math.cos(time * 0.1),
      );
    }

    // Update grass and terrain shaders
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
    // Clean up resources
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
