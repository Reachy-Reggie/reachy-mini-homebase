// Reusable Slider Component

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (value: number) => void;
  onChangeEnd?: (value: number) => void;
  disabled?: boolean;
  showValue?: boolean;
  formatValue?: (value: number) => string;
}

export function Slider({
  label,
  value,
  min,
  max,
  step = 0.1,
  unit = '',
  onChange,
  onChangeEnd,
  disabled = false,
  showValue = true,
  formatValue,
}: SliderProps) {
  const displayValue = formatValue ? formatValue(value) : value.toFixed(1);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(parseFloat(e.target.value));
  };

  const handleMouseUp = () => {
    onChangeEnd?.(value);
  };

  // Calculate percentage for gradient background
  const percentage = ((value - min) / (max - min)) * 100;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-300">{label}</label>
        {showValue && (
          <span className="text-sm font-mono text-gray-200">
            {displayValue}
            {unit && <span className="text-gray-500 ml-0.5">{unit}</span>}
          </span>
        )}
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={handleChange}
        onMouseUp={handleMouseUp}
        onTouchEnd={handleMouseUp}
        disabled={disabled}
        className="w-full h-2 rounded-lg appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        style={{
          background: `linear-gradient(to right, #22c55e 0%, #22c55e ${percentage}%, #374151 ${percentage}%, #374151 100%)`,
        }}
      />
      <div className="flex justify-between text-xs text-gray-500">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  );
}
