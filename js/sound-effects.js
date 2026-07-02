// sound-effects.js - MP3-based draw sound cue

let audioContext = null;
let slotBufferPromise = null;
let activeCueStop = null;

const SLOT_AUDIO_URL = 'assets/audio/slot.mp3';
const SLOT_VOLUME = 0.95;

function getAudioContext() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;

  if (!audioContext) {
    audioContext = new AudioContextClass();
  }

  return audioContext;
}

async function ensureRunningContext() {
  const ctx = getAudioContext();
  if (!ctx) return null;

  if (ctx.state === 'suspended') {
    await ctx.resume();
  }

  return ctx;
}

function loadSlotBuffer(ctx) {
  if (!slotBufferPromise) {
    slotBufferPromise = fetch(SLOT_AUDIO_URL)
      .then((response) => {
        if (!response.ok) throw new Error('Failed to load slot sound.');
        return response.arrayBuffer();
      })
      .then((arrayBuffer) => ctx.decodeAudioData(arrayBuffer));
  }

  return slotBufferPromise;
}

export function prepareSound() {
  const ctx = getAudioContext();
  if (!ctx) return;

  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }

  loadSlotBuffer(ctx).catch(() => {});
}

export async function playSlotMachineCue() {
  try {
    const ctx = await ensureRunningContext();
    if (!ctx) return () => {};

    const buffer = await loadSlotBuffer(ctx);

    if (activeCueStop) {
      activeCueStop();
    }

    const source = ctx.createBufferSource();
    const gain = ctx.createGain();
    let stopped = false;

    gain.gain.setValueAtTime(SLOT_VOLUME, ctx.currentTime);
    source.buffer = buffer;
    source.connect(gain);
    gain.connect(ctx.destination);

    const stop = () => {
      if (stopped) return;
      stopped = true;

      try {
        source.stop();
      } catch (e) {
        /* 이미 종료된 소스는 무시 */
      }

      try {
        source.disconnect();
        gain.disconnect();
      } catch (e) {
        /* 연결 해제 실패는 재생 흐름에 영향 없음 */
      }

      if (activeCueStop === stop) {
        activeCueStop = null;
      }
    };

    source.onended = () => {
      if (activeCueStop === stop) {
        activeCueStop = null;
      }

      try {
        source.disconnect();
        gain.disconnect();
      } catch (e) {
        /* 이미 해제된 연결은 무시 */
      }
    };

    source.start(ctx.currentTime);
    activeCueStop = stop;

    return stop;
  } catch (e) {
    return () => {};
  }
}
