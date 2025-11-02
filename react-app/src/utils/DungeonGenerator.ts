import type { AreaMapTileSet } from '../models/area/AreaMapTileSet';

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
  extraConnections?: boolean;
}

export class DungeonGenerator {
  private width: number;
  private height: number;
  private grid: string[][];
  private rooms: Room[] = [];
  private roomAttempts: number;
  private minRoomSize: number;
  private maxRoomSize: number;
  private extraConnections: boolean;

  constructor(options: DungeonGenerationOptions) {
    this.width = options.width;
    this.height = options.height;
    this.roomAttempts = options.roomAttempts || 50;
    this.minRoomSize = options.minRoomSize || 3;
    this.maxRoomSize = options.maxRoomSize || 8;
    this.extraConnections = options.extraConnections !== undefined ? options.extraConnections : true;
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
  generate(): { grid: string[][]; rooms: Room[] } {
    // Generate rooms
    this.generateRooms();

    // Connect rooms with corridors
    this.connectRooms();

    return {
      grid: this.grid,
      rooms: this.rooms,
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
  private connectRooms(): void {
    if (this.rooms.length === 0) return;

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
        this.carveHVCorridor(centerA, centerB);
      } else {
        this.carveVHCorridor(centerA, centerB);
      }
    }

    // Optionally add some extra connections for more interesting layouts
    if (this.extraConnections && this.rooms.length > 3) {
      const extraConnectionCount = Math.floor(this.rooms.length / 4);
      for (let i = 0; i < extraConnectionCount; i++) {
        const roomA = this.rooms[this.randomInt(0, this.rooms.length - 1)];
        const roomB = this.rooms[this.randomInt(0, this.rooms.length - 1)];
        if (roomA !== roomB) {
          const centerA = this.getRoomCenter(roomA);
          const centerB = this.getRoomCenter(roomB);
          this.carveHVCorridor(centerA, centerB);
        }
      }
    }
  }

  /**
   * Carve a corridor: horizontal first, then vertical
   */
  private carveHVCorridor(
    start: { x: number; y: number },
    end: { x: number; y: number }
  ): void {
    // Horizontal corridor
    const minX = Math.min(start.x, end.x);
    const maxX = Math.max(start.x, end.x);
    for (let x = minX; x <= maxX; x++) {
      this.carveTile(x, start.y);
    }

    // Vertical corridor
    const minY = Math.min(start.y, end.y);
    const maxY = Math.max(start.y, end.y);
    for (let y = minY; y <= maxY; y++) {
      this.carveTile(end.x, y);
    }
  }

  /**
   * Carve a corridor: vertical first, then horizontal
   */
  private carveVHCorridor(
    start: { x: number; y: number },
    end: { x: number; y: number }
  ): void {
    // Vertical corridor
    const minY = Math.min(start.y, end.y);
    const maxY = Math.max(start.y, end.y);
    for (let y = minY; y <= maxY; y++) {
      this.carveTile(start.x, y);
    }

    // Horizontal corridor
    const minX = Math.min(start.x, end.x);
    const maxX = Math.max(start.x, end.x);
    for (let x = minX; x <= maxX; x++) {
      this.carveTile(x, end.y);
    }
  }

  /**
   * Carve a single tile
   */
  private carveTile(x: number, y: number): void {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
      return;
    }

    // Carve the floor
    if (this.grid[y][x] === '#') {
      this.grid[y][x] = '.'; // Floor
    }
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
}
