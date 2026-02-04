// draw-engine.js — 순수 로직 모듈 (DOM 의존 없음)

/**
 * crypto.getRandomValues()를 사용한 균등 분포 난수 생성
 * 모듈로 바이어스를 rejection sampling으로 제거
 */
export function generateSecureRandom(min, max) {
  const range = max - min + 1;
  if (range <= 0) throw new Error('max는 min보다 크거나 같아야 합니다.');

  const bytesNeeded = Math.ceil(Math.log2(range) / 8) || 1;
  const maxValid = Math.floor((256 ** bytesNeeded) / range) * range;
  const arr = new Uint8Array(bytesNeeded);

  while (true) {
    crypto.getRandomValues(arr);
    let value = 0;
    for (let i = 0; i < bytesNeeded; i++) {
      value = value * 256 + arr[i];
    }
    if (value < maxValid) {
      return min + (value % range);
    }
  }
}

/**
 * 콤마 구분 입력 문자열을 Set<number>로 파싱
 * 비정수 값은 무시
 */
export function parseExcludeInput(inputString) {
  if (!inputString || !inputString.trim()) return new Set();

  const result = new Set();
  const parts = inputString.split(',');
  for (const part of parts) {
    const trimmed = part.trim();
    if (trimmed === '') continue;
    const num = Number(trimmed);
    if (Number.isInteger(num)) {
      result.add(num);
    }
  }
  return result;
}

/**
 * 입력값 유효성 검증
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateInputs(start, end, count, excludeList) {
  if (!Number.isInteger(start)) {
    return { valid: false, error: '시작 숫자를 정확히 입력해주세요.' };
  }
  if (!Number.isInteger(end)) {
    return { valid: false, error: '끝 숫자를 정확히 입력해주세요.' };
  }
  if (start > end) {
    return { valid: false, error: '시작 숫자가 끝 숫자보다 클 수 없습니다.' };
  }
  if (!Number.isInteger(count) || count < 1) {
    return { valid: false, error: '뽑을 갯수는 1 이상이어야 합니다.' };
  }

  const excludeSet = excludeList instanceof Set ? excludeList : new Set(excludeList);
  let available = 0;
  for (let i = start; i <= end; i++) {
    if (!excludeSet.has(i)) available++;
  }

  if (available < count) {
    return {
      valid: false,
      error: `뽑을 수 있는 숫자가 부족합니다. (가용: ${available}개, 요청: ${count}개)`,
    };
  }

  return { valid: true };
}

/**
 * 중복 없는 랜덤 숫자 추첨
 * partial Fisher-Yates 셔플 사용
 * @returns {number[]} 정렬된 결과 배열
 */
export function drawNumbers(start, end, count, excludeSet) {
  // 유효 풀 생성
  const pool = [];
  for (let i = start; i <= end; i++) {
    if (!excludeSet.has(i)) {
      pool.push(i);
    }
  }

  // partial Fisher-Yates 셔플
  for (let i = pool.length - 1; i > pool.length - 1 - count; i--) {
    const j = generateSecureRandom(0, i);
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  const result = pool.slice(pool.length - count);
  result.sort((a, b) => a - b);
  return result;
}
