import type { AreaMapTileSet } from '../models/area/AreaMapTileSet';
import type { InteractiveObject } from '../models/area/InteractiveObject';
import { InteractiveObjectType, ObjectState } from '../models/area/InteractiveObject';

interface Room {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface DungeonGenerationOptions {
  width: number;
  height: number;
  roomAttempts?: number;
  minRoomSize?: number;
  maxRoomSize?: number;
  corridorWidth?: number;
}

export class DungeonGenerator {
  private width: number;
  private height: number;
  private grid: string[][];
  private rooms: Room[] = [];
  private roomAttempts: number;
  private minRoomSize: number;
  private maxRoomSize: number;

  constructor(options: DungeonGenerationOptions) {
    this.width = options.width;
    this.height = options.height;
    this.roomAttempts = options.roomAttempts || 50;
    this.minRoomSize = options.minRoomSize || 3;
    this.maxRoomSize = options.maxRoomSize || 8;
    // corridorWidth is reserved for future use when implementing variable width corridors

    // Initialize grid with walls
    this.grid = [];
    for (let y = 0; y < this.height; y++) {
      const row: string[] = [];
      for (let x = 0; x < this.width; x++) {
        row.push('#'); // Wall
      }
      this.grid.push(row);
    }
  }

  /**
   * Generate a random dungeon layout
   */
  generate(): { grid: string[][]; rooms: Room[]; doors: { x: number; y: number }[] } {
    // Generate rooms
    this.generateRooms();

    // Connect rooms with corridors
    const doors = this.connectRooms();

    return {
      grid: this.grid,
      rooms: this.rooms,
      doors,
    };
  }

  /**
   * Generate random rooms
   */
  private generateRooms(): void {
    for (let i = 0; i < this.roomAttempts; i++) {
      const width = this.randomInt(this.minRoomSize, this.maxRoomSize);
      const height = this.randomInt(this.minRoomSize, this.maxRoomSize);
      const x = this.randomInt(1, this.width - width - 1);
      const y = this.randomInt(1, this.height - height - 1);

      const newRoom: Room = { x, y, width, height };

      // Check if this room overlaps with any existing room
      let overlaps = false;
      for (const room of this.rooms) {
        if (this.roomsOverlap(newRoom, room)) {
          overlaps = true;
          break;
        }
      }

      if (!overlaps) {
        this.carveRoom(newRoom);
        this.rooms.push(newRoom);
      }
    }
  }

  /**
   * Check if two rooms overlap (with 1-tile padding)
   */
  private roomsOverlap(room1: Room, room2: Room): boolean {
    return !(
      room1.x + room1.width + 1 < room2.x ||
      room2.x + room2.width + 1 < room1.x ||
      room1.y + room1.height + 1 < room2.y ||
      room2.y + room2.height + 1 < room1.y
    );
  }

  /**
   * Carve out a room in the grid
   */
  private carveRoom(room: Room): void {
    for (let y = room.y; y < room.y + room.height; y++) {
      for (let x = room.x; x < room.x + room.width; x++) {
        this.grid[y][x] = '.'; // Floor
      }
    }
  }

  /**
   * Get the center point of a room
   */
  private getRoomCenter(room: Room): { x: number; y: number } {
    return {
      x: Math.floor(room.x + room.width / 2),
      y: Math.floor(room.y + room.height / 2),
    };
  }

  /**
   * Connect all rooms with corridors
   */
  private connectRooms(): { x: number; y: number }[] {
    const doors: { x: number; y: number }[] = [];

    if (this.rooms.length === 0) return doors;

    // Sort rooms by position to create a more natural dungeon layout
    const sortedRooms = [...this.rooms].sort((a, b) => {
      return a.x + a.y - (b.x + b.y);
    });

    // Connect each room to the next one
    for (let i = 0; i < sortedRooms.length - 1; i++) {
      const roomA = sortedRooms[i];
      const roomB = sortedRooms[i + 1];

      const centerA = this.getRoomCenter(roomA);
      const centerB = this.getRoomCenter(roomB);

      // Randomly choose horizontal-first or vertical-first corridors
      if (Math.random() < 0.5) {
        const roomDoors = this.carveHVCorridor(centerA, centerB);
        doors.push(...roomDoors);
      } else {
        const roomDoors = this.carveVHCorridor(centerA, centerB);
        doors.push(...roomDoors);
      }
    }

    // Optionally add some extra connections for more interesting layouts
    if (this.rooms.length > 3) {
      const extraConnections = Math.floor(this.rooms.length / 4);
      for (let i = 0; i < extraConnections; i++) {
        const roomA = this.rooms[this.randomInt(0, this.rooms.length - 1)];
        const roomB = this.rooms[this.randomInt(0, this.rooms.length - 1)];
        if (roomA !== roomB) {
          const centerA = this.getRoomCenter(roomA);
          const centerB = this.getRoomCenter(roomB);
          const roomDoors = this.carveHVCorridor(centerA, centerB);
          doors.push(...roomDoors);
        }
      }
    }

    return doors;
  }

  /**
   * Carve a corridor: horizontal first, then vertical
   */
  private carveHVCorridor(
    start: { x: number; y: number },
    end: { x: number; y: number }
  ): { x: number; y: number }[] {
    const doors: { x: number; y: number }[] = [];

    // Horizontal corridor
    const minX = Math.min(start.x, end.x);
    const maxX = Math.max(start.x, end.x);
    for (let x = minX; x <= maxX; x++) {
      const door = this.carveTile(x, start.y);
      if (door) doors.push(door);
    }

    // Vertical corridor
    const minY = Math.min(start.y, end.y);
    const maxY = Math.max(start.y, end.y);
    for (let y = minY; y <= maxY; y++) {
      const door = this.carveTile(end.x, y);
      if (door) doors.push(door);
    }

    return doors;
  }

  /**
   * Carve a corridor: vertical first, then horizontal
   */
  private carveVHCorridor(
    start: { x: number; y: number },
    end: { x: number; y: number }
  ): { x: number; y: number }[] {
    const doors: { x: number; y: number }[] = [];

    // Vertical corridor
    const minY = Math.min(start.y, end.y);
    const maxY = Math.max(start.y, end.y);
    for (let y = minY; y <= maxY; y++) {
      const door = this.carveTile(start.x, y);
      if (door) doors.push(door);
    }

    // Horizontal corridor
    const minX = Math.min(start.x, end.x);
    const maxX = Math.max(start.x, end.x);
    for (let x = minX; x <= maxX; x++) {
      const door = this.carveTile(x, end.y);
      if (door) doors.push(door);
    }

    return doors;
  }

  /**
   * Carve a single tile, returns door position if a door should be placed
   */
  private carveTile(x: number, y: number): { x: number; y: number } | null {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
      return null;
    }

    // If we're carving into a wall and there's a floor tile nearby,
    // this might be a good door location
    if (this.grid[y][x] === '#') {
      // Check if this is a transition from corridor to room
      const hasFloorNeighbor = this.hasFloorNeighbor(x, y);
      this.grid[y][x] = '.'; // Floor

      if (hasFloorNeighbor && this.isDoorLocation(x, y)) {
        return { x, y };
      }
    }

    return null;
  }

  /**
   * Check if a tile has a floor neighbor
   */
  private hasFloorNeighbor(x: number, y: number): boolean {
    const neighbors = [
      { dx: -1, dy: 0 },
      { dx: 1, dy: 0 },
      { dx: 0, dy: -1 },
      { dx: 0, dy: 1 },
    ];

    for (const { dx, dy } of neighbors) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx >= 0 && nx < this.width && ny >= 0 && ny < this.height) {
        if (this.grid[ny][nx] === '.') {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Check if this is a good location for a door
   * (i.e., it's in a narrow passage between wall tiles)
   */
  private isDoorLocation(x: number, y: number): boolean {
    // Check for horizontal door (walls above and below)
    const hasWallAbove = y > 0 && this.grid[y - 1][x] === '#';
    const hasWallBelow = y < this.height - 1 && this.grid[y + 1][x] === '#';
    const hasFloorLeft = x > 0 && this.grid[y][x - 1] === '.';
    const hasFloorRight = x < this.width - 1 && this.grid[y][x + 1] === '.';

    if (hasWallAbove && hasWallBelow && hasFloorLeft && hasFloorRight) {
      return true;
    }

    // Check for vertical door (walls left and right)
    const hasWallLeft = x > 0 && this.grid[y][x - 1] === '#';
    const hasWallRight = x < this.width - 1 && this.grid[y][x + 1] === '#';
    const hasFloorAbove = y > 0 && this.grid[y - 1][x] === '.';
    const hasFloorBelow = y < this.height - 1 && this.grid[y + 1][x] === '.';

    if (hasWallLeft && hasWallRight && hasFloorAbove && hasFloorBelow) {
      return true;
    }

    return false;
  }

  /**
   * Random integer between min and max (inclusive)
   */
  private randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /**
   * Convert the character grid to tile data using a tileset
   */
  static convertToTileGrid(
    charGrid: string[][],
    tileset: AreaMapTileSet
  ): any[][] {
    const tileGrid: any[][] = [];

    for (let y = 0; y < charGrid.length; y++) {
      const row: any[] = [];
      for (let x = 0; x < charGrid[y].length; x++) {
        const char = charGrid[y][x];
        const tileType = tileset.tileTypes.find(tt => tt.char === char);

        if (tileType) {
          row.push({
            behavior: tileType.behavior,
            walkable: tileType.walkable,
            passable: tileType.passable,
            spriteId: tileType.spriteId,
            terrainType: tileType.terrainType,
          });
        } else {
          // Default to first tile type if character not found
          const defaultTile = tileset.tileTypes[0];
          row.push({
            behavior: defaultTile.behavior,
            walkable: defaultTile.walkable,
            passable: defaultTile.passable,
            spriteId: defaultTile.spriteId,
            terrainType: defaultTile.terrainType,
          });
        }
      }
      tileGrid.push(row);
    }

    return tileGrid;
  }

  /**
   * Create door objects from door positions
   */
  static createDoorObjects(
    doorPositions: { x: number; y: number }[]
  ): InteractiveObject[] {
    return doorPositions.map((pos, index) => ({
      id: `door-${Date.now()}-${index}`,
      type: InteractiveObjectType.ClosedDoor,
      x: pos.x,
      y: pos.y,
      state: ObjectState.Closed,
      spriteId: 'biomes-76', // Default door sprite
    }));
  }
}
