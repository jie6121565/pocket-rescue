const SIREN_INTERVAL_SECONDS = 8;
const SIREN_DURATION_SECONDS = 1.32;

export class RotorAudio {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private readonly sources: AudioScheduledSourceNode[] = [];
  private readonly sirens = new Set<OscillatorNode>();
  private sirenTimer: number | null = null;
  private nextSirenAt = 0;
  private sirenTurn = 0;
  private enabled = false;
  private focused = false;

  private initialize() {
    if (this.context) return;
    const context = new AudioContext();
    const master = context.createGain();
    master.gain.value = 0;
    master.connect(context.destination);

    const noiseBuffer = context.createBuffer(1, context.sampleRate * 2, context.sampleRate);
    const noiseData = noiseBuffer.getChannelData(0);
    let previous = 0;
    for (let index = 0; index < noiseData.length; index += 1) {
      const white = Math.random() * 2 - 1;
      previous = previous * 0.82 + white * 0.18;
      noiseData[index] = previous;
    }

    const noise = context.createBufferSource();
    noise.buffer = noiseBuffer;
    noise.loop = true;
    const filter = context.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 165;
    filter.Q.value = 0.72;
    const chop = context.createGain();
    chop.gain.value = 0.42;
    const rotorLfo = context.createOscillator();
    rotorLfo.type = 'square';
    rotorLfo.frequency.value = 22;
    const chopDepth = context.createGain();
    chopDepth.gain.value = 0.3;
    rotorLfo.connect(chopDepth);
    chopDepth.connect(chop.gain);
    noise.connect(filter);
    filter.connect(chop);
    chop.connect(master);

    const engine = context.createOscillator();
    engine.type = 'sine';
    engine.frequency.value = 54;
    const engineGain = context.createGain();
    engineGain.gain.value = 0.34;
    engine.connect(engineGain);
    engineGain.connect(master);

    const turbine = context.createOscillator();
    turbine.type = 'triangle';
    turbine.frequency.value = 118;
    const turbineGain = context.createGain();
    turbineGain.gain.value = 0.1;
    turbine.connect(turbineGain);
    turbineGain.connect(master);

    noise.start();
    rotorLfo.start();
    engine.start();
    turbine.start();
    this.sources.push(noise, rotorLfo, engine, turbine);
    this.context = context;
    this.master = master;
  }

  private updateVolume() {
    if (!this.context || !this.master) return;
    const target = this.enabled ? (this.focused ? 0.085 : 0.045) : 0;
    const now = this.context.currentTime;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setTargetAtTime(target, now, 0.08);
  }

  private startSirenSchedule() {
    if (!this.context || this.sirenTimer !== null) return;
    this.nextSirenAt = this.context.currentTime + 0.35;
    this.playScheduledSiren();
    this.sirenTimer = window.setInterval(() => this.playScheduledSiren(), 200);
  }

  private playScheduledSiren() {
    if (!this.context || !this.enabled) return;
    const now = this.context.currentTime;
    if (this.nextSirenAt > now + 0.04) return;
    const startAt = this.nextSirenAt < now - 1
      ? now + 0.03
      : Math.max(this.nextSirenAt, now + 0.02);
    this.playSiren(this.sirenTurn % 2 === 0, startAt);
    this.sirenTurn += 1;
    this.nextSirenAt = startAt + SIREN_INTERVAL_SECONDS;
  }

  private playSiren(helicopter: boolean, startAt: number) {
    if (!this.context || !this.master) return;
    const oscillator = this.context.createOscillator();
    const envelope = this.context.createGain();
    const low = helicopter ? 740 : 440;
    const high = helicopter ? 988 : 660;
    oscillator.type = helicopter ? 'sine' : 'triangle';
    oscillator.frequency.value = low;
    oscillator.frequency.setValueAtTime(low, startAt);
    if (helicopter) {
      for (let note = 0; note < 4; note += 1) {
        oscillator.frequency.setValueAtTime(note % 2 === 0 ? high : low, startAt + 0.16 + note * 0.28);
      }
    } else {
      oscillator.frequency.linearRampToValueAtTime(high, startAt + 0.38);
      oscillator.frequency.linearRampToValueAtTime(low, startAt + 0.76);
      oscillator.frequency.linearRampToValueAtTime(high, startAt + 1.14);
    }
    envelope.gain.setValueAtTime(0, startAt);
    envelope.gain.linearRampToValueAtTime(0.72, startAt + 0.035);
    envelope.gain.setValueAtTime(0.72, startAt + 1.06);
    envelope.gain.linearRampToValueAtTime(0, startAt + SIREN_DURATION_SECONDS);
    oscillator.connect(envelope);
    envelope.connect(this.master);
    this.sirens.add(oscillator);
    oscillator.onended = () => {
      this.sirens.delete(oscillator);
      oscillator.disconnect();
      envelope.disconnect();
    };
    oscillator.start(startAt);
    oscillator.stop(startAt + SIREN_DURATION_SECONDS + 0.02);
  }

  private stopSirens() {
    if (this.sirenTimer !== null) {
      window.clearInterval(this.sirenTimer);
      this.sirenTimer = null;
    }
    for (const siren of this.sirens) siren.stop();
    this.sirens.clear();
  }

  async setEnabled(enabled: boolean) {
    this.initialize();
    if (!this.context) throw new Error('Audio initialization failed');
    if (this.context.state === 'suspended') await this.context.resume();
    this.enabled = enabled;
    this.updateVolume();
    if (enabled) this.startSirenSchedule();
    else this.stopSirens();
  }

  setFocused(focused: boolean) {
    this.focused = focused;
    this.updateVolume();
  }

  async dispose() {
    this.enabled = false;
    this.stopSirens();
    for (const source of this.sources) source.stop();
    this.sources.length = 0;
    if (this.context) await this.context.close();
    this.context = null;
    this.master = null;
  }
}
