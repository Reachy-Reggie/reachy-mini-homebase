// Robot Tools for Claude
// Defines tools that Claude can use to control the robot

import type Anthropic from '@anthropic-ai/sdk';
import { api } from '../services/api';
import { API_ENDPOINTS } from '../config/api';
import { cameraService } from '../services/camera';
import { twilioTools, executeTwilioTool, isTwilioTool } from './twilio-tools';

// Type for tool execution results (can be text or image)
export interface ToolResult {
  type: 'text' | 'image';
  text?: string;
  imageBase64?: string;
  mediaType?: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';
}

// Tool definitions for Claude
export const robotTools: Anthropic.Tool[] = [
  {
    name: 'robot_wake_up',
    description: 'Wake up the robot with a wake-up animation and sound.',
    input_schema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },
  {
    name: 'robot_sleep',
    description: 'Put the robot to sleep with a sleep animation.',
    input_schema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },
  {
    name: 'robot_play_emotion',
    description: 'Play an emotion/expression. Available emotions: happy, sad, curious, surprised, angry, confused, excited, sleepy, thinking, love',
    input_schema: {
      type: 'object' as const,
      properties: {
        emotion: {
          type: 'string',
          description: 'The emotion to express',
          enum: ['happy', 'sad', 'curious', 'surprised', 'angry', 'confused', 'excited', 'sleepy', 'thinking', 'love'],
        },
      },
      required: ['emotion'],
    },
  },
  {
    name: 'robot_play_dance',
    description: 'Play a dance move. Available dances: dance_1, dance_2, dance_3, wiggle, nod, shake',
    input_schema: {
      type: 'object' as const,
      properties: {
        dance: {
          type: 'string',
          description: 'The dance to perform',
          enum: ['dance_1', 'dance_2', 'dance_3', 'wiggle', 'nod', 'shake'],
        },
      },
      required: ['dance'],
    },
  },
  {
    name: 'robot_look_at',
    description: 'Look at a specific 3D point in space. X is forward/back, Y is left/right, Z is up/down.',
    input_schema: {
      type: 'object' as const,
      properties: {
        x: {
          type: 'number',
          description: 'Forward distance in meters (typically 0.3 to 1.0)',
        },
        y: {
          type: 'number',
          description: 'Left/right offset in meters (-0.3 to 0.3)',
        },
        z: {
          type: 'number',
          description: 'Up/down offset in meters (0.2 to 0.5)',
        },
      },
      required: ['x', 'y', 'z'],
    },
  },
  {
    name: 'robot_set_target',
    description: 'Set the robot head pose directly. Roll/pitch/yaw are in degrees.',
    input_schema: {
      type: 'object' as const,
      properties: {
        roll: {
          type: 'number',
          description: 'Roll angle in degrees (-30 to 30)',
        },
        pitch: {
          type: 'number',
          description: 'Pitch angle in degrees (-30 to 30)',
        },
        yaw: {
          type: 'number',
          description: 'Yaw angle in degrees (-45 to 45)',
        },
      },
      required: ['roll', 'pitch', 'yaw'],
    },
  },
  {
    name: 'robot_set_motor_mode',
    description: 'Set the motor control mode. "enabled" for full control, "disabled" to turn off motors, "gravity_compensation" for compliant mode.',
    input_schema: {
      type: 'object' as const,
      properties: {
        mode: {
          type: 'string',
          description: 'The motor mode',
          enum: ['enabled', 'disabled', 'gravity_compensation'],
        },
      },
      required: ['mode'],
    },
  },
  {
    name: 'robot_set_volume',
    description: 'Set the robot speaker volume.',
    input_schema: {
      type: 'object' as const,
      properties: {
        volume: {
          type: 'number',
          description: 'Volume level from 0 to 100',
        },
      },
      required: ['volume'],
    },
  },
  {
    name: 'robot_get_status',
    description: 'Get the current robot status including daemon state, motor mode, and connection info.',
    input_schema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },
  {
    name: 'robot_get_camera_frame',
    description: 'Capture a frame from your camera (eyes). Use this to see what is in front of you. The image will be sent to your vision system for analysis.',
    input_schema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },
];

// Tool execution function
export async function executeRobotTool(
  name: string,
  input: Record<string, unknown>
): Promise<ToolResult> {
  try {
    switch (name) {
      case 'robot_wake_up':
        await api.post(API_ENDPOINTS.moveWakeUp);
        return { type: 'text', text: 'Successfully woke up! I am now alert and ready.' };

      case 'robot_sleep':
        await api.post(API_ENDPOINTS.moveGotoSleep);
        return { type: 'text', text: 'Going to sleep now. Goodnight!' };

      case 'robot_play_emotion': {
        const emotion = input.emotion as string;
        // Try to play from emotions dataset
        try {
          await api.post(API_ENDPOINTS.movePlayRecorded('emotions', emotion));
          return { type: 'text', text: `Expressing ${emotion} emotion!` };
        } catch {
          // Fallback to generic movement
          return { type: 'text', text: `Tried to express ${emotion}, but that emotion might not be available.` };
        }
      }

      case 'robot_play_dance': {
        const dance = input.dance as string;
        try {
          await api.post(API_ENDPOINTS.movePlayRecorded('dances', dance));
          return { type: 'text', text: `Dancing: ${dance}!` };
        } catch {
          return { type: 'text', text: `Tried to dance ${dance}, but that dance might not be available.` };
        }
      }

      case 'robot_look_at': {
        const x = input.x as number;
        const y = input.y as number;
        const z = input.z as number;

        // Convert to head pose using simple mapping
        // This is approximate - a real implementation would use IK
        const yaw = Math.atan2(y, x) * (180 / Math.PI);
        const pitch = Math.atan2(z - 0.35, x) * (180 / Math.PI);

        await api.post(API_ENDPOINTS.moveGoto, {
          head_pose: {
            position: { x: 0, y: 0, z: 0.35 },
            orientation: { roll: 0, pitch, yaw },
          },
          duration: 1.0,
          interpolation: 'minjerk',
        });
        return { type: 'text', text: `Looking at point (${x}, ${y}, ${z})` };
      }

      case 'robot_set_target': {
        const roll = input.roll as number;
        const pitch = input.pitch as number;
        const yaw = input.yaw as number;

        await api.post(API_ENDPOINTS.moveSetTarget, {
          head_pose: {
            position: { x: 0, y: 0, z: 0.35 },
            orientation: { roll, pitch, yaw },
          },
        });
        return { type: 'text', text: `Set head pose to roll=${roll}, pitch=${pitch}, yaw=${yaw}` };
      }

      case 'robot_set_motor_mode': {
        const mode = input.mode as string;
        await api.post(API_ENDPOINTS.motorsSetMode(mode));
        return { type: 'text', text: `Motor mode set to: ${mode}` };
      }

      case 'robot_set_volume': {
        const volume = input.volume as number;
        await api.post(API_ENDPOINTS.volumeSet, { volume });
        return { type: 'text', text: `Volume set to ${volume}%` };
      }

      case 'robot_get_status': {
        const status = await api.get<{
          state: string;
          error?: string;
        }>(API_ENDPOINTS.daemonStatus);

        const motorsStatus = await api.get<{
          mode: string;
        }>(API_ENDPOINTS.motorsStatus);

        return { type: 'text', text: `Daemon state: ${status.state}${status.error ? ` (error: ${status.error})` : ''}\nMotor mode: ${motorsStatus.mode}` };
      }

      case 'robot_get_camera_frame': {
        // Capture a frame from the camera
        if (!cameraService.isAvailable()) {
          return { type: 'text', text: 'Camera is not available. Please ensure the camera is connected on the Control page first.' };
        }

        const imageBase64 = cameraService.captureFrame();
        if (!imageBase64) {
          return { type: 'text', text: 'Failed to capture camera frame. The video might not be ready yet.' };
        }

        // Return image for Claude vision analysis
        return {
          type: 'image',
          imageBase64,
          mediaType: 'image/jpeg',
          text: 'Camera frame captured successfully. Analyze this image.',
        };
      }

      default:
        return { type: 'text', text: `Unknown tool: ${name}` };
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to execute ${name}: ${errorMsg}`);
  }
}

// ============ Combined Tools ============

// All available tools for Claude (robot + communication)
export const allTools: Anthropic.Tool[] = [...robotTools, ...twilioTools];

// Combined tool execution function
export async function executeTool(
  name: string,
  input: Record<string, unknown>
): Promise<ToolResult> {
  // Check if it's a Twilio tool
  if (isTwilioTool(name)) {
    return executeTwilioTool(name, input);
  }
  // Otherwise, it's a robot tool
  return executeRobotTool(name, input);
}
