import * as THREE from 'three';
import { Water } from 'three/addons/objects/Water2.js';
import { Sky } from 'three/addons/objects/Sky.js';
import { grassShader, terrainShader } from './shaders.js';

export class Environment {
  constructor(scene) {
    this.scene = scene;
    this.water = null;
    this.shore = null;
    this.sky = null;
    this.sun = null;
    this.sunPosition = new THREE.Vector3();
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
    } catch (error) {}
  }

  setupEnvironment() {
    this.createLighting();
    this.createSky();
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

    this.sun = new THREE.DirectionalLight(0xffffff, 1);
    this.sun.position.set(0, 50, 0);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.width = 4096;
    this.sun.shadow.mapSize.height = 4096;
    this.sun.shadow.camera.near = 0.5;
    this.sun.shadow.camera.far = 100;
    this.sun.shadow.camera.left = -30;
    this.sun.shadow.camera.right = 30;
    this.sun.shadow.camera.top = 30;
    this.sun.shadow.camera.bottom = -30;
    this.scene.add(this.sun);
  }

  createSky() {
    // Create sky dome
    const skyGeometry = new THREE.SphereGeometry(400, 32, 32);
    const skyMaterial = new THREE.ShaderMaterial({
      uniforms: {
        topColor: { value: new THREE.Color(0x0077ff) },
        bottomColor: { value: new THREE.Color(0x89b2eb) },
        offset: { value: 20 },
        exponent: { value: 0.6 },
        time: { value: 0 },
      },
      vertexShader: `
        varying vec3 vWorldPosition;
        void main() {
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPosition.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 bottomColor;
        uniform float offset;
        uniform float exponent;
        uniform float time;
        varying vec3 vWorldPosition;
        
        void main() {
          float h = normalize(vWorldPosition + offset).y;
          float dayFactor = (sin(time * 0.02) + 1.0) * 0.5;
          vec3 sky = mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0));
          
          // Darken the sky during night
          sky = mix(sky * 0.1, sky, dayFactor);
          
          gl_FragColor = vec4(sky, 1.0);
        }
      `,
      side: THREE.BackSide,
    });

    this.sky = new THREE.Mesh(skyGeometry, skyMaterial);
    this.scene.add(this.sky);

    // Create sun
    const sunGeometry = new THREE.SphereGeometry(20, 32, 32);
    const sunMaterial = new THREE.ShaderMaterial({
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
          float intensity = pow(0.6 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
          intensity *= 1.0 + sin(time * 2.0) * 0.2;
          gl_FragColor = vec4(color, 1.0) * vec4(vec3(1.0), intensity);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
    });
    this.sunSphere = new THREE.Mesh(sunGeometry, sunMaterial);
    this.scene.add(this.sunSphere);

    // Create moon
    const moonGeometry = new THREE.SphereGeometry(15, 32, 32);
    const moonMaterial = new THREE.ShaderMaterial({
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
          float intensity = pow(0.7 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
          intensity *= 0.8 + sin(time) * 0.1;
          gl_FragColor = vec4(color, 1.0) * vec4(vec3(1.0), intensity);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
    });
    this.moonSphere = new THREE.Mesh(moonGeometry, moonMaterial);
    this.scene.add(this.moonSphere);

    // Create stars
    const starsGeometry = new THREE.BufferGeometry();
    const starsVertices = [];
    const starColors = [];

    for (let i = 0; i < 2000; i++) {
      const r = 350;
      const theta = 2 * Math.PI * Math.random();
      const phi = Math.acos(2 * Math.random() - 1);
      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta);
      const z = r * Math.cos(phi);

      starsVertices.push(x, y, z);

      // Random star color (white to slight blue)
      const intensity = 0.5 + Math.random() * 0.5;
      starColors.push(intensity, intensity, intensity + Math.random() * 0.2);
    }

    starsGeometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(starsVertices, 3),
    );
    starsGeometry.setAttribute(
      'color',
      new THREE.Float32BufferAttribute(starColors, 3),
    );

    const starsMaterial = new THREE.PointsMaterial({
      size: 2,
      vertexColors: true,
      transparent: true,
      blending: THREE.AdditiveBlending,
    });

    this.stars = new THREE.Points(starsGeometry, starsMaterial);
    this.scene.add(this.stars);
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

  updateSunPosition(time) {
    if (!this.sky || !this.sunSphere || !this.moonSphere) return;

    // Update sky shader time
    this.sky.material.uniforms.time.value = time;

    // Calculate sun and moon positions
    const angle = time * 0.02;
    const radius = 300;

    // Sun position
    const sunX = Math.cos(angle) * radius;
    const sunY = Math.sin(angle) * radius;
    this.sunSphere.position.set(sunX, sunY, 0);
    this.sunSphere.material.uniforms.time.value = time;

    // Moon position (opposite to sun)
    const moonX = Math.cos(angle + Math.PI) * radius;
    const moonY = Math.sin(angle + Math.PI) * radius;
    this.moonSphere.position.set(moonX, moonY, 0);
    this.moonSphere.material.uniforms.time.value = time;

    // Update stars visibility based on time of day
    if (this.stars) {
      const dayFactor = (Math.sin(time * 0.02) + 1) * 0.5;
      this.stars.material.opacity = 1 - dayFactor;
    }

    // Update directional light
    if (this.sun) {
      this.sun.position
        .copy(this.sunSphere.position)
        .normalize()
        .multiplyScalar(50);
      // Adjust light intensity based on sun height
      this.sun.intensity = Math.max(0.2, Math.sin(angle) * 0.8 + 0.2);
    }
  }

  update(time) {
    this.timeOfDay = time;
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
    this.updateSunPosition(time);
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
