// app.js — UI 통합, 이벤트 핸들링, 애니메이션 오케스트레이션

import { validateInputs, parseExcludeInput, drawNumbers, generateSecureRandom } from './draw-engine.js';
import { launchConfetti } from './confetti.js';
import { prepareSound, startDrumRoll, playResultPing, playFinalFanfare } from './sound-effects.js';

const $ = (sel) => document.querySelector(sel);

const startInput = $('#start-number');
const endInput = $('#end-number');
const countInput = $('#draw-count');
const excludeInput = $('#exclude-numbers');
const drawBtn = $('#draw-btn');
const resetHistoryBtn = $('#reset-history-btn');
const resultArea = $('#result-area');
const errorMsg = $('#error-message');
const confettiCanvas = $('#confetti-canvas');
const lotteryMachine = $('#lottery-machine');
const machineBallsContainer = $('#machine-balls');
const titleMain = $('#title-main');
const titleSub = $('#title-sub');

let isDrawing = false;
let drawnHistory = new Set();

const DRAWN_HISTORY_STORAGE_KEY = 'kactl-draw-drawn-history';

/* === 편집 가능한 제목 === */
const TITLE_STORAGE_KEY = 'kactl-draw-title';

function updateDocumentTitle() {
  const main = titleMain.textContent.trim();
  const sub = titleSub.textContent.trim();
  document.title = [main, sub].filter(Boolean).join(' ') || '경품추첨';
}

function saveTitle() {
  try {
    localStorage.setItem(TITLE_STORAGE_KEY, JSON.stringify({
      main: titleMain.textContent,
      sub: titleSub.textContent,
    }));
  } catch (e) {
    /* localStorage 사용 불가 시 무시 */
  }
}

function loadTitle() {
  try {
    const saved = JSON.parse(localStorage.getItem(TITLE_STORAGE_KEY) || 'null');
    if (saved && typeof saved.main === 'string') titleMain.textContent = saved.main;
    if (saved && typeof saved.sub === 'string') titleSub.textContent = saved.sub;
  } catch (e) {
    /* 손상된 값 무시 */
  }
  updateDocumentTitle();
}

function setupEditableTitle(el) {
  // 편집 중 Enter는 줄바꿈 대신 편집 종료
  el.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation(); // 제목 편집 중 Enter로 추첨이 실행되지 않도록
      el.blur();
    }
  });
  el.addEventListener('input', () => {
    updateDocumentTitle();
    saveTitle();
  });
  // 붙여넣기는 서식 없는 순수 텍스트로
  el.addEventListener('paste', (e) => {
    e.preventDefault();
    const text = (e.clipboardData || window.clipboardData).getData('text/plain');
    document.execCommand('insertText', false, text);
  });
}

setupEditableTitle(titleMain);
setupEditableTitle(titleSub);
loadTitle();

const BALL_COLORS = [
  'ball-red', 'ball-orange', 'ball-yellow', 'ball-green',
  'ball-blue', 'ball-purple', 'ball-pink',
];

const MACHINE_BALL_BG = [
  'radial-gradient(circle at 35% 30%, #FF6B6B, #E53935 50%, #B71C1C 85%)',
  'radial-gradient(circle at 35% 30%, #FFB74D, #FB8C00 50%, #E65100 85%)',
  'radial-gradient(circle at 35% 30%, #FFF176, #FDD835 50%, #F9A825 85%)',
  'radial-gradient(circle at 35% 30%, #81C784, #43A047 50%, #1B5E20 85%)',
  'radial-gradient(circle at 35% 30%, #64B5F6, #1E88E5 50%, #0D47A1 85%)',
  'radial-gradient(circle at 35% 30%, #BA68C8, #8E24AA 50%, #4A148C 85%)',
  'radial-gradient(circle at 35% 30%, #F48FB1, #EC407A 50%, #AD1457 85%)',
];

function getBallColorClass(index) {
  return BALL_COLORS[index % BALL_COLORS.length];
}

function showError(msg) {
  errorMsg.textContent = msg;
  errorMsg.classList.add('visible');
  errorMsg.classList.remove('info');
  errorMsg.classList.add('shake');
  setTimeout(() => errorMsg.classList.remove('shake'), 500);
}

function showInfo(msg) {
  errorMsg.textContent = msg;
  errorMsg.classList.add('visible');
  errorMsg.classList.add('info');
}

function clearError() {
  errorMsg.textContent = '';
  errorMsg.classList.remove('visible');
  errorMsg.classList.remove('info');
}

function loadDrawnHistory() {
  try {
    const saved = JSON.parse(localStorage.getItem(DRAWN_HISTORY_STORAGE_KEY) || '[]');
    if (!Array.isArray(saved)) return new Set();
    return new Set(saved.filter(Number.isInteger));
  } catch (e) {
    return new Set();
  }
}

function saveDrawnHistory() {
  try {
    const sortedHistory = [...drawnHistory].sort((a, b) => a - b);
    localStorage.setItem(DRAWN_HISTORY_STORAGE_KEY, JSON.stringify(sortedHistory));
  } catch (e) {
    /* localStorage 사용 불가 시 이번 화면 세션에서만 유지 */
  }
}

function getCombinedExcludeSet(manualExcludeSet) {
  return new Set([...manualExcludeSet, ...drawnHistory]);
}

function addResultsToHistory(results) {
  results.forEach((num) => drawnHistory.add(num));
  saveDrawnHistory();
}

function resetDrawnHistory() {
  drawnHistory.clear();
  saveDrawnHistory();
  showInfo('저장된 추첨 기록을 초기화했습니다. 이전에 나온 숫자도 다시 나올 수 있습니다.');
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function fillMachineWithBalls(start, end, excludeSet) {
  machineBallsContainer.innerHTML = '';

  const candidates = [];
  for (let i = start; i <= end; i++) {
    if (!excludeSet.has(i)) candidates.push(i);
  }

  const displayCount = Math.min(candidates.length, 30);
  const displayNums = [];
  const used = new Set();
  for (let i = 0; i < displayCount; i++) {
    let idx;
    do {
      idx = generateSecureRandom(0, candidates.length - 1);
    } while (used.has(idx) && used.size < candidates.length);
    used.add(idx);
    displayNums.push(candidates[idx]);
  }

  const dome = machineBallsContainer.parentElement;
  const domeW = dome.clientWidth;
  const domeH = dome.clientHeight;
  const ballSize = Math.max(Math.min(domeW * 0.11, 56), 30);

  displayNums.forEach((num, i) => {
    const ball = document.createElement('div');
    ball.className = 'machine-ball';
    ball.textContent = num;
    ball.style.background = MACHINE_BALL_BG[i % MACHINE_BALL_BG.length];
    ball.style.width = ballSize + 'px';
    ball.style.height = ballSize + 'px';
    ball.style.fontSize = (ballSize * 0.4) + 'px';

    const x = Math.random() * (domeW - ballSize * 2) + ballSize * 0.5;
    const y = Math.random() * (domeH - ballSize * 2) + ballSize * 0.5;
    ball.style.left = x + 'px';
    ball.style.top = y + 'px';

    machineBallsContainer.appendChild(ball);
  });
}

function startMixingAnimation() {
  const balls = machineBallsContainer.querySelectorAll('.machine-ball');
  const dome = machineBallsContainer.parentElement;
  const domeW = dome.clientWidth;
  const domeH = dome.clientHeight;
  let running = true;

  balls.forEach((ball) => {
    const size = ball.clientWidth;
    ball.style.transition = 'left 0.15s linear, top 0.15s linear, transform 0.15s linear';

    function move() {
      if (!running) return;
      const x = Math.random() * (domeW - size * 2) + size * 0.5;
      const y = Math.random() * (domeH - size * 2) + size * 0.5;
      ball.style.left = x + 'px';
      ball.style.top = y + 'px';
      ball.style.transform = `rotate(${Math.random() * 720 - 360}deg)`;
      setTimeout(move, 80 + Math.random() * 120);
    }
    setTimeout(move, Math.random() * 100);
  });

  return () => { running = false; };
}

async function showResultBall(number, index) {
  playResultPing(index);

  const ball = document.createElement('div');
  ball.className = `ball ${getBallColorClass(index)} ball-enter`;
  ball.style.setProperty('--glow-delay', `${index * 0.3}s`);

  const numSpan = document.createElement('span');
  numSpan.className = 'ball-number';
  numSpan.textContent = number;
  ball.appendChild(numSpan);

  resultArea.appendChild(ball);
  await sleep(250);
}

async function runDraw() {
  if (isDrawing) return;

  clearError();

  const start = parseInt(startInput.value, 10);
  const end = parseInt(endInput.value, 10);
  const count = parseInt(countInput.value, 10);
  const manualExcludeSet = parseExcludeInput(excludeInput.value);
  const excludeSet = getCombinedExcludeSet(manualExcludeSet);

  const validation = validateInputs(start, end, count, excludeSet);
  if (!validation.valid) {
    const resetWouldHelp = validateInputs(start, end, count, manualExcludeSet).valid;
    const resetHint = resetWouldHelp
      ? ' 저장된 추첨 기록을 초기화하면 이전 숫자를 다시 뽑을 수 있습니다.'
      : '';
    showError(validation.error + resetHint);
    return;
  }

  isDrawing = true;
  prepareSound();
  drawBtn.disabled = true;
  resetHistoryBtn.disabled = true;
  drawBtn.textContent = '추첨 중...';
  resultArea.innerHTML = '';

  const results = drawNumbers(start, end, count, excludeSet);
  addResultsToHistory(results);

  // 1. 추첨기 표시 & 공 채우기
  lotteryMachine.classList.remove('hidden');
  lotteryMachine.classList.remove('fade-out');
  await sleep(100);
  fillMachineWithBalls(start, end, excludeSet);

  // 2. 섞기 시작 (결과 끝까지 계속)
  const stopMixing = startMixingAnimation();
  const stopDrumRoll = startDrumRoll();
  await sleep(3000);
  stopDrumRoll();

  // 3. 결과 공들 탕탕탕 (기계는 계속 돌아감)
  for (let i = 0; i < results.length; i++) {
    await showResultBall(results[i], i);
  }
  playFinalFanfare();

  // 4. 결과 다 나오면 멈추고 페이드아웃
  stopMixing();
  lotteryMachine.classList.add('fade-out');
  await sleep(500);
  lotteryMachine.classList.add('hidden');

  // 5. 축하
  launchConfetti(confettiCanvas);

  isDrawing = false;
  drawBtn.disabled = false;
  resetHistoryBtn.disabled = false;
  drawBtn.textContent = '추첨';
}

drawnHistory = loadDrawnHistory();

drawBtn.addEventListener('click', runDraw);
resetHistoryBtn.addEventListener('click', () => {
  if (isDrawing) return;
  resetDrawnHistory();
});

document.addEventListener('keydown', (e) => {
  if (e.target === resetHistoryBtn) return;
  if (e.key === 'Enter' && !isDrawing) {
    runDraw();
  }
});
