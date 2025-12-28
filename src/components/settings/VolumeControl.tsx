// Volume Control Component
// Speaker and microphone volume sliders

import { useState, useEffect, useCallback } from 'react';
import { volumeApi } from '../../services/volumeApi';
import { Slider } from '../common/Slider';

export function VolumeControl() {
  const [speakerVolume, setSpeakerVolume] = useState(50);
  const [micVolume, setMicVolume] = useState(50);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [device, setDevice] = useState<string>('');
  const [testingSound, setTestingSound] = useState(false);

  const fetchVolumes = useCallback(async () => {
    try {
      const [speaker, mic] = await Promise.all([
        volumeApi.getCurrent(),
        volumeApi.getMicCurrent(),
      ]);
      setSpeakerVolume(speaker.volume);
      setMicVolume(mic.volume);
      setDevice(speaker.device);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load volume');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVolumes();
  }, [fetchVolumes]);

  const handleSpeakerChange = async (value: number) => {
    setSpeakerVolume(value);
  };

  const handleSpeakerChangeEnd = async (value: number) => {
    try {
      await volumeApi.set(value);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set volume');
    }
  };

  const handleMicChange = async (value: number) => {
    setMicVolume(value);
  };

  const handleMicChangeEnd = async (value: number) => {
    try {
      await volumeApi.setMic(value);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set mic volume');
    }
  };

  const handleTestSound = async () => {
    setTestingSound(true);
    try {
      await volumeApi.testSound();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to play test sound');
    } finally {
      setTimeout(() => setTestingSound(false), 1000);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-reachy-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="text-sm text-red-400 bg-red-900/30 border border-red-500/30 rounded-lg p-2">{error}</div>
      )}

      {/* Speaker Volume */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
            </svg>
            <span className="text-sm font-medium text-gray-300">Speaker</span>
          </div>
          <button
            onClick={handleTestSound}
            disabled={testingSound}
            className="text-xs px-2 py-1 text-gray-400 hover:text-gray-200 hover:bg-gray-700 rounded-lg disabled:opacity-50 transition-colors"
          >
            {testingSound ? 'Playing...' : 'Test Sound'}
          </button>
        </div>
        <Slider
          label=""
          value={speakerVolume}
          min={0}
          max={100}
          step={1}
          unit="%"
          onChange={handleSpeakerChange}
          onChangeEnd={handleSpeakerChangeEnd}
          showValue={true}
          formatValue={(v) => v.toFixed(0)}
        />
      </div>

      {/* Microphone Volume */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
          <span className="text-sm font-medium text-gray-300">Microphone</span>
        </div>
        <Slider
          label=""
          value={micVolume}
          min={0}
          max={100}
          step={1}
          unit="%"
          onChange={handleMicChange}
          onChangeEnd={handleMicChangeEnd}
          showValue={true}
          formatValue={(v) => v.toFixed(0)}
        />
      </div>

      {/* Device Info */}
      {device && (
        <div className="text-xs text-gray-500 text-center">
          Audio Device: {device}
        </div>
      )}
    </div>
  );
}
