// Camera Service for Reggie Homebase
// Captures frames from the WebRTC video stream for Claude vision

class CameraService {
  private videoElement: HTMLVideoElement | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;

  // Register the video element from CameraFeed component
  registerVideoElement(video: HTMLVideoElement) {
    this.videoElement = video;
    console.log('[CameraService] Video element registered');
  }

  // Unregister when component unmounts
  unregisterVideoElement() {
    this.videoElement = null;
    console.log('[CameraService] Video element unregistered');
  }

  // Check if camera is available
  isAvailable(): boolean {
    return (
      this.videoElement !== null &&
      this.videoElement.readyState >= 2 && // HAVE_CURRENT_DATA or better
      this.videoElement.videoWidth > 0
    );
  }

  // Capture a frame as base64 JPEG
  captureFrame(maxWidth = 1024): string | null {
    if (!this.videoElement) {
      console.error('[CameraService] No video element registered');
      return null;
    }

    if (!this.isAvailable()) {
      console.error('[CameraService] Video not ready');
      return null;
    }

    try {
      const video = this.videoElement;

      // Calculate dimensions (maintain aspect ratio, limit max width)
      let width = video.videoWidth;
      let height = video.videoHeight;

      if (width > maxWidth) {
        const ratio = maxWidth / width;
        width = maxWidth;
        height = Math.floor(height * ratio);
      }

      // Create or reuse canvas
      if (!this.canvas) {
        this.canvas = document.createElement('canvas');
      }
      this.canvas.width = width;
      this.canvas.height = height;

      // Get context
      if (!this.ctx) {
        this.ctx = this.canvas.getContext('2d');
      }

      if (!this.ctx) {
        console.error('[CameraService] Could not get canvas context');
        return null;
      }

      // Draw video frame to canvas
      this.ctx.drawImage(video, 0, 0, width, height);

      // Convert to base64 JPEG (quality 0.85)
      const dataUrl = this.canvas.toDataURL('image/jpeg', 0.85);

      // Remove data URL prefix to get just the base64
      const base64 = dataUrl.replace(/^data:image\/jpeg;base64,/, '');

      console.log(`[CameraService] Captured frame: ${width}x${height}, ${Math.round(base64.length / 1024)}KB`);

      return base64;
    } catch (error) {
      console.error('[CameraService] Error capturing frame:', error);
      return null;
    }
  }

  // Get video dimensions
  getDimensions(): { width: number; height: number } | null {
    if (!this.isAvailable()) {
      return null;
    }
    return {
      width: this.videoElement!.videoWidth,
      height: this.videoElement!.videoHeight,
    };
  }
}

// Export singleton instance
export const cameraService = new CameraService();
