// Robot Management Routes
// Handles robot SSH commands for daemon control and recovery

import { Router, Request, Response } from 'express';
import { spawn } from 'child_process';
import { writeFile, unlink } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { auditLog } from '../services/auditLog.js';
import { CONFIG } from '../config.js';
import { memoryStore } from '../services/memoryStore.js';

const router = Router();

const SSH_SCRIPT = '/home/reggie/.claude/skills/robot-ssh/scripts/robot-ssh.py';
const SFTP_SCRIPT = '/home/reggie/reggie-homebase/server/scripts/robot-sftp.py';

interface SSHResult {
  success: boolean;
  command: string;
  stdout: string;
  stderr: string;
  error: string | null;
}

/**
 * Execute a command on the robot via SSH
 */
function runSSHCommand(command: string): Promise<SSHResult> {
  return new Promise((resolve) => {
    const proc = spawn('python3', [SSH_SCRIPT, command], {
      timeout: 30000, // 30 second timeout
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('close', (code) => {
      try {
        const result = JSON.parse(stdout);
        resolve(result);
      } catch {
        resolve({
          success: code === 0,
          command,
          stdout,
          stderr,
          error: code !== 0 ? `Exit code: ${code}` : null,
        });
      }
    });

    proc.on('error', (err) => {
      resolve({
        success: false,
        command,
        stdout: '',
        stderr: '',
        error: err.message,
      });
    });
  });
}

/**
 * POST /robot/restart-daemon
 * Restart the reachy-mini-daemon service
 */
router.post('/restart-daemon', async (req: Request, res: Response) => {
  console.log('[Robot] Restarting daemon...');

  // Log the daemon restart (will notify owner)
  await auditLog(
    'robot_restart',
    { action: 'restart-daemon', source: req.ip },
    'robot'
  );

  try {
    const result = await runSSHCommand('sudo systemctl restart reachy-mini-daemon');

    if (result.success) {
      console.log('[Robot] Daemon restart successful');
      res.json({
        success: true,
        message: 'Daemon restart initiated',
        stdout: result.stdout,
      });
    } else {
      console.error('[Robot] Daemon restart failed:', result.error || result.stderr);
      res.status(500).json({
        success: false,
        error: result.error || result.stderr || 'Unknown error',
      });
    }
  } catch (error) {
    console.error('[Robot] Daemon restart error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /robot/start-daemon
 * Start the daemon with wake_up flag
 */
router.post('/start-daemon', async (req: Request, res: Response) => {
  console.log('[Robot] Starting daemon...');

  try {
    const result = await runSSHCommand(
      "curl -X POST 'http://localhost:8000/api/daemon/start?wake_up=true'"
    );

    res.json({
      success: result.success,
      message: result.success ? 'Daemon start initiated' : 'Daemon start failed',
      stdout: result.stdout,
      error: result.error,
    });
  } catch (error) {
    console.error('[Robot] Daemon start error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /robot/ssh-status
 * Check if SSH connection to robot is working
 */
router.get('/ssh-status', async (req: Request, res: Response) => {
  try {
    const result = await runSSHCommand('hostname');
    res.json({
      connected: result.success,
      hostname: result.stdout?.trim(),
    });
  } catch {
    res.json({ connected: false });
  }
});

/**
 * GET /robot/daemon-status
 * Get current daemon status via SSH
 */
router.get('/daemon-status', async (req: Request, res: Response) => {
  try {
    const result = await runSSHCommand(
      'curl -s http://localhost:8000/api/daemon/status'
    );

    if (result.success) {
      try {
        const status = JSON.parse(result.stdout);
        res.json({ success: true, status });
      } catch {
        res.json({ success: true, raw: result.stdout });
      }
    } else {
      res.status(500).json({
        success: false,
        error: result.error || 'Failed to get daemon status',
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /robot/speak
 * Generate TTS and play on robot speaker
 */
router.post('/speak', async (req: Request, res: Response) => {
  const { text, voiceId } = req.body;

  if (!text) {
    return res.status(400).json({ error: 'Missing required field: text' });
  }

  const apiKey = CONFIG.elevenLabs.apiKey;
  if (!apiKey) {
    return res.status(400).json({ error: 'ElevenLabs API key not configured' });
  }

  // Get voice ID from request or personality settings
  const personality = memoryStore.getPersonality();
  const selectedVoiceId = voiceId || personality.elevenLabsVoiceId;

  if (!selectedVoiceId) {
    return res.status(400).json({
      error: 'No voice selected. Please select a voice in Personality settings.'
    });
  }

  console.log(`[Robot] Generating TTS for: "${text.substring(0, 50)}..."`);

  try {
    // Generate TTS audio from ElevenLabs
    const ttsResponse = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${selectedVoiceId}`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_monolingual_v1',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
          },
        }),
      }
    );

    if (!ttsResponse.ok) {
      const errorText = await ttsResponse.text();
      console.error('[Robot] ElevenLabs TTS error:', ttsResponse.status, errorText);
      return res.status(ttsResponse.status).json({
        error: 'Failed to generate speech',
        details: errorText,
      });
    }

    // Get audio as buffer
    const audioBuffer = Buffer.from(await ttsResponse.arrayBuffer());

    // Save to temporary file
    const tempFile = join(tmpdir(), `reggie-tts-${Date.now()}.mp3`);
    await writeFile(tempFile, audioBuffer);

    console.log(`[Robot] TTS generated, sending to robot (${audioBuffer.length} bytes)`);

    // Transfer audio to robot via SFTP (using paramiko-based script)
    const transferResult = await new Promise<{ success: boolean; error?: string }>((resolve) => {
      const proc = spawn('python3', [
        SFTP_SCRIPT,
        tempFile,
        '/tmp/reggie-speak.mp3'
      ], { timeout: 30000 });

      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (data) => { stdout += data.toString(); });
      proc.stderr.on('data', (data) => { stderr += data.toString(); });

      proc.on('close', (code) => {
        // Clean up local temp file
        unlink(tempFile).catch(() => {});

        try {
          const result = JSON.parse(stdout);
          resolve(result);
        } catch {
          resolve({
            success: code === 0,
            error: code !== 0 ? stderr || `Exit code: ${code}` : undefined,
          });
        }
      });

      proc.on('error', (err) => {
        unlink(tempFile).catch(() => {});
        resolve({ success: false, error: err.message });
      });
    });

    if (!transferResult.success) {
      console.error('[Robot] Failed to transfer audio to robot:', transferResult.error);
      return res.status(500).json({
        error: 'Failed to transfer audio to robot',
        details: transferResult.error,
      });
    }

    // Play the audio on the robot using GStreamer (available on Reachy)
    const playResult = await runSSHCommand(
      'gst-launch-1.0 playbin uri=file:///tmp/reggie-speak.mp3 2>/dev/null'
    );

    if (playResult.success) {
      console.log('[Robot] Audio played successfully');
      res.json({
        success: true,
        message: 'Speech played on robot',
        audioSize: audioBuffer.length,
      });
    } else {
      console.error('[Robot] Failed to play audio:', playResult.error);
      res.status(500).json({
        success: false,
        error: 'Failed to play audio on robot',
        details: playResult.error || playResult.stderr,
      });
    }
  } catch (error) {
    console.error('[Robot] Speak error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /robot/set-volume
 * Set robot speaker volume
 */
router.post('/set-volume', async (req: Request, res: Response) => {
  const { volume } = req.body;

  if (typeof volume !== 'number' || volume < 0 || volume > 100) {
    return res.status(400).json({ error: 'Volume must be a number between 0 and 100' });
  }

  try {
    // Set volume via robot's REST API
    const response = await fetch('http://192.168.0.11:8000/api/media/volume', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ volume: volume / 100 }), // API expects 0-1 range
    });

    if (response.ok) {
      res.json({ success: true, volume });
    } else {
      const error = await response.text();
      res.status(response.status).json({ success: false, error });
    }
  } catch (error) {
    console.error('[Robot] Set volume error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export { router as robotRouter };
