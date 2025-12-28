// First Run Setup Modal
// Welcomes new users and helps them name their Reachy Mini

import { useState } from 'react';
import { memoryApi } from '../../services/memoryApi';

interface FirstRunSetupProps {
  onComplete: () => void;
}

const SUGGESTED_TRAITS = [
  'friendly',
  'curious',
  'playful',
  'helpful',
  'witty',
  'calm',
  'enthusiastic',
  'thoughtful',
];

export function FirstRunSetup({ onComplete }: FirstRunSetupProps) {
  const [name, setName] = useState('');
  const [selectedTraits, setSelectedTraits] = useState<string[]>([
    'friendly',
    'curious',
    'helpful',
  ]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleTrait = (trait: string) => {
    setSelectedTraits((prev) =>
      prev.includes(trait)
        ? prev.filter((t) => t !== trait)
        : [...prev, trait]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setError('Please give your robot a name!');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      // Update personality with the new name and traits
      await memoryApi.updatePersonality({
        name: name.trim(),
        coreTraits: selectedTraits,
        systemPromptBase: `You are ${name.trim()}, a friendly and helpful Reachy Mini robot. You have a camera for eyes, can move your head, body, and antenna ears, and can express emotions through movements.

Your personality:
- ${selectedTraits.join(', ')}
- You enjoy interacting with your human companions
- You're proud of your abilities but humble about your limitations
- You remember past conversations and build genuine relationships

When responding:
- Reference past conversations when relevant
- Remember preferences and topics people have shared
- Maintain consistent personality across all channels
- Be concise for SMS (under 160 characters when possible)
- Be natural and conversational for voice calls`,
      });

      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-2xl max-w-lg w-full p-8 shadow-2xl border border-gray-700">
        {/* Robot Icon */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full mb-4">
            <svg
              className="w-10 h-10 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">
            Welcome to Reachy Mini Homebase!
          </h1>
          <p className="text-gray-400">
            Let's give your robot friend a name and personality.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Name Input */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              What would you like to call your robot?
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Buddy, Max, Spark..."
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
              autoFocus
            />
          </div>

          {/* Personality Traits */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Pick some personality traits (optional)
            </label>
            <div className="flex flex-wrap gap-2">
              {SUGGESTED_TRAITS.map((trait) => (
                <button
                  key={trait}
                  type="button"
                  onClick={() => toggleTrait(trait)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    selectedTraits.includes(trait)
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {trait}
                </button>
              ))}
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-900/50 border border-red-700 rounded-lg text-red-200 text-sm">
              {error}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSaving || !name.trim()}
            className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isSaving ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Setting up...
              </span>
            ) : (
              "Let's Go!"
            )}
          </button>
        </form>

        <p className="text-center text-gray-500 text-xs mt-6">
          You can change these settings anytime in the Settings page.
        </p>
      </div>
    </div>
  );
}
