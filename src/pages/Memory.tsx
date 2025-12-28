// Personality Page - Edit Reggie's personality
// Controls how Reggie behaves across all interaction modes (SMS, voice, chat)

import { PersonalityEditor } from '../components/personality/PersonalityEditor';

export function Memory() {
  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-white">Personality</h1>
          <p className="text-gray-400">Define who Reggie is across all channels</p>
        </div>

        {/* Personality Editor */}
        <div className="card">
          <PersonalityEditor />
        </div>
      </div>
    </div>
  );
}
