// Advanced AI World Simulation - Complete Rewrite
// Features: Multi-agent system, dynamic needs, autonomous behavior, intelligent pathfinding

class Agent {
  constructor(x, y, id) {
    this.x = x;
    this.y = y;
    this.id = id;
    this.size = 3; // Smaller agents
    
    // Multi-need system
    this.energy = 100;
    this.hunger = 100;
    this.thirst = 100;
    this.water = 100; // Internal water storage
    
    this.maxEnergy = 100;
    this.maxHunger = 100;
    this.maxThirst = 100;
    this.maxWater = 100;
    
    // Autonomous behavior
    this.targetX = x;
    this.targetY = y;
    this.currentTarget = null; // food, water, rest
    this.state = 'idle'; // idle, moving, eating, drinking, resting
    this.decisionCooldown = 0;
    
    // Movement
    this.speed = 1;
    this.vx = 0;
    this.vy = 0;
    this.maxSpeed = 2;
    
    // Memory and behavior
    this.knownResources = [];
    this.searchRadius = 100;
    this.age = 0;
    this.energy_spent = 0;
  }
  
  update(world) {
    this.age++;
    this.decisionCooldown--;
    
    // Decay needs over time
    this.energy -= 0.15;
    this.hunger -= 0.12;
    this.thirst -= 0.18;
    this.water -= 0.1;
    
    // Movement costs energy
    if (this.vx !== 0 || this.vy !== 0) {
      this.energy -= 0.05;
      this.energy_spent += 0.05;
    }
    
    // Make decisions based on needs
    if (this.decisionCooldown <= 0) {
      this.makeDecision(world);
      this.decisionCooldown = Math.random() * 20 + 10;
    }
    
    // Execute current behavior
    this.executeBehavior(world);
    
    // Clamp needs
    this.energy = Math.max(0, Math.min(this.maxEnergy, this.energy));
    this.hunger = Math.max(0, Math.min(this.maxHunger, this.hunger));
    this.thirst = Math.max(0, Math.min(this.maxThirst, this.thirst));
    this.water = Math.max(0, Math.min(this.maxWater, this.water));
  }
  
  makeDecision(world) {
    // Priority-based decision making
    if (this.thirst < 30) {
      this.seekWater(world);
    } else if (this.hunger < 30) {
      this.seekFood(world);
    } else if (this.energy < 40) {
      this.seekRest();
    } else {
      this.explore(world);
    }
  }
  
  seekWater(world) {
    const nearestWater = this.findNearestResource(world, 'water');
    if (nearestWater) {
      this.currentTarget = nearestWater;
      this.state = 'moving';
      this.pathfindTo(nearestWater.x, nearestWater.y, world);
    } else {
      this.explore(world);
    }
  }
  
  seekFood(world) {
    const nearestFood = this.findNearestResource(world, 'food');
    if (nearestFood) {
      this.currentTarget = nearestFood;
      this.state = 'moving';
      this.pathfindTo(nearestFood.x, nearestFood.y, world);
    } else {
      this.explore(world);
    }
  }
  
  seekRest() {
    this.state = 'resting';
    this.vx = 0;
    this.vy = 0;
  }
  
  explore(world) {
    // Random exploration with slight bias toward finding resources
    if (Math.random() < 0.1) {
      this.targetX = Math.random() * world.width;
      this.targetY = Math.random() * world.height;
    }
    this.state = 'moving';
  }
  
  findNearestResource(world, type) {
    let nearest = null;
    let minDist = this.searchRadius;
    
    const resources = type === 'food' ? world.food : world.waterTiles;
    
    for (let resource of resources) {
      const dist = this.distance(this.x, this.y, resource.x, resource.y);
      if (dist < minDist) {
        minDist = dist;
        nearest = resource;
      }
    }
    
    return nearest;
  }
  
  pathfindTo(tx, ty, world) {
    // Simple A* influenced pathfinding
    const dx = tx - this.x;
    const dy = ty - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    if (dist > 2) {
      this.vx = (dx / dist) * this.maxSpeed;
      this.vy = (dy / dist) * this.maxSpeed;
    }
  }
  
  executeBehavior(world) {
    switch (this.state) {
      case 'moving':
        this.move(world);
        this.checkResourceInteraction(world);
        break;
      case 'eating':
        this.eat(world);
        break;
      case 'drinking':
        this.drink(world);
        break;
      case 'resting':
        this.rest();
        break;
    }
  }
  
  move(world) {
    // Update position
    this.x += this.vx;
    this.y += this.vy;
    
    // Wrap around world
    if (this.x < 0) this.x = world.width;
    if (this.x > world.width) this.x = 0;
    if (this.y < 0) this.y = world.height;
    if (this.y > world.height) this.y = 0;
  }
  
  checkResourceInteraction(world) {
    // Check for food
    for (let i = world.food.length - 1; i >= 0; i--) {
      const food = world.food[i];
      if (this.distance(this.x, this.y, food.x, food.y) < 8) {
        this.state = 'eating';
        this.currentTarget = food;
        return;
      }
    }
    
    // Check for water
    for (let i = world.waterTiles.length - 1; i >= 0; i--) {
      const water = world.waterTiles[i];
      if (this.distance(this.x, this.y, water.x, water.y) < 8) {
        this.state = 'drinking';
        this.currentTarget = water;
        return;
      }
    }
  }
  
  eat(world) {
    if (!this.currentTarget) {
      this.state = 'idle';
      return;
    }
    
    this.hunger = Math.min(this.maxHunger, this.hunger + 2);
    this.energy -= 0.5; // Eating costs energy
    
    // Remove food when eaten
    const idx = world.food.indexOf(this.currentTarget);
    if (idx !== -1) {
      world.food.splice(idx, 1);
      this.currentTarget = null;
      this.state = 'idle';
    }
  }
  
  drink(world) {
    if (!this.currentTarget) {
      this.state = 'idle';
      return;
    }
    
    this.thirst = Math.min(this.maxThirst, this.thirst + 3);
    this.water = Math.min(this.maxWater, this.water + 2);
    this.energy -= 0.3;
  }
  
  rest() {
    // Resting restores energy
    this.energy = Math.min(this.maxEnergy, this.energy + 1.5);
    this.vx = 0;
    this.vy = 0;
    
    // Can't rest if too hungry or thirsty
    if (this.hunger < 20 || this.thirst < 20) {
      this.state = 'idle';
    }
  }
  
  distance(x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
  }
  
  isAlive() {
    return this.energy > 0 && this.hunger > 0 && this.thirst > 0;
  }
  
  draw(ctx) {
    // Draw agent body
    ctx.fillStyle = `hsl(${this.energy * 3.6}, 80%, 50%)`;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw need indicators as bars above agent
    const barWidth = 12;
    const barHeight = 2;
    const barGap = 1;
    const startY = this.y - 10;
    
    // Energy bar (red to green)
    ctx.fillStyle = `rgb(${255 * (1 - this.energy / 100)}, ${255 * (this.energy / 100)}, 0)`;
    ctx.fillRect(this.x - barWidth/2, startY, (barWidth * this.energy / 100), barHeight);
    ctx.strokeStyle = '#333';
    ctx.strokeRect(this.x - barWidth/2, startY, barWidth, barHeight);
    
    // Hunger bar (brown)
    ctx.fillStyle = `rgb(${139 * (1 - this.hunger / 100)}, 69, 19)`;
    ctx.fillRect(this.x - barWidth/2, startY + barHeight + barGap, (barWidth * this.hunger / 100), barHeight);
    ctx.strokeRect(this.x - barWidth/2, startY + barHeight + barGap, barWidth, barHeight);
    
    // Thirst bar (blue)
    ctx.fillStyle = `rgb(0, ${100 + 155 * (this.thirst / 100)}, 255)`;
    ctx.fillRect(this.x - barWidth/2, startY + (barHeight + barGap) * 2, (barWidth * this.thirst / 100), barHeight);
    ctx.strokeRect(this.x - barWidth/2, startY + (barHeight + barGap) * 2, barWidth, barHeight);
  }
}

class World {
  constructor(width = 1600, height = 1000) {
    this.width = width;
    this.height = height;
    this.agents = [];
    this.food = [];
    this.waterTiles = [];
    this.tick = 0;
    
    // Initialize agents (smaller population, more manageable)
    for (let i = 0; i < 25; i++) {
      const agent = new Agent(
        Math.random() * width,
        Math.random() * height,
        i
      );
      this.agents.push(agent);
    }
    
    // Spawn initial resources
    this.spawnFood(40);
    this.spawnWater(12);
  }
  
  spawnFood(count) {
    for (let i = 0; i < count; i++) {
      this.food.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        size: 4,
        type: 'food'
      });
    }
  }
  
  spawnWater(count) {
    for (let i = 0; i < count; i++) {
      this.waterTiles.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        width: 40 + Math.random() * 60,
        height: 40 + Math.random() * 60,
        type: 'water'
      });
    }
  }
  
  update() {
    // Update all agents
    for (let agent of this.agents) {
      agent.update(this);
    }
    
    // Remove dead agents
    this.agents = this.agents.filter(a => a.isAlive());
    
    // Spawn new resources periodically
    if (this.tick % 120 === 0) {
      this.spawnFood(Math.floor(Math.random() * 3) + 1);
    }
    if (this.tick % 180 === 0) {
      this.spawnWater(1);
    }
    
    // Spawn new agents from surviving population (reproduction)
    if (this.tick % 300 === 0 && this.agents.length > 5 && this.agents.length < 50) {
      const bestAgent = this.agents.reduce((best, agent) => 
        agent.energy > best.energy ? agent : best
      );
      const newAgent = new Agent(bestAgent.x + Math.random() * 20 - 10, bestAgent.y + Math.random() * 20 - 10, this.agents.length);
      this.agents.push(newAgent);
    }
    
    this.tick++;
  }
  
  draw(ctx) {
    // Clear canvas with gradient background
    const gradient = ctx.createLinearGradient(0, 0, this.width, this.height);
    gradient.addColorStop(0, '#87CEEB');
    gradient.addColorStop(1, '#E0F6FF');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.width, this.height);
    
    // Draw water tiles
    ctx.fillStyle = 'rgba(0, 100, 200, 0.6)';
    for (let water of this.waterTiles) {
      ctx.fillRect(water.x, water.y, water.width, water.height);
      ctx.strokeStyle = 'rgba(0, 80, 160, 0.8)';
      ctx.lineWidth = 2;
      ctx.strokeRect(water.x, water.y, water.width, water.height);
      
      // Water wave effect
      ctx.strokeStyle = 'rgba(100, 150, 255, 0.3)';
      ctx.lineWidth = 1;
      for (let i = 0; i < 3; i++) {
        ctx.strokeRect(water.x + 5 + i * 3, water.y + 5 + i * 3, water.width - 10 - i * 6, water.height - 10 - i * 6);
      }
    }
    
    // Draw food
    for (let f of this.food) {
      ctx.fillStyle = '#FF6B35';
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#CC5520';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    
    // Draw agents
    for (let agent of this.agents) {
      agent.draw(ctx);
    }
  }
}

// Renderer and main loop
class Renderer {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.world = new World(this.canvas.width, this.canvas.height);
    this.stats = {
      agents: 0,
      food: 0,
      water: 0,
      avgEnergy: 0,
      avgHunger: 0,
      avgThirst: 0,
      avgAge: 0
    };
  }
  
  update() {
    this.world.update();
    this.updateStats();
  }
  
  updateStats() {
    this.stats.agents = this.world.agents.length;
    this.stats.food = this.world.food.length;
    this.stats.water = this.world.waterTiles.length;
    
    if (this.world.agents.length > 0) {
      this.stats.avgEnergy = (this.world.agents.reduce((sum, a) => sum + a.energy, 0) / this.world.agents.length).toFixed(1);
      this.stats.avgHunger = (this.world.agents.reduce((sum, a) => sum + a.hunger, 0) / this.world.agents.length).toFixed(1);
      this.stats.avgThirst = (this.world.agents.reduce((sum, a) => sum + a.thirst, 0) / this.world.agents.length).toFixed(1);
      this.stats.avgAge = (this.world.agents.reduce((sum, a) => sum + a.age, 0) / this.world.agents.length).toFixed(0);
    }
  }
  
  draw() {
    this.world.draw(this.ctx);
    this.drawUI();
  }
  
  drawUI() {
    // Semi-transparent background for stats
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    this.ctx.fillRect(10, 10, 280, 160);
    
    // Draw stats text
    this.ctx.fillStyle = '#fff';
    this.ctx.font = 'bold 14px Arial';
    this.ctx.fillText('🌍 WORLD SIMULATION', 20, 30);
    
    this.ctx.font = '12px Arial';
    this.ctx.fillText(`🐜 Agents: ${this.stats.agents}`, 20, 50);
    this.ctx.fillText(`🍎 Food: ${this.stats.food}`, 20, 65);
    this.ctx.fillText(`💧 Water: ${this.stats.water}`, 20, 80);
    this.ctx.fillText(`⚡ Avg Energy: ${this.stats.avgEnergy}`, 20, 95);
    this.ctx.fillText(`🍖 Avg Hunger: ${this.stats.avgHunger}`, 20, 110);
    this.ctx.fillText(`🥤 Avg Thirst: ${this.stats.avgThirst}`, 20, 125);
    this.ctx.fillText(`📅 Avg Age: ${this.stats.avgAge}`, 20, 140);
    this.ctx.fillText(`⏱️ Tick: ${this.world.tick}`, 20, 155);
  }
  
  animate() {
    this.update();
    this.draw();
    requestAnimationFrame(() => this.animate());
  }
}

// Initialize and start the simulation
window.addEventListener('DOMContentLoaded', () => {
  const renderer = new Renderer('canvas');
  renderer.animate();
  
  // Add keyboard controls for spawning resources
  document.addEventListener('keydown', (e) => {
    if (e.key === 'f' || e.key === 'F') {
      renderer.world.spawnFood(5);
    }
    if (e.key === 'w' || e.key === 'W') {
      renderer.world.spawnWater(1);
    }
    if (e.key === 'r' || e.key === 'R') {
      // Reset simulation
      renderer.world = new World(renderer.canvas.width, renderer.canvas.height);
    }
  });
  
  console.log('Simulation started!');
  console.log('Controls: F - Spawn food, W - Spawn water, R - Reset');
});