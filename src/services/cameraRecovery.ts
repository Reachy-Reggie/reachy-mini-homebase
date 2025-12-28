// Camera Recovery Service
// Handles automatic daemon restart when camera connection fails

interface RecoveryResult {
  success: boolean;
  message: string;
}

class CameraRecoveryService {
  private serverUrl: string;
  private recoveryAttempts = 0;
  private maxRecoveryAttempts = 2;
  private daemonRestartWaitMs = 10000; // 10 seconds for daemon to fully initialize

  constructor() {
    // Use the Twilio server which now also handles robot routes
    // Dynamically use same host as browser for network accessibility
    const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
    this.serverUrl = `http://${host}:3001`;
  }

  /**
   * Attempt to recover the camera by restarting the daemon
   * Returns success/failure and a message
   */
  async attemptRecovery(): Promise<RecoveryResult> {
    if (this.recoveryAttempts >= this.maxRecoveryAttempts) {
      return {
        success: false,
        message: 'Maximum recovery attempts reached. Manual intervention required.',
      };
    }

    this.recoveryAttempts++;
    console.log(
      `[CameraRecovery] Attempt ${this.recoveryAttempts}/${this.maxRecoveryAttempts}`
    );

    try {
      // Step 1: Request daemon restart via backend
      console.log('[CameraRecovery] Requesting daemon restart...');
      const response = await fetch(`${this.serverUrl}/robot/restart-daemon`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('[CameraRecovery] Restart failed:', error);
        return {
          success: false,
          message: `Daemon restart failed: ${error.error || 'Unknown error'}`,
        };
      }

      console.log('[CameraRecovery] Daemon restart initiated, waiting for initialization...');

      // Step 2: Wait for daemon to fully initialize (GStreamer pipeline takes time)
      await this.wait(this.daemonRestartWaitMs);

      // Step 3: Optionally start the daemon with wake_up flag
      console.log('[CameraRecovery] Starting daemon...');
      const startResponse = await fetch(`${this.serverUrl}/robot/start-daemon`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!startResponse.ok) {
        console.warn('[CameraRecovery] Daemon start request failed, continuing anyway...');
      }

      // Wait a bit more for the GStreamer pipeline to register
      await this.wait(3000);

      console.log('[CameraRecovery] Recovery sequence completed');
      return {
        success: true,
        message: 'Daemon restart completed. Reconnecting camera...',
      };
    } catch (error) {
      console.error('[CameraRecovery] Recovery error:', error);
      return {
        success: false,
        message: `Recovery failed: ${error instanceof Error ? error.message : 'Network error'}`,
      };
    }
  }

  /**
   * Reset the recovery attempt counter
   * Call this when camera successfully connects
   */
  resetAttempts(): void {
    this.recoveryAttempts = 0;
  }

  /**
   * Get current attempt count
   */
  getAttemptCount(): number {
    return this.recoveryAttempts;
  }

  /**
   * Check if more recovery attempts are available
   */
  canAttemptRecovery(): boolean {
    return this.recoveryAttempts < this.maxRecoveryAttempts;
  }

  /**
   * Check if the backend server is reachable
   */
  async checkServerAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.serverUrl}/robot/ssh-status`, {
        method: 'GET',
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  private wait(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const cameraRecoveryService = new CameraRecoveryService();
