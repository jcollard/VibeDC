import type React from 'react';
import type { CinematicManager } from '../models/combat/CinematicSequence';

/**
 * Canvas coordinates from a mouse event
 */
export interface CanvasCoordinates {
  x: number;
  y: number;
}

/**
 * Service for handling input events in combat view
 * Centralizes coordinate translation and input blocking logic
 */
export class CombatInputHandler {
  private canvasRef: React.RefObject<HTMLCanvasElement | null>;
  private canvasWidth: number;
  private canvasHeight: number;

  constructor(
    canvasRef: React.RefObject<HTMLCanvasElement | null>,
    canvasWidth: number,
    canvasHeight: number
  ) {
    this.canvasRef = canvasRef;
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
  }

  /**
   * Convert mouse event coordinates to canvas coordinates
   * Accounts for canvas scaling and positioning
   * @returns Canvas coordinates or null if canvas is not available
   */
  getCanvasCoordinates(event: React.MouseEvent<HTMLCanvasElement>): CanvasCoordinates | null {
    const canvas = this.canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    const scaleX = this.canvasWidth / rect.width;
    const scaleY = this.canvasHeight / rect.height;

    const x = (event.clientX - rect.left) * scaleX;
    const y = (event.clientY - rect.top) * scaleY;

    return { x, y };
  }

  /**
   * Check if input should be blocked
   * Input is blocked during cinematic sequences
   */
  isInputBlocked(cinematicManager: CinematicManager): boolean {
    return cinematicManager.isPlayingCinematic();
  }
}
