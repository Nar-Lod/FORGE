export function forgeHaptic(pattern: number | number[] = 18) {
  if (typeof navigator === "undefined" || !("vibrate" in navigator)) return;
  try { navigator.vibrate(pattern); } catch {}
}

export function forgeTone(kind: "tap" | "success" | "achievement" = "tap") {
  if (typeof window === "undefined") return;
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const context = new AudioContextClass();
    const frequencies = kind === "achievement" ? [523.25, 659.25, 783.99] : kind === "success" ? [440, 659.25] : [330];
    const now = context.currentTime;
    frequencies.forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.frequency.value = frequency;
      oscillator.type = "sine";
      gain.gain.setValueAtTime(0.0001, now + index * 0.07);
      gain.gain.exponentialRampToValueAtTime(0.045, now + index * 0.07 + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + index * 0.07 + 0.16);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(now + index * 0.07);
      oscillator.stop(now + index * 0.07 + 0.18);
    });
    window.setTimeout(() => { void context.close(); }, 500);
  } catch {}
}
