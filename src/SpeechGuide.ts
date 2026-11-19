export class SpeechGuide {
  constructor(private readonly status: HTMLElement) {}

  speak(text: string, language: 'en-US' | 'zh-CN' = 'en-US') {
    this.status.textContent = text;
    if (!('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language;
    utterance.rate = 0.94;
    utterance.pitch = 1;
    utterance.volume = 1;
    const locale = language.toLowerCase();
    const prefix = locale.split('-')[0];
    const voices = window.speechSynthesis.getVoices();
    utterance.voice = voices.find((voice) => voice.lang.toLowerCase() === locale)
      ?? voices.find((voice) => voice.lang.toLowerCase().startsWith(prefix))
      ?? null;
    window.speechSynthesis.speak(utterance);
  }

  dispose() {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  }
}
