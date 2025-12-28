// Move Player - Browse and Play Dances/Emotions
// Dynamically fetches available moves from datasets

import { useState, useEffect, useCallback } from 'react';
import { motionApi, MOVE_DATASETS } from '../../services/motionApi';
import { useWebSocket } from '../../hooks/useWebSocket';
import { useRobotStore } from '../../stores/robotStore';
import { WS_ENDPOINTS } from '../../config/api';
import type { MoveEvent } from '../../types/robot';

type DatasetKey = keyof typeof MOVE_DATASETS;

interface MovePlayerProps {
  compact?: boolean;
}

export function MovePlayer({ compact = false }: MovePlayerProps) {
  const [activeDataset, setActiveDataset] = useState<DatasetKey>('dances');
  const [moves, setMoves] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [playingMove, setPlayingMove] = useState<string | null>(null);
  const [playingUUID, setPlayingUUID] = useState<string | null>(null);

  // Only connect WebSocket when daemon is running
  const daemonState = useRobotStore((state) => state.daemonState);
  const isDaemonRunning = daemonState === 'running';

  // WebSocket for move status updates
  const { lastMessage } = useWebSocket({
    endpoint: WS_ENDPOINTS.moveUpdates,
    autoConnect: isDaemonRunning,
    reconnect: isDaemonRunning,
  });

  // Handle move events from WebSocket
  useEffect(() => {
    if (lastMessage && playingUUID) {
      const event = lastMessage as MoveEvent;
      if (event.uuid === playingUUID) {
        if (event.type === 'move_completed' || event.type === 'move_failed' || event.type === 'move_cancelled') {
          setPlayingMove(null);
          setPlayingUUID(null);
        }
      }
    }
  }, [lastMessage, playingUUID]);

  // Fetch moves when dataset changes
  const fetchMoves = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const dataset = MOVE_DATASETS[activeDataset];
      const moveList = await motionApi.listMoves(dataset);
      setMoves(moveList);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load moves');
      setMoves([]);
    } finally {
      setLoading(false);
    }
  }, [activeDataset]);

  useEffect(() => {
    fetchMoves();
  }, [fetchMoves]);

  const handlePlay = async (moveName: string) => {
    if (playingMove) return; // Already playing

    setPlayingMove(moveName);
    setError(null);

    try {
      const dataset = MOVE_DATASETS[activeDataset];
      const result = await motionApi.playRecorded(dataset, moveName);
      setPlayingUUID(result.uuid);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to play move');
      setPlayingMove(null);
      setPlayingUUID(null);
    }
  };

  const handleStop = async () => {
    try {
      await motionApi.stop(playingUUID || undefined);
      setPlayingMove(null);
      setPlayingUUID(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to stop move');
    }
  };

  // Get emoji for move name (simple heuristics)
  const getMoveEmoji = (name: string): string => {
    const lower = name.toLowerCase();
    if (lower.includes('happy') || lower.includes('joy')) return '😄';
    if (lower.includes('sad')) return '😢';
    if (lower.includes('angry')) return '😠';
    if (lower.includes('confused') || lower.includes('think')) return '🤔';
    if (lower.includes('yes') || lower.includes('nod')) return '✅';
    if (lower.includes('no') || lower.includes('shake')) return '❌';
    if (lower.includes('wave') || lower.includes('hello')) return '👋';
    if (lower.includes('dance')) return '💃';
    if (lower.includes('sleep') || lower.includes('tired')) return '😴';
    if (lower.includes('surprise') || lower.includes('wow')) return '😮';
    if (lower.includes('love') || lower.includes('heart')) return '❤️';
    if (lower.includes('laugh') || lower.includes('lol')) return '😂';
    if (lower.includes('wink')) return '😉';
    if (lower.includes('cool')) return '😎';
    if (activeDataset === 'dances') return '🎵';
    return '🤖';
  };

  if (compact) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <select
            value={activeDataset}
            onChange={(e) => setActiveDataset(e.target.value as DatasetKey)}
            className="text-sm border border-gray-200 rounded px-2 py-1"
          >
            <option value="dances">Dances</option>
            <option value="emotions">Emotions</option>
          </select>
          {playingMove && (
            <button
              onClick={handleStop}
              className="text-xs px-2 py-1 bg-red-100 text-red-600 rounded hover:bg-red-200"
            >
              Stop
            </button>
          )}
        </div>

        {loading ? (
          <div className="text-sm text-gray-500">Loading...</div>
        ) : (
          <div className="flex flex-wrap gap-1">
            {moves.slice(0, 6).map((move) => (
              <button
                key={move}
                onClick={() => handlePlay(move)}
                disabled={playingMove !== null}
                className={`px-2 py-1 text-xs rounded border transition-colors ${
                  playingMove === move
                    ? 'bg-green-100 border-green-300 text-green-700'
                    : 'border-gray-200 hover:bg-gray-50'
                } ${playingMove && playingMove !== move ? 'opacity-50' : ''}`}
              >
                {getMoveEmoji(move)} {move}
              </button>
            ))}
            {moves.length > 6 && (
              <span className="text-xs text-gray-400 self-center">
                +{moves.length - 6} more
              </span>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Dataset Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveDataset('dances')}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            activeDataset === 'dances'
              ? 'text-green-600 border-green-500'
              : 'text-gray-500 border-transparent hover:text-gray-700'
          }`}
        >
          🎵 Dances
        </button>
        <button
          onClick={() => setActiveDataset('emotions')}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            activeDataset === 'emotions'
              ? 'text-green-600 border-green-500'
              : 'text-gray-500 border-transparent hover:text-gray-700'
          }`}
        >
          😊 Emotions
        </button>

        {/* Stop button in header */}
        {playingMove && (
          <button
            onClick={handleStop}
            className="ml-auto px-3 py-1 text-sm bg-red-100 text-red-600 rounded hover:bg-red-200 transition-colors"
          >
            Stop Playing
          </button>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className="text-sm text-red-600 bg-red-50 rounded p-2">{error}</div>
      )}

      {/* Loading state */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500" />
        </div>
      ) : moves.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No moves found in this dataset
        </div>
      ) : (
        /* Move Grid */
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {moves.map((move) => (
            <button
              key={move}
              onClick={() => handlePlay(move)}
              disabled={playingMove !== null && playingMove !== move}
              className={`flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-all ${
                playingMove === move
                  ? 'bg-green-50 border-green-400 shadow-md'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              } ${playingMove && playingMove !== move ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <span className="text-2xl">{getMoveEmoji(move)}</span>
              <span className="text-xs font-medium text-gray-700 truncate w-full text-center">
                {move}
              </span>
              {playingMove === move && (
                <span className="text-xs text-green-600 animate-pulse">Playing...</span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Now Playing indicator */}
      {playingMove && (
        <div className="flex items-center justify-center gap-2 p-3 bg-green-50 rounded-lg border border-green-200">
          <div className="animate-bounce">🎵</div>
          <span className="text-sm font-medium text-green-700">
            Now playing: {playingMove}
          </span>
          <div className="animate-bounce delay-100">🎵</div>
        </div>
      )}
    </div>
  );
}
