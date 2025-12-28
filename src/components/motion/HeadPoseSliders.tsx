// Head Pose Control Sliders
// Controls X, Y, Z position and Roll, Pitch, Yaw orientation

import { Slider } from '../common/Slider';
import { useMotionControl } from '../../hooks/useMotionControl';

// Ranges based on mini_head_position_gui.py
const POSE_LIMITS = {
  // Position in meters
  x: { min: -0.05, max: 0.05, step: 0.001, unit: 'm' },
  y: { min: -0.05, max: 0.05, step: 0.001, unit: 'm' },
  z: { min: -0.05, max: 0.03, step: 0.001, unit: 'm' },
  // Orientation in degrees (converted to radians when sending)
  roll: { min: -45, max: 45, step: 1, unit: '°' },
  pitch: { min: -45, max: 45, step: 1, unit: '°' },
  yaw: { min: -175, max: 175, step: 1, unit: '°' },
};

// Convert degrees to radians
const degToRad = (deg: number) => (deg * Math.PI) / 180;
const radToDeg = (rad: number) => (rad * 180) / Math.PI;

interface HeadPoseSlidersProps {
  compact?: boolean;
  disabled?: boolean;
}

export function HeadPoseSliders({ compact = false, disabled = false }: HeadPoseSlidersProps) {
  const { currentHeadPose, setHeadPose, isConnected } = useMotionControl();

  // Get current values (default to 0 if not available)
  const pose = currentHeadPose || { x: 0, y: 0, z: 0, roll: 0, pitch: 0, yaw: 0 };

  const isDisabled = disabled || !isConnected;

  const handlePositionChange = (axis: 'x' | 'y' | 'z', value: number) => {
    setHeadPose({ [axis]: value });
  };

  const handleOrientationChange = (axis: 'roll' | 'pitch' | 'yaw', valueDeg: number) => {
    // Convert from degrees to radians for the API
    setHeadPose({ [axis]: degToRad(valueDeg) });
  };

  const formatPosition = (value: number) => (value * 1000).toFixed(0);

  if (compact) {
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          {/* Orientation controls - more commonly used */}
          <Slider
            label="Pitch"
            value={radToDeg(pose.pitch)}
            min={POSE_LIMITS.pitch.min}
            max={POSE_LIMITS.pitch.max}
            step={POSE_LIMITS.pitch.step}
            unit={POSE_LIMITS.pitch.unit}
            onChange={(v) => handleOrientationChange('pitch', v)}
            disabled={isDisabled}
            formatValue={(v) => v.toFixed(0)}
          />
          <Slider
            label="Yaw"
            value={radToDeg(pose.yaw)}
            min={POSE_LIMITS.yaw.min}
            max={POSE_LIMITS.yaw.max}
            step={POSE_LIMITS.yaw.step}
            unit={POSE_LIMITS.yaw.unit}
            onChange={(v) => handleOrientationChange('yaw', v)}
            disabled={isDisabled}
            formatValue={(v) => v.toFixed(0)}
          />
        </div>
        <Slider
          label="Roll"
          value={radToDeg(pose.roll)}
          min={POSE_LIMITS.roll.min}
          max={POSE_LIMITS.roll.max}
          step={POSE_LIMITS.roll.step}
          unit={POSE_LIMITS.roll.unit}
          onChange={(v) => handleOrientationChange('roll', v)}
          disabled={isDisabled}
          formatValue={(v) => v.toFixed(0)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Orientation Section */}
      <div>
        <h3 className="text-sm font-medium text-gray-500 mb-3">Orientation</h3>
        <div className="space-y-3">
          <Slider
            label="Roll"
            value={radToDeg(pose.roll)}
            min={POSE_LIMITS.roll.min}
            max={POSE_LIMITS.roll.max}
            step={POSE_LIMITS.roll.step}
            unit={POSE_LIMITS.roll.unit}
            onChange={(v) => handleOrientationChange('roll', v)}
            disabled={isDisabled}
            formatValue={(v) => v.toFixed(0)}
          />
          <Slider
            label="Pitch"
            value={radToDeg(pose.pitch)}
            min={POSE_LIMITS.pitch.min}
            max={POSE_LIMITS.pitch.max}
            step={POSE_LIMITS.pitch.step}
            unit={POSE_LIMITS.pitch.unit}
            onChange={(v) => handleOrientationChange('pitch', v)}
            disabled={isDisabled}
            formatValue={(v) => v.toFixed(0)}
          />
          <Slider
            label="Yaw"
            value={radToDeg(pose.yaw)}
            min={POSE_LIMITS.yaw.min}
            max={POSE_LIMITS.yaw.max}
            step={POSE_LIMITS.yaw.step}
            unit={POSE_LIMITS.yaw.unit}
            onChange={(v) => handleOrientationChange('yaw', v)}
            disabled={isDisabled}
            formatValue={(v) => v.toFixed(0)}
          />
        </div>
      </div>

      {/* Position Section */}
      <div>
        <h3 className="text-sm font-medium text-gray-500 mb-3">Position (mm)</h3>
        <div className="space-y-3">
          <Slider
            label="X (forward)"
            value={pose.x}
            min={POSE_LIMITS.x.min}
            max={POSE_LIMITS.x.max}
            step={POSE_LIMITS.x.step}
            unit="mm"
            onChange={(v) => handlePositionChange('x', v)}
            disabled={isDisabled}
            formatValue={formatPosition}
          />
          <Slider
            label="Y (left)"
            value={pose.y}
            min={POSE_LIMITS.y.min}
            max={POSE_LIMITS.y.max}
            step={POSE_LIMITS.y.step}
            unit="mm"
            onChange={(v) => handlePositionChange('y', v)}
            disabled={isDisabled}
            formatValue={formatPosition}
          />
          <Slider
            label="Z (up)"
            value={pose.z}
            min={POSE_LIMITS.z.min}
            max={POSE_LIMITS.z.max}
            step={POSE_LIMITS.z.step}
            unit="mm"
            onChange={(v) => handlePositionChange('z', v)}
            disabled={isDisabled}
            formatValue={formatPosition}
          />
        </div>
      </div>

      {!isConnected && (
        <div className="text-sm text-amber-600 bg-amber-50 rounded p-2">
          Motion control not connected. Controls will be enabled when connected.
        </div>
      )}
    </div>
  );
}
