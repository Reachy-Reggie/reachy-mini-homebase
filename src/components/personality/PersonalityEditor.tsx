// Personality Editor Component
// Allows editing the robot's personality traits and system prompt

import { useState, useEffect } from 'react';
import { TagInput } from '../common/TagInput';
import { VoicePicker } from './VoicePicker';
import { memoryApi } from '../../services/memoryApi';
import type { ApiPersonality } from '../../types/memory';

export function PersonalityEditor() {
  const [personality, setPersonality] = useState<ApiPersonality | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Load personality on mount
  useEffect(() => {
    loadPersonality();
  }, []);

  const loadPersonality = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await memoryApi.getPersonality();
      setPersonality(data);
      setHasChanges(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load personality');
    } finally {
      setIsLoading(false);
    }
  };

  const updateField = <K extends keyof ApiPersonality>(
    field: K,
    value: ApiPersonality[K]
  ) => {
    if (!personality) return;
    setPersonality({ ...personality, [field]: value });
    setHasChanges(true);
    setSuccessMessage(null);
  };

  const handleSave = async () => {
    if (!personality || !hasChanges) return;

    setIsSaving(true);
    setError(null);
    try {
      const updated = await memoryApi.updatePersonality(personality);
      setPersonality(updated);
      setHasChanges(false);
      setSuccessMessage('Personality saved successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save personality');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    if (!confirm('Are you sure you want to reset to default personality? This cannot be undone.')) {
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      const reset = await memoryApi.resetPersonality();
      setPersonality(reset);
      setHasChanges(false);
      setSuccessMessage('Personality reset to defaults');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset personality');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin text-2xl">&#9881;</div>
        <span className="ml-3 text-gray-400">Loading personality...</span>
      </div>
    );
  }

  if (!personality) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-400">{error || 'Failed to load personality'}</p>
        <button
          onClick={loadPersonality}
          className="mt-4 px-4 py-2 bg-reachy-500 hover:bg-reachy-400 rounded-lg text-white"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Error Banner */}
      {error && (
        <div className="px-4 py-3 bg-red-900/50 border border-red-700 rounded-lg text-red-200">
          {error}
        </div>
      )}

      {/* Success Banner */}
      {successMessage && (
        <div className="px-4 py-3 bg-green-900/50 border border-green-700 rounded-lg text-green-200">
          {successMessage}
        </div>
      )}

      {/* Name */}
      <div className="space-y-1">
        <label className="text-sm font-medium text-gray-300">Name</label>
        <input
          type="text"
          value={personality.name}
          onChange={(e) => updateField('name', e.target.value)}
          className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-reachy-500 focus:ring-1 focus:ring-reachy-500"
          placeholder="Your robot's name"
        />
      </div>

      {/* Core Traits */}
      <TagInput
        label="Core Traits"
        tags={personality.coreTraits}
        onChange={(tags) => updateField('coreTraits', tags)}
        placeholder="Add trait (e.g., friendly, curious)..."
      />

      {/* Communication Style */}
      <div className="space-y-1">
        <label className="text-sm font-medium text-gray-300">Communication Style</label>
        <textarea
          value={personality.communicationStyle}
          onChange={(e) => updateField('communicationStyle', e.target.value)}
          rows={2}
          className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-reachy-500 focus:ring-1 focus:ring-reachy-500 resize-none"
          placeholder="Describe how your robot communicates..."
        />
      </div>

      {/* Humor Style */}
      <div className="space-y-1">
        <label className="text-sm font-medium text-gray-300">Humor Style</label>
        <input
          type="text"
          value={personality.humorStyle || ''}
          onChange={(e) => updateField('humorStyle', e.target.value || undefined)}
          className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-reachy-500 focus:ring-1 focus:ring-reachy-500"
          placeholder="e.g., Light-hearted, robot puns..."
        />
      </div>

      {/* Interests */}
      <TagInput
        label="Interests"
        tags={personality.interests || []}
        onChange={(tags) => updateField('interests', tags)}
        placeholder="Add interest..."
      />

      {/* Boundaries */}
      <TagInput
        label="Boundaries"
        tags={personality.boundaries || []}
        onChange={(tags) => updateField('boundaries', tags)}
        placeholder="Add boundary..."
      />

      {/* Voice Section */}
      <div className="space-y-4 p-4 bg-gray-900/50 rounded-lg border border-gray-700">
        <h3 className="text-lg font-medium text-white flex items-center gap-2">
          <span>Voice Settings</span>
          <span className="text-xs px-2 py-0.5 bg-reachy-500/20 text-reachy-400 rounded">ElevenLabs</span>
        </h3>

        {/* Voice Picker */}
        <div className="relative">
          <VoicePicker
            selectedVoiceId={personality.elevenLabsVoiceId}
            selectedVoiceName={personality.elevenLabsVoiceName}
            onChange={(voiceId, voiceName) => {
              setPersonality({
                ...personality,
                elevenLabsVoiceId: voiceId,
                elevenLabsVoiceName: voiceName,
              });
              setHasChanges(true);
              setSuccessMessage(null);
            }}
          />
        </div>

        {/* TTS Toggle */}
        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm font-medium text-gray-300">Enable Text-to-Speech</label>
            <p className="text-xs text-gray-500">Your robot will speak responses aloud</p>
          </div>
          <button
            type="button"
            onClick={() => updateField('ttsEnabled', !personality.ttsEnabled)}
            className={`
              relative inline-flex h-6 w-11 items-center rounded-full transition-colors
              ${personality.ttsEnabled ? 'bg-reachy-500' : 'bg-gray-600'}
            `}
          >
            <span
              className={`
                inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                ${personality.ttsEnabled ? 'translate-x-6' : 'translate-x-1'}
              `}
            />
          </button>
        </div>

        {/* Voice Description (for reference) */}
        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-300">Voice Description</label>
          <input
            type="text"
            value={personality.voiceDescription || ''}
            onChange={(e) => updateField('voiceDescription', e.target.value || undefined)}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-reachy-500 focus:ring-1 focus:ring-reachy-500"
            placeholder="e.g., Friendly, warm, slightly robotic..."
          />
          <p className="text-xs text-gray-500">Text description of the desired voice characteristics</p>
        </div>
      </div>

      {/* System Prompt Base */}
      <div className="space-y-1">
        <label className="text-sm font-medium text-gray-300">System Prompt Base</label>
        <textarea
          value={personality.systemPromptBase}
          onChange={(e) => updateField('systemPromptBase', e.target.value)}
          rows={8}
          className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-reachy-500 focus:ring-1 focus:ring-reachy-500 resize-y font-mono text-sm"
          placeholder="Base system prompt for your robot's AI..."
        />
        <p className="text-xs text-gray-500">
          This is the foundation of your robot&apos;s personality prompt. It&apos;s combined with traits, boundaries, and context.
        </p>
      </div>

      {/* Last Updated */}
      {personality.updatedAt && (
        <p className="text-sm text-gray-500">
          Last updated: {new Date(personality.updatedAt).toLocaleString()}
        </p>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-700">
        <button
          onClick={handleReset}
          disabled={isSaving}
          className="px-4 py-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
        >
          Reset to Default
        </button>
        <button
          onClick={handleSave}
          disabled={!hasChanges || isSaving}
          className={`
            px-6 py-2 rounded-lg font-medium transition-all
            ${hasChanges
              ? 'bg-reachy-500 hover:bg-reachy-400 text-white shadow-glow-sm hover:shadow-glow'
              : 'bg-gray-700 text-gray-500 cursor-not-allowed'}
          `}
        >
          {isSaving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}
