import examCreationCompletedAudio from '../assets/audios/exam-creation-completed.mp3';
import seriousWarningAudio from '../assets/audios/serious-warning.mp3';
import nonSeriousWarningAudio from '../assets/audios/non-serious-warning.mp3';

const AUDIO_MAP = {
  examCreationCompleted: examCreationCompletedAudio,
  seriousWarning: seriousWarningAudio,
  nonSeriousWarning: nonSeriousWarningAudio,
};

const DEFAULT_COOLDOWN_MS = {
  examCreationCompleted: 1000,
  seriousWarning: 2500,
  nonSeriousWarning: 3000,
};

const players = {};
const lastPlayedAt = {};

const getPlayer = (type) => {
  if (!players[type]) {
    const player = new Audio(AUDIO_MAP[type]);
    player.preload = 'auto';
    players[type] = player;
  }
  return players[type];
};

export const playWarningAudio = async (type, cooldownMs = DEFAULT_COOLDOWN_MS[type] || 2000) => {
  if (!AUDIO_MAP[type]) return false;
  const now = Date.now();
  const last = lastPlayedAt[type] || 0;
  if (now - last < cooldownMs) return false;

  try {
    const player = getPlayer(type);
    player.currentTime = 0;
    await player.play();
    lastPlayedAt[type] = now;
    return true;
  } catch {
    return false;
  }
};

