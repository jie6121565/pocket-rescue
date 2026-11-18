export class SpeechGuide {
  constructor(private readonly status: HTMLElement) {}

  speak(text: string) {
    this.status.textContent = text;
    if (!('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 0.94;
    utterance.pitch = 1;
    utterance.volume = 1;
    const voices = window.speechSynthesis.getVoices();
    utterance.voice = voices.find((voice) => voice.lang.toLowerCase() === 'en-us')
      ?? voices.find((voice) => voice.lang.toLowerCase().startsWith('en'))
      ?? null;
    window.speechSynthesis.speak(utterance);
  }

  dispose() {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  }
}
