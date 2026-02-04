// confetti.js — Canvas 기반 축하 파티클 시스템

const COLORS = ['#FFD700', '#FF4444', '#4488FF', '#44CC44', '#FF8800', '#AA44FF'];
const PARTICLE_COUNT = 150;
const GRAVITY = 0.12;
const DURATION = 5000;

class Particle {
  constructor(canvasWidth, canvasHeight) {
    this.x = canvasWidth * Math.random();
    this.y = -10;
    this.vx = (Math.random() - 0.5) * 8;
    this.vy = Math.random() * 3 + 2;
    this.color = COLORS[Math.floor(Math.random() * COLORS.length)];
    this.size = Math.random() * 8 + 4;
    this.rotation = Math.random() * Math.PI * 2;
    this.rotationSpeed = (Math.random() - 0.5) * 0.2;
    this.isCircle = Math.random() > 0.5;
    this.opacity = 1;
  }

  update() {
    this.x += this.vx;
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

    if (this.isCircle) {
      ctx.beginPath();
      ctx.arc(0, 0, this.size / 2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size);
    }

    ctx.restore();
  }
}

let animationId = null;
let particles = [];
let canvas = null;
let ctx = null;
let startTime = 0;

function resizeCanvas() {
  if (!canvas) return;
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

function animate() {
  const elapsed = Date.now() - startTime;

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

  if (elapsed < DURATION && particles.length > 0) {
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

  particles = [];
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const p = new Particle(canvas.width, canvas.height);
    // 위에서 다양한 위치에서 시작
    p.x = canvas.width * 0.1 + Math.random() * canvas.width * 0.8;
    p.y = -Math.random() * 100;
    p.vy = Math.random() * 4 + 1;
    particles.push(p);
  }

  startTime = Date.now();
  animationId = requestAnimationFrame(animate);
}

export function stopConfetti() {
  cleanup();
}

// 창 크기 변경 대응
window.addEventListener('resize', resizeCanvas);
