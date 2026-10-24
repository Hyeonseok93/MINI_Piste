// 휴식이 끝났을 때 알림: 진동(지원하는 폰) + 짧은 비프음. 둘 다 실패해도 조용히 넘어간다.

let ctx: AudioContext | null = null

/** 사용자 조작(버튼 클릭) 안에서 한 번 불러 두면 이후 타이머 종료 때 소리를 낼 수 있다 */
export function primeAudio() {
  try {
    ctx ??= new AudioContext()
    if (ctx.state === 'suspended') void ctx.resume()
  } catch {
    ctx = null
  }
}

export function beep(times = 2) {
  if (!ctx) return
  try {
    const now = ctx.currentTime
    for (let i = 0; i < times; i++) {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.frequency.value = 880
      gain.gain.setValueAtTime(0.0001, now + i * 0.28)
      gain.gain.exponentialRampToValueAtTime(0.25, now + i * 0.28 + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.28 + 0.2)
      osc.connect(gain).connect(ctx.destination)
      osc.start(now + i * 0.28)
      osc.stop(now + i * 0.28 + 0.22)
    }
  } catch {
    /* 소리 못 냄 */
  }
}

export function vibrate(pattern: number[] = [180, 90, 180]) {
  try {
    navigator.vibrate?.(pattern)
  } catch {
    /* 진동 미지원 */
  }
}
