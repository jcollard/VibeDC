/**
 * Represents a cancellable camera animation
 */
export class CameraAnimation {
  private _cancelled: boolean = false;

  /**
   * Cancel this animation
   */
  cancel(): void {
    this._cancelled = true;
  }

  /**
   * Check if this animation has been cancelled
   */
  isCancelled(): boolean {
    return this._cancelled;
  }
}
