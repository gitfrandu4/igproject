import * as THREE from 'three';

const GRAB_RADIUS = 0.5;
const CAST_POWER_MAX = 5;

export class FishingRod {
  constructor(scene) {
    this.scene = scene;
    this.rod = null;
    this.line = null;
    this.pointer = null;
    this.isGrabbed = false;
    this.isCasting = false;
    this.castPower = 0;
    this.lineEndPoint = new THREE.Vector3();
    this.hasFishBite = false;
    this.fishBiteTime = 0;
  }

  init() {
    this.createRod();
    this.createLine();
    this.createPointer();
    return this.rod;
  }

  createRod() {
    const rodGeometry = new THREE.CylinderGeometry(0.02, 0.02, 1.5, 8);
    const rodMaterial = new THREE.MeshStandardMaterial({
      color: 0x8b4513,
      roughness: 0.7,
      metalness: 0.3,
    });

    this.rod = new THREE.Mesh(rodGeometry, rodMaterial);
    this.rod.rotation.x = Math.PI / 4;
    this.rod.position.set(0, 1, -0.5);
    this.rod.castShadow = true;
    this.scene.add(this.rod);
  }

  createLine() {
    const lineGeometry = new THREE.BufferGeometry();
    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.6,
    });

    const rodTip = new THREE.Vector3(0, 1.5, 0);
    const waterPoint = new THREE.Vector3(0, -2, 0);
    lineGeometry.setFromPoints([rodTip, waterPoint]);

    this.line = new THREE.Line(lineGeometry, lineMaterial);
    this.rod.add(this.line);
  }

  createPointer() {
    const pointerGeometry = new THREE.CylinderGeometry(0.01, 0, 0.2, 8);
    const pointerMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    this.pointer = new THREE.Mesh(pointerGeometry, pointerMaterial);
    this.pointer.rotation.x = Math.PI / 2;
    this.pointer.position.z = -1;
    this.pointer.visible = false;
    this.rod.add(this.pointer);
  }

  grab(controller = null, controllerPosition = null) {
    if (controller && controllerPosition) {
      const rodPosition = new THREE.Vector3();
      this.rod.getWorldPosition(rodPosition);
      const distance = controllerPosition.distanceTo(rodPosition);

      if (distance <= GRAB_RADIUS) {
        this.isGrabbed = true;
        this.rod.parent = controller;
        this.rod.position.set(0, 0, -0.3);
        this.rod.rotation.set(0, 0, 0);
        console.log(
          `Rod grabbed by controller. Distance: ${distance.toFixed(2)}`,
        );
        return true;
      }
      console.log(`Rod grab attempt failed. Distance: ${distance.toFixed(2)}`);
      return false;
    } else {
      this.isGrabbed = true;
      this.rod.position.set(0, 1.5, -1);
      this.rod.rotation.set(0, 0, 0);
      console.log('Rod grabbed by keyboard');
      return true;
    }
  }

  release() {
    if (!this.isGrabbed) return;

    this.isGrabbed = false;
    if (this.rod.parent !== this.scene) {
      this.scene.attach(this.rod);
      console.log('Rod released');
    }
  }

  startCasting(power = 0) {
    if (!this.isGrabbed) {
      console.log('Cannot cast: rod not grabbed');
      return false;
    }

    this.isCasting = true;
    this.castPower = Math.min(power, CAST_POWER_MAX);
    console.log(`Starting cast with power: ${this.castPower.toFixed(2)}`);
    return true;
  }

  endCasting() {
    if (!this.isCasting) return;

    this.isCasting = false;
    console.log(`Ending cast with final power: ${this.castPower.toFixed(2)}`);
    this.castPower = 0;
  }

  updateLineEnd(point) {
    this.lineEndPoint.copy(point);
    if (this.line) {
      const positions = this.line.geometry.attributes.position.array;
      positions[3] = point.x;
      positions[4] = point.y;
      positions[5] = point.z;
      this.line.geometry.attributes.position.needsUpdate = true;
    }
  }

  update(time) {
    if (!this.isGrabbed) return;

    // Update line physics
    if (this.line && !this.isCasting) {
      const positions = this.line.geometry.attributes.position.array;
      const startPoint = new THREE.Vector3(0, 0, 0);
      const endPoint = new THREE.Vector3(0, -2, 0);

      // Add gentle swaying motion
      endPoint.y += Math.sin(time * 2) * 0.1;
      endPoint.x += Math.sin(time * 1.5) * 0.05;
      endPoint.z += Math.cos(time * 1.5) * 0.05;

      // Add stronger movement if there's a fish bite
      if (this.hasFishBite) {
        const biteIntensity = Math.sin(time * 10) * 0.2;
        endPoint.y += biteIntensity;
        endPoint.x += biteIntensity * 0.5;
      }

      this.line.geometry.setFromPoints([startPoint, endPoint]);
    }

    // Update pointer visibility and scale
    if (this.pointer && this.scene.water) {
      const rodTip = new THREE.Vector3(0, 0.75, 0);
      rodTip.applyMatrix4(this.rod.matrixWorld);

      const rodDirection = new THREE.Vector3(0, 0, -1);
      rodDirection.applyQuaternion(this.rod.quaternion);

      const raycaster = new THREE.Raycaster(rodTip, rodDirection);
      const intersects = raycaster.intersectObject(this.scene.water);

      if (intersects.length > 0) {
        this.pointer.visible = true;
        const distance = rodTip.distanceTo(intersects[0].point);
        this.pointer.scale.z = distance;

        if (!this.isCasting) {
          this.updateLineEnd(intersects[0].point);
        }
      } else {
        this.pointer.visible = false;
      }
    }
  }

  highlightRod(isHighlighted) {
    this.rod.traverse((child) => {
      if (child.isMesh) {
        if (isHighlighted) {
          child.userData.originalMaterial = child.material;
          child.material = new THREE.MeshStandardMaterial({
            color: 0x00ff00,
            transparent: true,
            opacity: 0.3,
            emissive: 0x00ff00,
            emissiveIntensity: 0.3,
          });
        } else if (child.userData.originalMaterial) {
          child.material = child.userData.originalMaterial;
        }
      }
    });
  }

  showFishBite() {
    this.hasFishBite = true;
    this.fishBiteTime = performance.now();

    // Change line color to indicate fish bite
    if (this.line) {
      this.line.material.color.setHex(0xff0000); // Red color
      this.line.material.opacity = 1.0;

      // Add line tension animation
      const originalLineLength =
        this.line.geometry.attributes.position.array[5];
      const animateLine = () => {
        if (!this.hasFishBite) return;

        const time = performance.now();
        const tension = Math.sin(time * 0.01) * 0.2;
        const positions = this.line.geometry.attributes.position.array;
        positions[5] = originalLineLength + tension;
        this.line.geometry.attributes.position.needsUpdate = true;

        requestAnimationFrame(animateLine);
      };

      animateLine();

      // Reset line after 2 seconds if fish not caught
      setTimeout(() => {
        if (this.hasFishBite) {
          this.resetFishBite();
        }
      }, 2000);
    }

    // Add vibration if using a controller
    if (this.rod.parent && this.rod.parent.vibrate) {
      this.rod.parent.vibrate(100);
    }
  }

  resetFishBite() {
    this.hasFishBite = false;
    if (this.line) {
      this.line.material.color.setHex(0xffffff); // Reset to white
      this.line.material.opacity = 0.6;
    }
  }
}
