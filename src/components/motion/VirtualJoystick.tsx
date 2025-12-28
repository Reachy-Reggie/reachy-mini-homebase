// Virtual Joystick for Real-time Head Control
// Uses nipplejs for touch/mouse joystick input

import { useEffect, useRef, useCallback } from 'react';
import nipplejs from 'nipplejs';
import { useMotionControl } from '../../hooks/useMotionControl';

interface VirtualJoystickProps {
  disabled?: boolean;
  sensitivity?: number; // Multiplier for movement speed
  mode?: 'yaw-pitch' | 'roll-z'; // Which axes to control
}

// Convert degrees to radians
const degToRad = (deg: number) => (deg * Math.PI) / 180;

export function VirtualJoystick({
  disabled = false,
  sensitivity = 1.0,
  mode = 'yaw-pitch',
}: VirtualJoystickProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const joystickRef = useRef<nipplejs.JoystickManager | null>(null);
  const animationRef = useRef<number | null>(null);
  const currentVectorRef = useRef({ x: 0, y: 0 });

  const { setHeadPose, currentHeadPose, isConnected } = useMotionControl();

  // Animation loop for smooth continuous updates
  const updateLoop = useCallback(() => {
    const { x, y } = currentVectorRef.current;

    if (Math.abs(x) > 0.01 || Math.abs(y) > 0.01) {
      const currentPose = currentHeadPose || { x: 0, y: 0, z: 0, roll: 0, pitch: 0, yaw: 0 };

      if (mode === 'yaw-pitch') {
        // X controls yaw (left/right), Y controls pitch (up/down)
        const yawDelta = x * sensitivity * 2; // degrees per frame
        const pitchDelta = -y * sensitivity * 2; // inverted for natural feel

        const newYaw = Math.max(-175, Math.min(175, (currentPose.yaw * 180 / Math.PI) + yawDelta));
        const newPitch = Math.max(-45, Math.min(45, (currentPose.pitch * 180 / Math.PI) + pitchDelta));

        setHeadPose({
          yaw: degToRad(newYaw),
          pitch: degToRad(newPitch),
        });
      } else {
        // roll-z mode: X controls roll, Y controls z-offset
        const rollDelta = x * sensitivity * 2;
        const zDelta = y * sensitivity * 0.001; // meters per frame

        const newRoll = Math.max(-45, Math.min(45, (currentPose.roll * 180 / Math.PI) + rollDelta));
        const newZ = Math.max(-0.05, Math.min(0.03, currentPose.z + zDelta));

        setHeadPose({
          roll: degToRad(newRoll),
          z: newZ,
        });
      }
    }

    animationRef.current = requestAnimationFrame(updateLoop);
  }, [currentHeadPose, mode, sensitivity, setHeadPose]);

  useEffect(() => {
    if (!containerRef.current || disabled || !isConnected) return;

    // Create joystick
    const manager = nipplejs.create({
      zone: containerRef.current,
      mode: 'static',
      position: { left: '50%', top: '50%' },
      color: '#22c55e',
      size: 120,
      restOpacity: 0.75,
    });

    joystickRef.current = manager;

    // Handle joystick movement
    manager.on('move', (_evt, data) => {
      if (data.vector) {
        currentVectorRef.current = {
          x: data.vector.x,
          y: data.vector.y,
        };
      }
    });

    // Handle joystick release
    manager.on('end', () => {
      currentVectorRef.current = { x: 0, y: 0 };
    });

    // Start update loop
    animationRef.current = requestAnimationFrame(updateLoop);

    return () => {
      manager.destroy();
      joystickRef.current = null;
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [disabled, isConnected, updateLoop]);

  const modeLabel = mode === 'yaw-pitch' ? 'Yaw / Pitch' : 'Roll / Z';
  const axisLabels = mode === 'yaw-pitch'
    ? { x: '← Yaw →', y: '↑ Pitch ↓' }
    : { x: '← Roll →', y: '↑ Z ↓' };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-300">Joystick ({modeLabel})</span>
        {!isConnected && (
          <span className="text-xs text-amber-400">Disconnected</span>
        )}
      </div>

      <div
        ref={containerRef}
        className={`relative w-full aspect-square max-w-[200px] mx-auto rounded-full border-2 ${
          disabled || !isConnected
            ? 'bg-gray-800/50 border-gray-700 cursor-not-allowed'
            : 'bg-gray-800 border-gray-600 hover:border-reachy-500/30'
        }`}
        style={{ touchAction: 'none' }}
      >
        {/* Axis labels */}
        <span className="absolute top-2 left-1/2 -translate-x-1/2 text-xs text-gray-500">
          {axisLabels.y.split(' ')[0]}
        </span>
        <span className="absolute bottom-2 left-1/2 -translate-x-1/2 text-xs text-gray-500">
          {axisLabels.y.split(' ')[2]}
        </span>
        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-500">
          {axisLabels.x.split(' ')[0]}
        </span>
        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-500">
          {axisLabels.x.split(' ')[2]}
        </span>

        {/* Crosshair */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-full h-px bg-gray-700" />
        </div>
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-px h-full bg-gray-700" />
        </div>

        {(disabled || !isConnected) && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-sm text-gray-500">
              {disabled ? 'Disabled' : 'Not connected'}
            </span>
          </div>
        )}
      </div>

      <p className="text-xs text-gray-500 text-center">
        Drag to control head movement
      </p>
    </div>
  );
}
