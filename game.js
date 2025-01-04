import { SceneManager } from './modules/SceneManager.js';
import { Environment } from './modules/Environment.js';
import { FishManager } from './modules/FishManager.js';
import { FishingRod } from './modules/FishingRod.js';

class Game {
  constructor() {
    this.sceneManager = new SceneManager();
    this.scene = this.sceneManager.init();
    this.environment = new Environment(this.scene);
    this.fishManager = new FishManager(this.scene);
    this.fishingRod = null;

    this.init();
  }

  async init() {
    try {
      // Initialize environment
      this.environment.init();

      // Load fish models
      console.log('Loading fish models...');
      await this.fishManager.loadFishes().catch((error) => {
        console.error('Failed to load fish models:', error);
      });
      console.log('Fish models loaded successfully');

      // Initialize fishing rod
      this.fishingRod = new FishingRod(this.scene);
      this.fishingRod.init();

      // Start animation loop
      this.animate();
    } catch (error) {
      console.error('Game initialization failed:', error);
    }
  }

  animate() {
    const time = performance.now() * 0.001;

    // Update components
    this.environment.update(time);
    this.fishManager.update(time);
    if (this.fishingRod) {
      this.fishingRod.update(time);
    }

    // Render scene
    this.sceneManager.render(() => this.animate());
  }
}

// Start the game when the window loads
window.addEventListener('load', () => {
  console.log('Starting game...');
  new Game();
});
