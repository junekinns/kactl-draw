// sound-effects.js - Web Audio based draw sound effects

let audioContext = null;

function getAudioContext() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;

  if (!audioContext) {
    audioContext = new AudioContextClass();
  }

  return audioContext;
}

function safePlay(playFn) {
  try {
    const ctx = getAudioContext();
    if (!ctx) return null;
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    return playFn(ctx);
  } catch (e) {
    return null;
  }
}

function makeGain(ctx, volume, startTime, duration) {
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(volume, startTime);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
  gain.connect(ctx.destination);
  return gain;
}

function playTone(ctx, startTime, frequency, duration, volume, type = 'sine') {
  const osc = ctx.createOscillator();
  const gain = makeGain(ctx, volume, startTime, duration);

  osc.type = type;
  osc.frequency.setValueAtTime(frequency, startTime);
  osc.connect(gain);
  osc.start(startTime);
  osc.stop(startTime + duration);
}

function playDrumHit(ctx, startTime, accent) {
  const osc = ctx.createOscillator();
  const gain = makeGain(ctx, accent ? 0.2 : 0.13, startTime, 0.15);

  osc.type = 'sine';
  osc.frequency.setValueAtTime(accent ? 145 : 115, startTime);
  osc.frequency.exponentialRampToValueAtTime(accent ? 55 : 48, startTime + 0.12);
  osc.connect(gain);
  osc.start(startTime);
  osc.stop(startTime + 0.16);
}

function playNoiseBurst(ctx, startTime, duration, volume) {
  const bufferSize = Math.floor(ctx.sampleRate * duration);
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);

  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
  }

  const source = ctx.createBufferSource();
  const filter = ctx.createBiquadFilter();
  const gain = makeGain(ctx, volume, startTime, duration);

  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(1300, startTime);
  filter.Q.setValueAtTime(1.2, startTime);

  source.buffer = buffer;
  source.connect(filter);
  filter.connect(gain);
  source.start(startTime);
  source.stop(startTime + duration);
}

export function prepareSound() {
  safePlay((ctx) => {
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
  });
}

export function startDrumRoll() {
  return safePlay((ctx) => {
    const timers = [];
    let beat = 0;
    let stopped = false;

    function tick() {
      if (stopped) return;
      playDrumHit(ctx, ctx.currentTime, beat % 4 === 0);
      beat++;
      timers.push(setTimeout(tick, 115));
    }

    tick();

    return () => {
      stopped = true;
      timers.forEach((timer) => clearTimeout(timer));
    };
  }) || (() => {});
}

export function playResultPing(index) {
  safePlay((ctx) => {
    const startTime = ctx.currentTime;
    const base = 880 + (index % 5) * 70;

    playTone(ctx, startTime, base, 0.22, 0.12, 'triangle');
    playTone(ctx, startTime + 0.01, base * 2, 0.15, 0.055, 'sine');
  });
}

export function playFinalFanfare() {
  safePlay((ctx) => {
    const startTime = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5];

    notes.forEach((note, i) => {
      playTone(ctx, startTime + i * 0.08, note, 0.32, 0.11, 'triangle');
    });

    [523.25, 659.25, 783.99, 1046.5].forEach((note) => {
      playTone(ctx, startTime + 0.34, note, 0.55, 0.08, 'sine');
    });

    playNoiseBurst(ctx, startTime + 0.32, 0.45, 0.07);
  });
}
