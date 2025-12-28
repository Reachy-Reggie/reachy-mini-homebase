// Body Yaw Control Slider
// Controls the rotation of the robot's body

import { Slider } from '../common/Slider';
import { useMotionControl } from '../../hooks/useMotionControl';

// Convert degrees to radians
const degToRad = (deg: number) => (deg * Math.PI) / 180;
const radToDeg = (rad: number) => (rad * 180) / Math.PI;

interface BodyYawControlProps {
  compact?: boolean;
  disabled?: boolean;
}

export function BodyYawControl({ compact = false, disabled = false }: BodyYawControlProps) {
  const { currentBodyYaw, setBodyYaw, isConnected } = useMotionControl();

  const bodyYaw = currentBodyYaw ?? 0;
  const isDisabled = disabled || !isConnected;

  const handleChange = (valueDeg: number) => {
    setBodyYaw(degToRad(valueDeg));
  };

  const handleReset = () => {
    setBodyYaw(0);
  };

  const formatAngle = (rad: number) => Math.round(radToDeg(rad)).toString();

  if (compact) {
    return (
      <Slider
        label="Body Yaw"
        value={radToDeg(bodyYaw)}
        min={-180}
        max={180}
        step={1}
        unit="°"
        onChange={handleChange}
        disabled={isDisabled}
        formatValue={(v) => v.toFixed(0)}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-500">Body Rotation</h3>
        <button
          onClick={handleReset}
          disabled={isDisabled}
          className="text-xs px-2 py-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded disabled:opacity-50"
        >
          Center
        </button>
      </div>

      <Slider
        label="Body Yaw"
        value={radToDeg(bodyYaw)}
        min={-180}
        max={180}
        step={1}
        unit="°"
        onChange={handleChange}
        disabled={isDisabled}
        formatValue={(v) => v.toFixed(0)}
      />

      {/* Visual representation */}
      <div className="flex justify-center py-4">
        <div className="relative w-20 h-20">
          {/* Body outline */}
          <div className="absolute inset-0 rounded-full border-2 border-gray-300" />
          {/* Direction indicator */}
          <div
            className="absolute top-1/2 left-1/2 w-1 h-8 bg-green-500 rounded-full origin-bottom transition-transform"
            style={{
              transform: `translate(-50%, -100%) rotate(${radToDeg(bodyYaw)}deg)`,
            }}
          />
          {/* Center dot */}
          <div className="absolute top-1/2 left-1/2 w-3 h-3 bg-gray-400 rounded-full -translate-x-1/2 -translate-y-1/2" />
          {/* Cardinal directions */}
          <span className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-4 text-xs text-gray-400">
            0°
          </span>
          <span className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-4 text-xs text-gray-400">
            180°
          </span>
          <span className="absolute left-0 top-1/2 -translate-x-4 -translate-y-1/2 text-xs text-gray-400">
            -90°
          </span>
          <span className="absolute right-0 top-1/2 translate-x-4 -translate-y-1/2 text-xs text-gray-400">
            90°
          </span>
        </div>
      </div>

      <p className="text-xs text-gray-400 text-center">
        Current: {formatAngle(bodyYaw)}°
      </p>
    </div>
  );
}
