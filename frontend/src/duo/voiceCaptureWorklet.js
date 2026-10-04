class VoiceCaptureProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.hold = new Float32Array(640);
    this.used = 0;
    this.dcX = 0;
    this.dcY = 0;
  }

  process(inputs) {
    const ch = inputs[0] && inputs[0][0];
    if (!ch) return true;
    const cleaned = new Float32Array(ch.length);
    const a = 0.995;
    for (let i = 0; i < ch.length; i += 1) {
      const x = ch[i];
      this.dcY = a * (this.dcY + x - this.dcX);
      this.dcX = x;
      cleaned[i] = this.dcY;
    }
    let offset = 0;
    while (offset < cleaned.length) {
      const n = Math.min(this.hold.length - this.used, cleaned.length - offset);
      this.hold.set(cleaned.subarray(offset, offset + n), this.used);
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
