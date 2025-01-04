import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { XRControllerModelFactory } from 'three/addons/webxr/XRControllerModelFactory.js';
import { SceneManager } from './modules/SceneManager.js';
import { Environment } from './modules/Environment.js';
import { FishingRod } from './modules/FishingRod.js';
import { FishManager } from './modules/FishManager.js';

class Game {
  constructor() {
    this.sceneManager = new SceneManager();
    this.environment = null;
    this.fishingRod = null;
    this.fishManager = null;
    this.controllerR = null;
    this.controllerL = null;
    this.objects = [];

    // Game state
    this.isRodGrabbed = false;
    this.isCasting = false;
    this.debugMode = false;
    this.debugInfo = null;

    // Keyboard state
    this.keyboardState = {
      isGrabbing: false,
      moveForward: false,
      moveBackward: false,
      moveLeft: false,
      moveRight: false,
      moveUp: false,
      moveDown: false,
    };

    this.init();
  }

  async init() {
    try {
      // Initialize environment
      this.environment = new Environment(this.sceneManager.scene);

      // Initialize fishing rod
      this.fishingRod = new FishingRod(this.sceneManager.scene);
      const rod = await this.fishingRod.init();
      this.objects.push(rod);

      // Initialize fish manager
      this.fishManager = new FishManager(this.sceneManager.scene);
      await this.fishManager.init();

      // Setup VR controllers
      this.setupVRControllers();

      // Setup keyboard controls
      this.setupKeyboardControls();

      // Initialize VR
      this.sceneManager.initVR();

      // Start animation loop
      this.sceneManager.startAnimation(() => this.update());

      console.log('Game initialized successfully');
    } catch (error) {
      console.error('Error initializing game:', error);
    }
  }

  setupVRControllers() {
    const controllerModelFactory = new XRControllerModelFactory();

    // Right Controller
    this.controllerR = this.sceneManager.renderer.xr.getController(0);
    const controllerGripR = this.sceneManager.renderer.xr.getControllerGrip(0);

    // Add ray line to controller
    const geometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, -1),
    ]);
    const line = new THREE.Line(geometry);
    line.name = 'line';
    line.scale.z = 5;
    this.controllerR.add(line);

    // Controller event listeners
    this.controllerR.addEventListener('connected', (event) => {
      const hasHand = event.data.hand;
      if (line) line.visible = !hasHand;
      // Show grab sphere when controller is connected
      if (this.fishingRod && this.fishingRod.grabSphere) {
        this.fishingRod.grabSphere.visible = true;
      }
    });

    this.controllerR.addEventListener('disconnected', () => {
      // Hide grab sphere when controller is disconnected
      if (this.fishingRod && this.fishingRod.grabSphere) {
        this.fishingRod.grabSphere.visible = false;
      }
    });

    this.controllerR.addEventListener('selectstart', () =>
      this.onSelectStart(),
    );
    this.controllerR.addEventListener('selectend', () => this.onSelectEnd());
    this.controllerR.addEventListener('squeezestart', () =>
      this.onSqueezeStart(),
    );
    this.controllerR.addEventListener('squeezeend', () => this.onSqueezeEnd());

    this.sceneManager.add(this.controllerR);
    this.sceneManager.add(controllerGripR);

    // Left Controller
    this.controllerL = this.sceneManager.renderer.xr.getController(1);
    const controllerGripL = this.sceneManager.renderer.xr.getControllerGrip(1);
    this.sceneManager.add(this.controllerL);
    this.sceneManager.add(controllerGripL);

    // Add controller models
    controllerGripR.add(
      controllerModelFactory.createControllerModel(controllerGripR),
    );
    controllerGripL.add(
      controllerModelFactory.createControllerModel(controllerGripL),
    );
  }

  setupKeyboardControls() {
    document.addEventListener('keydown', (event) => {
      switch (event.code) {
        case 'KeyR':
          this.resetGame();
          break;
        case 'KeyD':
          this.toggleDebugMode();
          break;
        case 'Space':
          if (this.keyboardState.isGrabbing) {
            this.onSqueezeStart();
          }
          break;
        case 'KeyE':
          if (!this.keyboardState.isGrabbing) {
            this.keyboardState.isGrabbing = true;
            this.onSelectStart();
          }
          break;
        case 'KeyW':
          this.keyboardState.moveForward = true;
          break;
        case 'KeyS':
          this.keyboardState.moveBackward = true;
          break;
        case 'KeyA':
          this.keyboardState.moveLeft = true;
          break;
        case 'KeyD':
          this.keyboardState.moveRight = true;
          break;
        case 'KeyQ':
          this.keyboardState.moveUp = true;
          break;
        case 'KeyZ':
          this.keyboardState.moveDown = true;
          break;
        case 'KeyF':
          if (this.caughtFish) {
            this.fishManager.catchFish(this.caughtFish);
          }
          break;
      }
    });

    document.addEventListener('keyup', (event) => {
      switch (event.code) {
        case 'Space':
          this.onSqueezeEnd();
          break;
        case 'KeyE':
          this.keyboardState.isGrabbing = false;
          this.onSelectEnd();
          break;
        case 'KeyW':
          this.keyboardState.moveForward = false;
          break;
        case 'KeyS':
          this.keyboardState.moveBackward = false;
          break;
        case 'KeyA':
          this.keyboardState.moveLeft = false;
          break;
        case 'KeyD':
          this.keyboardState.moveRight = false;
          break;
        case 'KeyQ':
          this.keyboardState.moveUp = false;
          break;
        case 'KeyZ':
          this.keyboardState.moveDown = false;
          break;
      }
    });
  }

  onSelectStart() {
    const controllerPos = new THREE.Vector3();
    this.controllerR?.getWorldPosition(controllerPos);

    if (this.fishingRod.grab(this.controllerR, controllerPos)) {
      this.isRodGrabbed = true;
    }
  }

  onSelectEnd() {
    if (this.isRodGrabbed) {
      const landingPosition = this.fishingRod.release();

      // If we have a caught fish, throw it
      const caughtFish = this.fishManager.getCaughtFish();
      if (caughtFish && landingPosition) {
        this.fishManager.throwFish(caughtFish, landingPosition);
      }

      this.isRodGrabbed = false;
    }
  }

  onSqueezeStart() {
    if (this.isRodGrabbed && !this.isCasting) {
      this.fishingRod.startCasting();
    }
  }

  onSqueezeEnd() {
    if (this.isRodGrabbed) {
      this.fishingRod.endCasting();
    }
  }

  update() {
    const time = performance.now() * 0.001;

    // Update environment
    this.environment?.update(time);

    // Update fish
    this.fishManager?.update(time, this.fishingRod?.lineEndPoint);

    // Update fishing rod
    if (this.fishingRod) {
      this.fishingRod.update(time, this.controllerR);

      // Check for fish near the line only when casting
      if (this.fishingRod.isCasting) {
        const nearbyFish = this.fishManager.checkForNearbyFish(
          this.fishingRod.lineEndPoint,
        );
        if (nearbyFish) {
          this.fishingRod.showFishBite();
        }
      }
    }

    // Update debug info
    if (this.debugMode && this.debugInfo) {
      const caughtFish = this.fishManager?.getCaughtFish();
      const fps = Math.round(1 / (time - (this.lastTime || time)));

      this.debugInfo.innerHTML = `
🎮 DEBUG INFO ${'-'.repeat(20)}
FPS: ${fps} ${fps < 30 ? '⚠️' : '✅'}
ROD STATUS:
  Grabbed: ${this.isRodGrabbed ? '✅ YES' : '❌ NO'}
  Casting: ${this.fishingRod?.isCasting ? '🎣 YES' : '❌ NO'}
  Has Bite: ${this.fishingRod?.hasFishBite ? '🐟 YES' : '❌ NO'}

FISH STATUS:
  Total Fish: ${this.fishManager?.getFishes().length || 0} 🐠
  Fish Caught: ${caughtFish ? '🎯 YES' : '❌ NO'}
${
  caughtFish
    ? `  Position: (${caughtFish.position
        .toArray()
        .map((v) => v.toFixed(2))
        .join(', ')}) 📍`
    : ''
}

CONTROLS:
  [E] Grab/Release Rod
  [SPACE] Cast Line
  [WASD] Move Rod
  [QZ] Up/Down
  [R] Reset Game
  [D] Toggle Debug
${'-'.repeat(30)}`;

      this.lastTime = time;
    }

    // Update keyboard-based rod movement
    if (this.isRodGrabbed && this.keyboardState.isGrabbing) {
      this.updateKeyboardMovement();
    }
  }

  updateKeyboardMovement() {
    const moveSpeed = 0.05;
    const rod = this.fishingRod.rod;

    if (this.keyboardState.moveForward) rod.position.z -= moveSpeed;
    if (this.keyboardState.moveBackward) rod.position.z += moveSpeed;
    if (this.keyboardState.moveLeft) rod.position.x -= moveSpeed;
    if (this.keyboardState.moveRight) rod.position.x += moveSpeed;
    if (this.keyboardState.moveUp) rod.position.y += moveSpeed;
    if (this.keyboardState.moveDown) rod.position.y -= moveSpeed;

    // Update rod rotation based on movement
    if (
      this.keyboardState.moveForward ||
      this.keyboardState.moveBackward ||
      this.keyboardState.moveLeft ||
      this.keyboardState.moveRight
    ) {
      const direction = new THREE.Vector3();
      if (this.keyboardState.moveForward) direction.z -= 1;
      if (this.keyboardState.moveBackward) direction.z += 1;
      if (this.keyboardState.moveLeft) direction.x -= 1;
      if (this.keyboardState.moveRight) direction.x += 1;

      if (direction.length() > 0) {
        direction.normalize();
        const targetRotation = Math.atan2(direction.x, direction.z);
        rod.rotation.y = targetRotation;
      }
    }
  }

  dispose() {
    // Clean up resources
    this.sceneManager?.dispose();
    this.environment?.dispose();
    this.fishManager?.dispose();

    // Remove event listeners
    this.controllerR?.removeEventListener('selectstart', this.onSelectStart);
    this.controllerR?.removeEventListener('selectend', this.onSelectEnd);
    this.controllerR?.removeEventListener('squeezestart', this.onSqueezeStart);
    this.controllerR?.removeEventListener('squeezeend', this.onSqueezeEnd);
  }

  resetGame() {
    console.log('Resetting game...');

    // Reset fish manager
    if (this.fishManager) {
      // Remove all fish from the scene
      const allFish = this.fishManager.getFishes();
      allFish.forEach((fish) => {
        this.fishManager.removeFish(fish);
      });

      // Reinitialize fish
      this.fishManager.init();
    }

    // Reset fishing rod
    if (this.fishingRod) {
      this.fishingRod.release();
      this.fishingRod.resetFishBite();
      this.isRodGrabbed = false;
      this.isCasting = false;
    }

    console.log('Game reset complete');
  }

  toggleDebugMode() {
    this.debugMode = !this.debugMode;
    console.log(`Debug mode: ${this.debugMode ? 'ON' : 'OFF'}`);

    if (this.debugMode) {
      // Create debug info display
      if (!this.debugInfo) {
        this.debugInfo = document.createElement('div');
        this.debugInfo.style.position = 'fixed';
        this.debugInfo.style.top = '20px';
        this.debugInfo.style.left = '20px';
        this.debugInfo.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        this.debugInfo.style.color = '#00ff00';
        this.debugInfo.style.padding = '15px';
        this.debugInfo.style.fontFamily = 'monospace';
        this.debugInfo.style.fontSize = '16px';
        this.debugInfo.style.zIndex = '1000';
        this.debugInfo.style.borderRadius = '5px';
        this.debugInfo.style.border = '1px solid #00ff00';
        this.debugInfo.style.boxShadow = '0 0 10px rgba(0, 255, 0, 0.3)';
        this.debugInfo.style.whiteSpace = 'pre';
        document.body.appendChild(this.debugInfo);
      }
      this.debugInfo.style.display = 'block';

      // Enable debug mode in managers
      this.fishManager?.setDebugMode(true);
      this.fishingRod?.setDebugMode(true);
    } else {
      // Hide debug info
      if (this.debugInfo) {
        this.debugInfo.style.display = 'none';
      }
      this.fishManager?.setDebugMode(false);
      this.fishingRod?.setDebugMode(false);
    }
  }
}

// Initialize Ammo.js and start the game
Ammo()
  .then(() => {
    const game = new Game();
    window.game = game; // For debugging
  })
  .catch((error) => {
    console.error('Error loading Ammo.js:', error);
  });
