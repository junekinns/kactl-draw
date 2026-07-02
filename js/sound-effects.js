// sound-effects.js - Web Audio based draw sound effects

let audioContext = null;
let sampleBufferPromise = null;

const STING_AUDIO_URL = 'assets/audio/ba-dum-bum-stings.mp3';
const FIRST_STING_START = 0.46;

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

function loadSampleBuffer(ctx) {
  if (!sampleBufferPromise) {
    sampleBufferPromise = fetch(STING_AUDIO_URL)
      .then((response) => {
        if (!response.ok) throw new Error('Failed to load sound sample.');
        return response.arrayBuffer();
      })
      .then((arrayBuffer) => ctx.decodeAudioData(arrayBuffer));
  }

  return sampleBufferPromise;
}

function playSampleSegment(ctx, buffer, startTime, offset, duration, volume, playbackRate = 1) {
  const source = ctx.createBufferSource();
  const gain = makeGain(ctx, volume, startTime, duration);

  source.buffer = buffer;
  source.playbackRate.setValueAtTime(playbackRate, startTime);
  source.connect(gain);
  source.start(startTime, offset, duration);
}

function playDrumHit(ctx, startTime, accent) {
  const osc = ctx.createOscillator();
  const gain = makeGain(ctx, accent ? 0.36 : 0.24, startTime, 0.17);

  osc.type = 'sine';
  osc.frequency.setValueAtTime(accent ? 145 : 115, startTime);
  osc.frequency.exponentialRampToValueAtTime(accent ? 52 : 45, startTime + 0.14);
  osc.connect(gain);
  osc.start(startTime);
  osc.stop(startTime + 0.18);

  playNoiseBurst(ctx, startTime, 0.045, accent ? 0.075 : 0.045, 900, 'lowpass');
}

function playNoiseBurst(
  ctx,
  startTime,
  duration,
  volume,
  filterFrequency = 1300,
  filterType = 'bandpass',
  filterQ = 1.2
) {
  const bufferSize = Math.floor(ctx.sampleRate * duration);
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);

  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
  }

  const source = ctx.createBufferSource();
  const filter = ctx.createBiquadFilter();
  const gain = makeGain(ctx, volume, startTime, duration);

  filter.type = filterType;
  filter.frequency.setValueAtTime(filterFrequency, startTime);
  filter.Q.setValueAtTime(filterQ, startTime);

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
    loadSampleBuffer(ctx).catch(() => {});
  });
}

export function startDrumRoll() {
  return safePlay((ctx) => {
    const timers = [];
    let beat = 0;
    let stopped = false;
    let sampleBuffer = null;

    loadSampleBuffer(ctx)
      .then((buffer) => {
        sampleBuffer = buffer;
      })
      .catch(() => {});

    function tick() {
      if (stopped) return;
      const startTime = ctx.currentTime;

      if (sampleBuffer) {
        const offsets = [FIRST_STING_START, FIRST_STING_START + 0.19, FIRST_STING_START + 0.39];
        playSampleSegment(
          ctx,
          sampleBuffer,
          startTime,
          offsets[beat % offsets.length],
          0.12,
          beat % 4 === 0 ? 0.62 : 0.5,
          1.12
        );
      } else {
        playDrumHit(ctx, startTime, beat % 4 === 0);
      }

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
    loadSampleBuffer(ctx)
      .then((buffer) => {
        playSampleSegment(
          ctx,
          buffer,
          ctx.currentTime,
          FIRST_STING_START + 0.93,
          0.18,
          0.18,
          1.15 + (index % 3) * 0.04
        );
      })
      .catch(() => {
        const fallbackStartTime = ctx.currentTime;
        const base = 880 + (index % 5) * 70;

        playTone(ctx, fallbackStartTime, base, 0.18, 0.065, 'triangle');
        playTone(ctx, fallbackStartTime + 0.01, base * 2, 0.12, 0.025, 'sine');
      });
  });
}

export function playFinalCymbal() {
  safePlay((ctx) => {
    loadSampleBuffer(ctx)
      .then((buffer) => {
        playSampleSegment(
          ctx,
          buffer,
          ctx.currentTime,
          FIRST_STING_START + 0.82,
          0.86,
          0.82,
          1
        );
      })
      .catch(() => {
        const fallbackStartTime = ctx.currentTime;
        const metallicFrequencies = [4200, 5400, 6600, 7900, 9300];

        playNoiseBurst(ctx, fallbackStartTime, 1.35, 0.28, 5200, 'highpass', 0.7);
        playNoiseBurst(ctx, fallbackStartTime + 0.03, 0.85, 0.12, 7600, 'bandpass', 2.6);

        metallicFrequencies.forEach((frequency, i) => {
          playTone(ctx, fallbackStartTime + i * 0.008, frequency, 0.42, 0.025, 'square');
        });

        playTone(ctx, fallbackStartTime, 190, 0.18, 0.09, 'sine');
      });
  });
}
