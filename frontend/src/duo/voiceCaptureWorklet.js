class VoiceCaptureProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.hold = new Float32Array(512);
    this.used = 0;
  }

  process(inputs) {
    const ch = inputs[0] && inputs[0][0];
    if (!ch) return true;
    let offset = 0;
    while (offset < ch.length) {
      const n = Math.min(this.hold.length - this.used, ch.length - offset);
      this.hold.set(ch.subarray(offset, offset + n), this.used);
      this.used += n;
      offset += n;
      if (this.used === this.hold.length) {
        this.port.postMessage(this.hold.slice(0));
        this.used = 0;
      }
    }
    return true;
  }
}

registerProcessor('voice-capture', VoiceCaptureProcessor);
