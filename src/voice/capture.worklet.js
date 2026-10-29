// Browser supplies 16 kHz via AudioContext. Emit 40 ms, PCM16 LE mono chunks.
class PcmCapture extends AudioWorkletProcessor {
  constructor() {
    super();
    this.samples = new Int16Array(640);
    this.offset = 0;
  }
  process(inputs) {
    const input = inputs[0]?.[0];
    if (input)
      for (let i = 0; i < input.length; i++) {
        const value = Math.max(-1, Math.min(1, input[i]));
        this.samples[this.offset++] = value < 0 ? value * 32768 : value * 32767;
        if (this.offset === this.samples.length) {
          const bytes = new ArrayBuffer(1280);
          const view = new DataView(bytes);
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
