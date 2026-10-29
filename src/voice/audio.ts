// PCM is kept only in memory; WAV makes local clips playable by mobile native audio controls.
export function decodePcm(value: string) {
  const raw = atob(value);
  if (!raw.length || raw.length % 2 || raw.length > 480000)
    throw new Error("音频格式无效。");
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}
export function pcmLevel(bytes: Uint8Array) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let sum = 0;
  for (let i = 0; i < bytes.length; i += 2) {
    const sample = view.getInt16(i, true) / 32768;
    sum += sample * sample;
  }
  return bytes.length ? Math.sqrt(sum / (bytes.length / 2)) : 0;
}
export function pcmClip(chunks: Uint8Array[], rate: number) {
  const size = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
  const data = new ArrayBuffer(44 + size),
    view = new DataView(data);
  const label = (at: number, text: string) =>
    [...text].forEach((c, i) => view.setUint8(at + i, c.charCodeAt(0)));
  label(0, "RIFF");
  view.setUint32(4, 36 + size, true);
  label(8, "WAVE");
  label(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, rate, true);
  view.setUint32(28, rate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  label(36, "data");
  view.setUint32(40, size, true);
  let offset = 44;
  const bytes = new Uint8Array(data);
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return {
    blob: new Blob([data], { type: "audio/wav" }),
    duration: size / (rate * 2),
  };
}
