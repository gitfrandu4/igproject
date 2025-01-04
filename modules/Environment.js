import * as THREE from 'three';
import { waterShader, grassShader, terrainShader } from './shaders.js';

export class Environment {
  constructor(scene) {
    this.scene = scene;
    this.water = null;
    this.causticsTex = null;
  }

  init() {
    this.createTerrain();
    this.createWater();
    this.createGrass();
    this.createRocks();
  }

  createCausticsTexture() {
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    for (let i = 0; i < 50; i++) {
      ctx.beginPath();
      const x = Math.random() * size;
      const y = Math.random() * size;
      const radius = Math.random() * 50 + 20;
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
      gradient.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
      gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = gradient;
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }

    return new THREE.CanvasTexture(canvas);
  }

  createWater() {
    const waterGeometry = new THREE.PlaneGeometry(10, 10, 100, 100);
    this.causticsTex = this.createCausticsTexture();

    const waterMaterial = new THREE.ShaderMaterial({
      vertexShader: waterShader.vertexShader,
      fragmentShader: waterShader.fragmentShader,
      uniforms: {
        time: { value: 0 },
        sunDirection: { value: new THREE.Vector3(0.5, 0.5, 0) },
        causticsTex: { value: this.causticsTex },
      },
      transparent: true,
      side: THREE.DoubleSide,
    });

    this.water = new THREE.Mesh(waterGeometry, waterMaterial);
    this.water.rotation.x = -Math.PI / 2;
    this.water.position.y = -0.3;
    this.scene.add(this.water);
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
    terrain.position.y = -0.3;
    this.scene.add(terrain);
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

    for (let i = 0; i < 200; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 6 + Math.random() * 13;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;

      const grass = new THREE.Mesh(grassGeometry, grassMaterial.clone());
      grass.position.set(x, -0.3, z);
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

    for (let i = 0; i < 20; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 6 + Math.random() * 13;
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
    if (this.water && this.water.material.uniforms) {
      this.water.material.uniforms.time.value = time;
    }

    // Update all grass shaders
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
}
