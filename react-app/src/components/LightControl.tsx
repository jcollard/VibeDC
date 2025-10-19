import React from 'react';
import './LightControl.css';

interface LightControlProps {
  intensity: number;
  distance: number;
  onIntensityChange: (value: number) => void;
  onDistanceChange: (value: number) => void;
}

export const LightControl: React.FC<LightControlProps> = ({
  intensity,
  distance,
  onIntensityChange,
  onDistanceChange
}) => {
  // Preset light configurations
  const presets = [
    { name: 'Off', intensity: 0, distance: 0 },
    { name: 'Dim', intensity: 0.5, distance: 4 },
    { name: 'Normal', intensity: 1.0, distance: 8 },
    { name: 'Bright', intensity: 1.5, distance: 10 },
    { name: 'Torch', intensity: 2.0, distance: 12 }
  ];

  const applyPreset = (preset: typeof presets[0]) => {
    onIntensityChange(preset.intensity);
    onDistanceChange(preset.distance);
  };

  return (
    <div className="light-control">
      <h4>💡 Light Source</h4>

      {/* Quick presets */}
      <div className="light-presets">
        {presets.map((preset) => (
          <button
            key={preset.name}
            className={`preset-button ${
              intensity === preset.intensity && distance === preset.distance
                ? 'active'
                : ''
            }`}
            onClick={() => applyPreset(preset)}
            title={`${preset.name}: Intensity ${preset.intensity}, Range ${preset.distance}`}
          >
            {preset.name}
          </button>
        ))}
      </div>

      {/* Fine-tune controls */}
      <div className="light-sliders">
        <div className="slider-group">
          <label>
            Intensity: <span className="value">{intensity.toFixed(1)}</span>
          </label>
          <input
            type="range"
            min="0"
            max="3"
            step="0.1"
            value={intensity}
            onChange={(e) => onIntensityChange(Number(e.target.value))}
            className="slider"
          />
          <div className="slider-labels">
            <span>Off</span>
            <span>Bright</span>
          </div>
        </div>

        <div className="slider-group">
          <label>
            Range: <span className="value">{distance.toFixed(0)} tiles</span>
          </label>
          <input
            type="range"
            min="0"
            max="15"
            step="1"
            value={distance}
            onChange={(e) => onDistanceChange(Number(e.target.value))}
            className="slider"
          />
          <div className="slider-labels">
            <span>0</span>
            <span>15</span>
          </div>
        </div>
      </div>

      {/* Visual indicator */}
      <div className="light-indicator">
        <div
          className="light-glow"
          style={{
            opacity: Math.min(intensity / 2, 1),
            boxShadow: `0 0 ${distance * 2}px rgba(255, 221, 170, ${intensity / 3})`
          }}
        />
        <span className="indicator-text">
          {intensity === 0 ? 'Dark' : intensity < 1 ? 'Dim' : intensity < 2 ? 'Lit' : 'Blazing'}
        </span>
      </div>
    </div>
  );
};
