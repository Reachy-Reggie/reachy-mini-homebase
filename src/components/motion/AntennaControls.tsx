// Antenna Control Sliders
// Controls left and right antenna positions

import { Slider } from '../common/Slider';
import { useMotionControl } from '../../hooks/useMotionControl';

// Antenna limits in radians (about ±60 degrees)
const ANTENNA_LIMITS = {
  min: -1.05, // ~-60 degrees
  max: 1.05, // ~60 degrees
  step: 0.02,
};

// Convert radians to degrees
const radToDeg = (rad: number) => (rad * 180) / Math.PI;

interface AntennaControlsProps {
  compact?: boolean;
  disabled?: boolean;
  showMirror?: boolean;
}

export function AntennaControls({
  compact = false,
  disabled = false,
  showMirror = true
}: AntennaControlsProps) {
  const { currentAntennas, setAntennas, isConnected } = useMotionControl();

  // Current values [right, left] in radians
  const antennas = currentAntennas || [0, 0];
  const rightAntenna = antennas[0];
  const leftAntenna = antennas[1];

  const isDisabled = disabled || !isConnected;

  const handleRightChange = (value: number) => {
    setAntennas([value, antennas[1]]);
  };

  const handleLeftChange = (value: number) => {
    setAntennas([antennas[0], value]);
  };

  const handleBothChange = (value: number) => {
    // Mirror mode: left = -right
    setAntennas([value, -value]);
  };

  const handleReset = () => {
    setAntennas([0, 0]);
  };

  const formatAngle = (rad: number) => Math.round(radToDeg(rad)).toString();

  if (compact) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">Antennas</span>
          <button
            onClick={handleReset}
            disabled={isDisabled}
            className="text-xs text-gray-500 hover:text-gray-700 disabled:opacity-50"
          >
            Reset
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Slider
            label="Right"
            value={rightAntenna}
            min={ANTENNA_LIMITS.min}
            max={ANTENNA_LIMITS.max}
            step={ANTENNA_LIMITS.step}
            unit="°"
            onChange={handleRightChange}
            disabled={isDisabled}
            formatValue={formatAngle}
          />
          <Slider
            label="Left"
            value={leftAntenna}
            min={ANTENNA_LIMITS.min}
            max={ANTENNA_LIMITS.max}
            step={ANTENNA_LIMITS.step}
            unit="°"
            onChange={handleLeftChange}
            disabled={isDisabled}
            formatValue={formatAngle}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-500">Antenna Controls</h3>
        <button
          onClick={handleReset}
          disabled={isDisabled}
          className="text-xs px-2 py-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded disabled:opacity-50"
        >
          Reset to Center
        </button>
      </div>

      <div className="space-y-3">
        <Slider
          label="Right Antenna"
          value={rightAntenna}
          min={ANTENNA_LIMITS.min}
          max={ANTENNA_LIMITS.max}
          step={ANTENNA_LIMITS.step}
          unit="°"
          onChange={handleRightChange}
          disabled={isDisabled}
          formatValue={formatAngle}
        />
        <Slider
          label="Left Antenna"
          value={leftAntenna}
          min={ANTENNA_LIMITS.min}
          max={ANTENNA_LIMITS.max}
          step={ANTENNA_LIMITS.step}
          unit="°"
          onChange={handleLeftChange}
          disabled={isDisabled}
          formatValue={formatAngle}
        />
      </div>

      {showMirror && (
        <div className="pt-2 border-t border-gray-100">
          <Slider
            label="Mirror Mode (both)"
            value={rightAntenna}
            min={ANTENNA_LIMITS.min}
            max={ANTENNA_LIMITS.max}
            step={ANTENNA_LIMITS.step}
            unit="°"
            onChange={handleBothChange}
            disabled={isDisabled}
            formatValue={formatAngle}
          />
          <p className="text-xs text-gray-400 mt-1">
            Moves both antennas in opposite directions
          </p>
        </div>
      )}

      {/* Visual representation */}
      <div className="flex items-center justify-center gap-8 py-4">
        <div className="text-center">
          <div
            className="w-2 h-8 bg-green-500 rounded-full mx-auto transition-transform origin-bottom"
            style={{ transform: `rotate(${radToDeg(rightAntenna)}deg)` }}
          />
          <span className="text-xs text-gray-500 mt-1 block">R</span>
        </div>
        <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
          <span className="text-xs text-gray-500">Head</span>
        </div>
        <div className="text-center">
          <div
            className="w-2 h-8 bg-green-500 rounded-full mx-auto transition-transform origin-bottom"
            style={{ transform: `rotate(${radToDeg(leftAntenna)}deg)` }}
          />
          <span className="text-xs text-gray-500 mt-1 block">L</span>
        </div>
      </div>
    </div>
  );
}
