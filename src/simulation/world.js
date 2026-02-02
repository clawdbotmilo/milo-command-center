/**
 * World State and Building Management
 * Manages the 256x256 grid, buildings, and terrain
 */

// Grid constants
export const GRID_SIZE = 256;
export const TILE_TYPES = {
  GRASS: 'grass',
  PATH: 'path',
  WATER: 'water',
  BUILDING: 'building',
  TREE: 'tree',
  FIELD: 'field'
};

// Building definitions with their footprints and purposes
export const BUILDING_TYPES = {
  COTTAGE: { width: 3, height: 3, type: 'residence' },
  TAVERN: { width: 5, height: 4, type: 'social' },
  BLACKSMITH: { width: 4, height: 3, type: 'work' },
  BAKERY: { width: 3, height: 3, type: 'work' },
  CHURCH: { width: 5, height: 6, type: 'spiritual' },
  MARKET: { width: 6, height: 4, type: 'commerce' },
  WELL: { width: 1, height: 1, type: 'utility' },
  FARM: { width: 8, height: 6, type: 'work' },
  LIBRARY: { width: 4, height: 3, type: 'learning' }
};

/**
 * World class - manages all terrain, buildings, and spatial queries
 */
export class World {
  constructor() {
    this.width = GRID_SIZE;
    this.height = GRID_SIZE;
    this.grid = this.initializeGrid();
    this.buildings = new Map(); // id -> building data
    this.buildingGrid = new Map(); // "x,y" -> building id
    this.pointsOfInterest = []; // Notable locations
  }

  /**
   * Initialize empty grid with grass
   */
  initializeGrid() {
    const grid = [];
    for (let y = 0; y < this.height; y++) {
      grid[y] = [];
      for (let x = 0; x < this.width; x++) {
        grid[y][x] = {
          type: TILE_TYPES.GRASS,
          walkable: true,
          buildingId: null
        };
      }
    }
    return grid;
  }

  /**
   * Get tile at position
   */
  getTile(x, y) {
    if (!this.isInBounds(x, y)) return null;
    return this.grid[y][x];
  }

  /**
   * Check if position is within grid bounds
   */
  isInBounds(x, y) {
    return x >= 0 && x < this.width && y >= 0 && y < this.height;
  }

  /**
   * Check if a tile is walkable
   */
  isWalkable(x, y) {
    const tile = this.getTile(x, y);
    return tile && tile.walkable;
  }

  /**
   * Place a building on the grid
   */
  placeBuilding(id, buildingType, x, y, data = {}) {
    const template = BUILDING_TYPES[buildingType];
    if (!template) {
      console.warn(`Unknown building type: ${buildingType}`);
      return false;
    }

    // Check if space is available
    for (let dy = 0; dy < template.height; dy++) {
      for (let dx = 0; dx < template.width; dx++) {
        const tile = this.getTile(x + dx, y + dy);
        if (!tile || tile.buildingId) {
          console.warn(`Cannot place ${buildingType} at (${x}, ${y}) - space occupied`);
          return false;
        }
      }
    }

    // Create building record
    const building = {
      id,
      type: buildingType,
      category: template.type,
      x,
      y,
      width: template.width,
      height: template.height,
      entrance: { x: x + Math.floor(template.width / 2), y: y + template.height },
      ...data
    };

    this.buildings.set(id, building);

    // Mark tiles as building
    for (let dy = 0; dy < template.height; dy++) {
      for (let dx = 0; dx < template.width; dx++) {
        const tileX = x + dx;
        const tileY = y + dy;
        this.grid[tileY][tileX] = {
          type: TILE_TYPES.BUILDING,
          walkable: false,
          buildingId: id
        };
        this.buildingGrid.set(`${tileX},${tileY}`, id);
      }
    }

    // Add entrance as point of interest
    this.pointsOfInterest.push({
      type: template.type,
      buildingId: id,
      x: building.entrance.x,
      y: building.entrance.y
    });

    return true;
  }

  /**
   * Get building by ID
   */
  getBuilding(id) {
    return this.buildings.get(id);
  }

  /**
   * Get building at position
   */
  getBuildingAt(x, y) {
    const id = this.buildingGrid.get(`${x},${y}`);
    return id ? this.buildings.get(id) : null;
  }

  /**
   * Find buildings by category
   */
  findBuildingsByCategory(category) {
    return Array.from(this.buildings.values()).filter(b => b.category === category);
  }

  /**
   * Find nearest building of a category from position
   */
  findNearestBuilding(fromX, fromY, category) {
    const buildings = category 
      ? this.findBuildingsByCategory(category)
      : Array.from(this.buildings.values());
    
    let nearest = null;
    let nearestDist = Infinity;

    for (const building of buildings) {
      const dist = this.manhattanDistance(fromX, fromY, building.entrance.x, building.entrance.y);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = building;
      }
    }

    return nearest;
  }

  /**
   * Manhattan distance between two points
   */
  manhattanDistance(x1, y1, x2, y2) {
    return Math.abs(x2 - x1) + Math.abs(y2 - y1);
  }

  /**
   * Create a path on the grid
   */
  createPath(x1, y1, x2, y2) {
    // Simple straight/L-shaped paths
    const midX = x2;
    
    // Horizontal first, then vertical
    for (let x = Math.min(x1, midX); x <= Math.max(x1, midX); x++) {
      if (this.isInBounds(x, y1) && this.grid[y1][x].type === TILE_TYPES.GRASS) {
        this.grid[y1][x] = { type: TILE_TYPES.PATH, walkable: true, buildingId: null };
      }
    }
    for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++) {
      if (this.isInBounds(midX, y) && this.grid[y][midX].type === TILE_TYPES.GRASS) {
        this.grid[y][midX] = { type: TILE_TYPES.PATH, walkable: true, buildingId: null };
      }
    }
  }

  /**
   * Get random walkable position
   */
  getRandomWalkablePosition() {
    let attempts = 0;
    while (attempts < 1000) {
      const x = Math.floor(Math.random() * this.width);
      const y = Math.floor(Math.random() * this.height);
      if (this.isWalkable(x, y)) {
        return { x, y };
      }
      attempts++;
    }
    return { x: 128, y: 128 }; // Fallback to center
  }

  /**
   * Get walkable neighbors of a position (for pathfinding)
   */
  getWalkableNeighbors(x, y) {
    const neighbors = [];
    const directions = [
      { dx: 0, dy: -1 }, // up
      { dx: 1, dy: 0 },  // right
      { dx: 0, dy: 1 },  // down
      { dx: -1, dy: 0 }  // left
    ];

    for (const { dx, dy } of directions) {
      const nx = x + dx;
      const ny = y + dy;
      if (this.isWalkable(nx, ny)) {
        neighbors.push({ x: nx, y: ny });
      }
    }

    return neighbors;
  }

  /**
   * A* Pathfinding from start to goal
   */
  findPath(startX, startY, goalX, goalY, maxIterations = 1000) {
    if (!this.isWalkable(goalX, goalY)) {
      // Find nearest walkable tile to goal
      const neighbors = this.getWalkableNeighbors(goalX, goalY);
      if (neighbors.length === 0) return [];
      const nearest = neighbors[0];
      goalX = nearest.x;
      goalY = nearest.y;
    }

    const openSet = new Map();
    const closedSet = new Set();
    const cameFrom = new Map();
    const gScore = new Map();
    const fScore = new Map();

    const key = (x, y) => `${x},${y}`;
    const start = key(startX, startY);
    const goal = key(goalX, goalY);

    openSet.set(start, { x: startX, y: startY });
    gScore.set(start, 0);
    fScore.set(start, this.manhattanDistance(startX, startY, goalX, goalY));

    let iterations = 0;

    while (openSet.size > 0 && iterations < maxIterations) {
      iterations++;

      // Find node with lowest fScore
      let current = null;
      let currentKey = null;
      let lowestF = Infinity;

      for (const [k, node] of openSet) {
        const f = fScore.get(k) || Infinity;
        if (f < lowestF) {
          lowestF = f;
          current = node;
          currentKey = k;
        }
      }

      if (currentKey === goal) {
        // Reconstruct path
        const path = [];
        let k = goal;
        while (cameFrom.has(k)) {
          const [x, y] = k.split(',').map(Number);
          path.unshift({ x, y });
          k = cameFrom.get(k);
        }
        return path;
      }

      openSet.delete(currentKey);
      closedSet.add(currentKey);

      // Check neighbors
      for (const neighbor of this.getWalkableNeighbors(current.x, current.y)) {
        const neighborKey = key(neighbor.x, neighbor.y);
        if (closedSet.has(neighborKey)) continue;

        const tentativeG = (gScore.get(currentKey) || 0) + 1;

        if (!openSet.has(neighborKey)) {
          openSet.set(neighborKey, neighbor);
        } else if (tentativeG >= (gScore.get(neighborKey) || Infinity)) {
          continue;
        }

        cameFrom.set(neighborKey, currentKey);
        gScore.set(neighborKey, tentativeG);
        fScore.set(neighborKey, tentativeG + this.manhattanDistance(neighbor.x, neighbor.y, goalX, goalY));
      }
    }

    return []; // No path found
  }

  /**
   * Serialize world state for persistence
   */
  toJSON() {
    return {
      width: this.width,
      height: this.height,
      buildings: Array.from(this.buildings.entries()),
      pointsOfInterest: this.pointsOfInterest
    };
  }

  /**
   * Load world state from JSON
   */
  static fromJSON(data) {
    const world = new World();
    
    if (data.buildings) {
      for (const [id, building] of data.buildings) {
        world.placeBuilding(id, building.type, building.x, building.y, building);
      }
    }

    return world;
  }
}

/**
 * Create default village layout
 */
export function createDefaultVillage() {
  const world = new World();
  
  // Center the village around (128, 128)
  const centerX = 128;
  const centerY = 128;

  // Place main buildings
  world.placeBuilding('tavern', 'TAVERN', centerX - 2, centerY - 10, { name: 'The Rusty Anchor' });
  world.placeBuilding('church', 'CHURCH', centerX + 10, centerY - 15, { name: 'Chapel of Light' });
  world.placeBuilding('blacksmith', 'BLACKSMITH', centerX - 15, centerY, { name: 'Iron & Fire Forge' });
  world.placeBuilding('bakery', 'BAKERY', centerX + 8, centerY + 2, { name: 'Golden Crust Bakery' });
  world.placeBuilding('market', 'MARKET', centerX - 3, centerY + 10, { name: 'Village Market' });
  world.placeBuilding('library', 'LIBRARY', centerX + 15, centerY - 5, { name: 'Hall of Scrolls' });
  world.placeBuilding('farm', 'FARM', centerX - 25, centerY + 15, { name: 'Green Meadow Farm' });
  world.placeBuilding('well', 'WELL', centerX, centerY, { name: 'Town Well' });

  // Villager cottages
  world.placeBuilding('cottage_elara', 'COTTAGE', centerX - 20, centerY - 8, { name: "Elara's Cottage", owner: 'elara' });
  world.placeBuilding('cottage_brom', 'COTTAGE', centerX - 12, centerY + 5, { name: "Brom's Home", owner: 'brom' });
  world.placeBuilding('cottage_maeve', 'COTTAGE', centerX + 5, centerY - 5, { name: "Maeve's Dwelling", owner: 'maeve' });
  world.placeBuilding('cottage_finn', 'COTTAGE', centerX + 12, centerY + 8, { name: "Finn's Quarters", owner: 'finn' });
  world.placeBuilding('cottage_ivy', 'COTTAGE', centerX - 8, centerY - 15, { name: "Ivy's Nook", owner: 'ivy' });
  world.placeBuilding('cottage_gideon', 'COTTAGE', centerX + 18, centerY + 3, { name: "Gideon's Study", owner: 'gideon' });
  world.placeBuilding('cottage_rose', 'COTTAGE', centerX - 5, centerY + 18, { name: "Rose's Place", owner: 'rose' });

  // Create paths connecting buildings
  world.createPath(centerX, centerY, centerX, centerY - 10); // To tavern
  world.createPath(centerX, centerY, centerX + 15, centerY); // To church area
  world.createPath(centerX, centerY, centerX - 15, centerY); // To blacksmith
  world.createPath(centerX, centerY, centerX, centerY + 14); // To market

  return world;
}

export default World;
