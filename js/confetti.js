// confetti.js — Canvas 기반 축하 파티클 시스템 (화려한 버전)

const COLORS = [
  '#FFD700', '#FF4444', '#4488FF', '#44CC44', '#FF8800', '#AA44FF',
  '#FF2D95', '#00E5FF', '#FF6B6B', '#FFB74D', '#BA68C8', '#64B5F6',
  '#FFFFFF', '#FFC107', '#E040FB',
];
const PARTICLE_COUNT = 350;
const GRAVITY = 0.1;
const DURATION = 7000;

// 파티클 모양: circle, square, ribbon, star
const SHAPES = ['circle', 'square', 'ribbon', 'star', 'ribbon', 'ribbon'];

class Particle {
  constructor(canvasWidth, canvasHeight) {
    this.x = canvasWidth * Math.random();
    this.y = -10;
    this.vx = (Math.random() - 0.5) * 8;
    this.vy = Math.random() * 3 + 2;
    this.color = COLORS[Math.floor(Math.random() * COLORS.length)];
    this.size = Math.random() * 8 + 4;
    this.rotation = Math.random() * Math.PI * 2;
    this.rotationSpeed = (Math.random() - 0.5) * 0.3;
    this.shape = SHAPES[Math.floor(Math.random() * SHAPES.length)];
    this.opacity = 1;
    this.wobble = Math.random() * Math.PI * 2;
    this.wobbleSpeed = Math.random() * 0.1 + 0.03;

    if (this.shape === 'ribbon') {
      this.size = Math.random() * 6 + 3;
      this.ribbonLength = Math.random() * 16 + 10;
    }
    if (this.shape === 'star') {
      this.size = Math.random() * 6 + 5;
    }
  }

  update() {
    this.wobble += this.wobbleSpeed;
    this.x += this.vx + Math.sin(this.wobble) * 0.8;
    this.vy += GRAVITY;
    this.y += this.vy;
    this.rotation += this.rotationSpeed;
    this.vx *= 0.99;
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);
    ctx.globalAlpha = this.opacity;
    ctx.fillStyle = this.color;

    if (this.shape === 'circle') {
      ctx.beginPath();
      ctx.arc(0, 0, this.size / 2, 0, Math.PI * 2);
      ctx.fill();
    } else if (this.shape === 'square') {
      ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size);
    } else if (this.shape === 'ribbon') {
      ctx.fillRect(-this.size / 2, -this.ribbonLength / 2, this.size, this.ribbonLength);
    } else if (this.shape === 'star') {
      drawStar(ctx, 0, 0, 5, this.size / 2, this.size / 4);
      ctx.fill();
    }

    ctx.restore();
  }
}

function drawStar(ctx, cx, cy, spikes, outerR, innerR) {
  let rot = (Math.PI / 2) * 3;
  const step = Math.PI / spikes;
  ctx.beginPath();
  ctx.moveTo(cx, cy - outerR);
  for (let i = 0; i < spikes; i++) {
    ctx.lineTo(cx + Math.cos(rot) * outerR, cy + Math.sin(rot) * outerR);
    rot += step;
    ctx.lineTo(cx + Math.cos(rot) * innerR, cy + Math.sin(rot) * innerR);
    rot += step;
  }
  ctx.lineTo(cx, cy - outerR);
  ctx.closePath();
}

let animationId = null;
let particles = [];
let canvas = null;
let ctx = null;
let startTime = 0;
let pendingBursts = [];

function resizeCanvas() {
  if (!canvas) return;
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

function createBurst(originX, originY, count, spread, upward) {
  const burst = [];
  for (let i = 0; i < count; i++) {
    const p = new Particle(canvas.width, canvas.height);
    p.x = originX + (Math.random() - 0.5) * 40;
    p.y = originY;
    const angle = upward
      ? -Math.PI / 2 + (Math.random() - 0.5) * spread
      : Math.random() * Math.PI * 2;
    const speed = Math.random() * 10 + 4;
    p.vx = Math.cos(angle) * speed;
    p.vy = Math.sin(angle) * speed;
    burst.push(p);
  }
  return burst;
}

function animate() {
  const elapsed = Date.now() - startTime;

  // 예약된 추가 burst 처리
  for (let i = pendingBursts.length - 1; i >= 0; i--) {
    if (elapsed >= pendingBursts[i].time) {
      particles.push(...pendingBursts[i].particles);
      pendingBursts.splice(i, 1);
    }
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const fadeStart = DURATION * 0.7;
  for (const p of particles) {
    p.update();
    if (elapsed > fadeStart) {
      p.opacity = Math.max(0, 1 - (elapsed - fadeStart) / (DURATION - fadeStart));
    }
    p.draw(ctx);
  }

  // 화면 밖 파티클 제거
  particles = particles.filter(
    (p) => p.y < canvas.height + 20 && p.opacity > 0.01
  );

  if (elapsed < DURATION && (particles.length > 0 || pendingBursts.length > 0)) {
    animationId = requestAnimationFrame(animate);
  } else {
    cleanup();
  }
}

function cleanup() {
  if (animationId) {
    cancelAnimationFrame(animationId);
    animationId = null;
  }
  if (ctx && canvas) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
  particles = [];
  pendingBursts = [];
}

/**
 * confetti 발사
 * @param {HTMLCanvasElement} canvasElement
 */
export function launchConfetti(canvasElement) {
  cleanup();

  canvas = canvasElement;
  ctx = canvas.getContext('2d');
  resizeCanvas();

  const w = canvas.width;
  const h = canvas.height;

  // Wave 1: 위에서 내려오는 메인 파티클
  particles = [];
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const p = new Particle(w, h);
    p.x = w * 0.05 + Math.random() * w * 0.9;
    p.y = -Math.random() * 150;
    p.vy = Math.random() * 4 + 1;
    particles.push(p);
  }

  // Wave 1 동시: 좌우 하단 캐논 burst
  particles.push(...createBurst(w * 0.05, h * 0.85, 60, 1.2, true));
  particles.push(...createBurst(w * 0.95, h * 0.85, 60, 1.2, true));

  // Wave 2: 0.8초 후 중앙 burst
  pendingBursts.push({
    time: 800,
    particles: createBurst(w * 0.5, h * 0.6, 80, Math.PI * 2, false),
  });

  // Wave 3: 1.5초 후 좌우 추가 burst
  pendingBursts.push({
    time: 1500,
    particles: [
      ...createBurst(w * 0.15, h * 0.7, 40, 1.0, true),
      ...createBurst(w * 0.85, h * 0.7, 40, 1.0, true),
    ],
  });

  // Wave 4: 2.5초 후 위에서 한번 더
  const wave4 = [];
  for (let i = 0; i < 100; i++) {
    const p = new Particle(w, h);
    p.x = w * 0.1 + Math.random() * w * 0.8;
    p.y = -Math.random() * 80;
    p.vy = Math.random() * 5 + 2;
    wave4.push(p);
  }
  pendingBursts.push({ time: 2500, particles: wave4 });

  startTime = Date.now();
  animationId = requestAnimationFrame(animate);
}

export function stopConfetti() {
  cleanup();
}

// 창 크기 변경 대응
window.addEventListener('resize', resizeCanvas);
