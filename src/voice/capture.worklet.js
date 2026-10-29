// Capture at the device's native AudioContext rate; stream 16 kHz PCM16 LE mono.
// A phase accumulator keeps the output rate exact across 16/44.1/48 kHz devices.
class PcmCapture extends AudioWorkletProcessor {
  constructor() {
    super();
    this.samples = new Int16Array(640);
    this.offset = 0;
    this.phase = 0;
    this.sum = 0;
    this.count = 0;
  }
  process(inputs) {
    const input = inputs[0]?.[0];
    if (input)
      for (let i = 0; i < input.length; i++) {
        this.sum += input[i];
        this.count++;
        this.phase += 16000;
        if (this.phase < sampleRate) continue;
        this.phase -= sampleRate;
        const value = Math.max(-1, Math.min(1, this.sum / this.count));
        this.sum = 0;
        this.count = 0;
        this.samples[this.offset++] = value < 0 ? value * 32768 : value * 32767;
        if (this.offset === this.samples.length) {
          const bytes = new ArrayBuffer(1280),
            view = new DataView(bytes);
          for (let j = 0; j < this.samples.length; j++)
            view.setInt16(j * 2, this.samples[j], true);
          this.port.postMessage(bytes, [bytes]);
          this.offset = 0;
        }
      }
    return true;
  }
}
registerProcessor("pcm-capture", PcmCapture);
