export class RotorAudio {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private readonly sources: AudioScheduledSourceNode[] = [];
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

  async setEnabled(enabled: boolean) {
    this.initialize();
    if (!this.context) throw new Error('Audio initialization failed');
    if (this.context.state === 'suspended') await this.context.resume();
    this.enabled = enabled;
    this.updateVolume();
  }

  setFocused(focused: boolean) {
    this.focused = focused;
    this.updateVolume();
  }

  async dispose() {
    for (const source of this.sources) source.stop();
    this.sources.length = 0;
    if (this.context) await this.context.close();
    this.context = null;
    this.master = null;
  }
}
