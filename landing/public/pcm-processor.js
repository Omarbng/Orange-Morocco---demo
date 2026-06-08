// PCM capture worklet — buffers mic Float32 samples and posts them to the
// main thread in fixed-size chunks. Copied verbatim from the Agent Foundry
// share bundle (demo-agentfoundry.bngrenew.com/converse/static/pcm-processor.js)
// so the Orange UI captures audio identically to the native share page.
class PCMProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.bufferSize = 4096;
    this.buffer = new Float32Array(this.bufferSize);
    this.bufferIndex = 0;
  }

  process(inputs) {
    const input = inputs[0];
    if (!input || !input.length) return true;

    const channelData = input[0];

    for (let i = 0; i < channelData.length; i++) {
      this.buffer[this.bufferIndex++] = channelData[i];

      if (this.bufferIndex >= this.bufferSize) {
        this.port.postMessage(this.buffer);
        this.bufferIndex = 0;
      }
    }

    return true;
  }
}

registerProcessor("pcm-processor", PCMProcessor);
