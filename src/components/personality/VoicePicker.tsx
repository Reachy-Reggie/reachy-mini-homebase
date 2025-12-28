// VoicePicker Component
// Allows selecting an ElevenLabs voice for the robot

import { useState, useEffect, useRef } from 'react';
import { memoryApi } from '../../services/memoryApi';
import type { ElevenLabsVoice } from '../../types/memory';

interface VoicePickerProps {
  selectedVoiceId?: string;
  selectedVoiceName?: string;
  onChange: (voiceId: string, voiceName: string) => void;
}

export function VoicePicker({ selectedVoiceId, selectedVoiceName, onChange }: VoicePickerProps) {
  const [voices, setVoices] = useState<ElevenLabsVoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [manualVoiceId, setManualVoiceId] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    loadVoices();
  }, []);

  const loadVoices = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const voiceList = await memoryApi.getVoices();
      setVoices(voiceList);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load voices');
    } finally {
      setIsLoading(false);
    }
  };

  const playPreview = async (voice: ElevenLabsVoice) => {
    // Stop any currently playing audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    if (playingVoiceId === voice.voiceId) {
      setPlayingVoiceId(null);
      return;
    }

    setPlayingVoiceId(voice.voiceId);

    try {
      // Use preview URL if available, otherwise generate TTS
      if (voice.previewUrl) {
        const audio = new Audio(voice.previewUrl);
        audioRef.current = audio;
        audio.onended = () => setPlayingVoiceId(null);
        audio.onerror = () => setPlayingVoiceId(null);
        await audio.play();
      } else {
        // Generate TTS preview
        const blob = await memoryApi.generateTts('Hello! I am your friendly robot assistant.', voice.voiceId);
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audioRef.current = audio;
        audio.onended = () => {
          setPlayingVoiceId(null);
          URL.revokeObjectURL(url);
        };
        audio.onerror = () => {
          setPlayingVoiceId(null);
          URL.revokeObjectURL(url);
        };
        await audio.play();
      }
    } catch (err) {
      console.error('Failed to play preview:', err);
      setPlayingVoiceId(null);
    }
  };

  const selectVoice = (voice: ElevenLabsVoice) => {
    onChange(voice.voiceId, voice.name);
    setIsOpen(false);
    setShowManualInput(false);
  };

  const applyManualVoiceId = () => {
    if (manualVoiceId.trim()) {
      onChange(manualVoiceId.trim(), `Custom (${manualVoiceId.trim().substring(0, 8)}...)`);
      setShowManualInput(false);
      setManualVoiceId('');
    }
  };

  const testManualVoice = async () => {
    if (!manualVoiceId.trim()) return;

    // Stop any current playback
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    setPlayingVoiceId(manualVoiceId);

    try {
      const blob = await memoryApi.generateTts('Hello! I am your friendly robot assistant.', manualVoiceId.trim());
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => {
        setPlayingVoiceId(null);
        URL.revokeObjectURL(url);
      };
      audio.onerror = () => {
        setPlayingVoiceId(null);
        URL.revokeObjectURL(url);
      };
      await audio.play();
    } catch (err) {
      console.error('Failed to test voice:', err);
      setPlayingVoiceId(null);
    }
  };

  const filteredVoices = voices.filter((voice) =>
    voice.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    voice.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group voices by category
  const groupedVoices = filteredVoices.reduce((acc, voice) => {
    const category = voice.category || 'other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(voice);
    return acc;
  }, {} as Record<string, ElevenLabsVoice[]>);

  const categoryOrder = ['premade', 'cloned', 'generated', 'professional', 'other'];
  const sortedCategories = Object.keys(groupedVoices).sort(
    (a, b) => categoryOrder.indexOf(a) - categoryOrder.indexOf(b)
  );

  if (isLoading) {
    return (
      <div className="space-y-1">
        <label className="text-sm font-medium text-gray-300">Voice</label>
        <div className="px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-gray-400 flex items-center gap-2">
          <span className="animate-spin">&#9881;</span>
          Loading voices...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-1">
        <label className="text-sm font-medium text-gray-300">Voice</label>
        <div className="px-3 py-2 bg-red-900/30 border border-red-700 rounded-lg text-red-300 text-sm">
          {error}
          <button
            onClick={loadVoices}
            className="ml-2 underline hover:no-underline"
          >
            Retry
          </button>
        </div>
        <p className="text-xs text-gray-500">
          Make sure ELEVENLABS_API_KEY is set in the server .env file
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <label className="text-sm font-medium text-gray-300">Voice</label>

      {/* Selected Voice Display / Dropdown Trigger */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-left flex items-center justify-between hover:border-gray-500 transition-colors"
      >
        <span className={selectedVoiceName ? 'text-white' : 'text-gray-500'}>
          {selectedVoiceName || 'Select a voice...'}
        </span>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full max-w-md bg-gray-800 border border-gray-600 rounded-lg shadow-xl max-h-96 overflow-hidden">
          {/* Search */}
          <div className="p-2 border-b border-gray-700">
            <input
              type="text"
              placeholder="Search voices..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded text-white placeholder-gray-500 text-sm focus:outline-none focus:border-reachy-500"
            />
          </div>

          {/* Voice List */}
          <div className="overflow-y-auto max-h-72">
            {sortedCategories.map((category) => (
              <div key={category}>
                <div className="px-3 py-1.5 bg-gray-900 text-xs font-semibold text-gray-400 uppercase tracking-wide sticky top-0">
                  {category}
                </div>
                {groupedVoices[category].map((voice) => (
                  <div
                    key={voice.voiceId}
                    className={`px-3 py-2 flex items-center gap-3 hover:bg-gray-700 cursor-pointer ${
                      selectedVoiceId === voice.voiceId ? 'bg-reachy-500/20' : ''
                    }`}
                    onClick={() => selectVoice(voice)}
                  >
                    {/* Play Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        playPreview(voice);
                      }}
                      className="w-8 h-8 flex items-center justify-center bg-gray-700 hover:bg-gray-600 rounded-full text-white transition-colors"
                    >
                      {playingVoiceId === voice.voiceId ? (
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <rect x="6" y="4" width="4" height="16" />
                          <rect x="14" y="4" width="4" height="16" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      )}
                    </button>

                    {/* Voice Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-white font-medium truncate">{voice.name}</span>
                        {selectedVoiceId === voice.voiceId && (
                          <span className="text-reachy-400 text-xs">Selected</span>
                        )}
                      </div>
                      {voice.description && (
                        <p className="text-xs text-gray-400 truncate">{voice.description}</p>
                      )}
                      {Object.keys(voice.labels).length > 0 && (
                        <div className="flex gap-1 mt-1 flex-wrap">
                          {Object.entries(voice.labels).slice(0, 3).map(([key, value]) => (
                            <span
                              key={key}
                              className="px-1.5 py-0.5 bg-gray-700 rounded text-xs text-gray-300"
                            >
                              {value}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ))}

            {filteredVoices.length === 0 && (
              <div className="px-3 py-4 text-center text-gray-400">
                No voices found
              </div>
            )}
          </div>
        </div>
      )}

      {/* Manual Voice ID Input Toggle */}
      <button
        type="button"
        onClick={() => setShowManualInput(!showManualInput)}
        className="text-xs text-reachy-400 hover:text-reachy-300 underline"
      >
        {showManualInput ? 'Select from list' : 'Enter Voice ID manually'}
      </button>

      {/* Manual Voice ID Input */}
      {showManualInput && (
        <div className="mt-2 p-3 bg-gray-800 border border-gray-600 rounded-lg space-y-2">
          <label className="text-xs font-medium text-gray-400">ElevenLabs Voice ID</label>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="e.g., 21m00Tcm4TlvDq8ikWAM"
              value={manualVoiceId}
              onChange={(e) => setManualVoiceId(e.target.value)}
              className="flex-1 px-3 py-2 bg-gray-900 border border-gray-600 rounded text-white placeholder-gray-500 text-sm focus:outline-none focus:border-reachy-500"
            />
            <button
              type="button"
              onClick={testManualVoice}
              disabled={!manualVoiceId.trim() || playingVoiceId === manualVoiceId}
              className="px-3 py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-500 rounded text-sm text-white transition-colors flex items-center gap-1"
            >
              {playingVoiceId === manualVoiceId ? (
                <>
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <rect x="6" y="4" width="4" height="16" />
                    <rect x="14" y="4" width="4" height="16" />
                  </svg>
                  Stop
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                  Test
                </>
              )}
            </button>
            <button
              type="button"
              onClick={applyManualVoiceId}
              disabled={!manualVoiceId.trim()}
              className="px-3 py-2 bg-reachy-500 hover:bg-reachy-600 disabled:bg-gray-800 disabled:text-gray-500 rounded text-sm text-white font-medium transition-colors"
            >
              Apply
            </button>
          </div>
          <p className="text-xs text-gray-500">
            Find Voice IDs at{' '}
            <a
              href="https://elevenlabs.io/voice-library"
              target="_blank"
              rel="noopener noreferrer"
              className="text-reachy-400 hover:text-reachy-300 underline"
            >
              ElevenLabs Voice Library
            </a>
          </p>
        </div>
      )}

      <p className="text-xs text-gray-500">
        Select a voice for your robot to use across all channels
      </p>
    </div>
  );
}
