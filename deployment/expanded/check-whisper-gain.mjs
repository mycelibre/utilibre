// Bounded native-capture regression, not a speech-quality/hardware benchmark.
// Original synthetic waveform; no microphone audio or identifiers retained.
import assert from 'node:assert/strict';
import {mkdtemp, writeFile} from 'node:fs/promises';
import {chromium} from '../../portal/node_modules/playwright-core/index.mjs';

const origin = process.env.WHISPER_CHECK_URL || 'https://transcribe.utilibre.org';
assert(['http://127.0.0.1:3347', 'https://transcribe.utilibre.org'].includes(origin));
const output = await mkdtemp('/tmp/utilibre-whisper-gain-');
const rate = 48000, frames = rate * 8;
const wav = Buffer.alloc(44 + frames * 2);
wav.write('RIFF'); wav.writeUInt32LE(wav.length - 8, 4); wav.write('WAVEfmt ', 8);
wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22);
wav.writeUInt32LE(rate, 24); wav.writeUInt32LE(rate * 2, 28);
wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34); wav.write('data', 36);
wav.writeUInt32LE(frames * 2, 40);
for (let i = 0; i < frames; i++) {
  const t = i / rate;
  const envelope = 0.3 + 0.7 * Math.sin(Math.PI * 2 * t) ** 2;
  const sample = 0.012 * envelope * (0.7 * Math.sin(2 * Math.PI * 220 * t) + 0.3 * Math.sin(2 * Math.PI * 440 * t));
  wav.writeInt16LE(Math.round(32767 * sample), 44 + i * 2);
}
await writeFile(`${output}/fictional-quiet-input.wav`, wav);
const browser = await chromium.launch({args: [
  '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream',
  `--use-file-for-fake-audio-capture=${output}/fictional-quiet-input.wav`,
]});
try {
  const results = [];
  for (const gain of [false, true]) {
    const context = await browser.newContext({permissions: ['microphone']});
    const outside = new Set(), uploads = [], errors = [];
    context.on('request', r => {
      if (!/^https?:/.test(r.url())) return;
      if (new URL(r.url()).origin !== origin) outside.add(new URL(r.url()).origin);
      if (!['GET', 'HEAD'].includes(r.method())) uploads.push(r.method());
    });
    const page = await context.newPage();
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(origin);
    const result = await page.evaluate(async gain => {
      const stream = await navigator.mediaDevices.getUserMedia({audio: {
        echoCancellation: false, noiseSuppression: false,
        ...(gain ? {autoGainControl: true} : {}),
      }});
      const track = stream.getAudioTracks()[0];
      const settings = track.getSettings();
      const chunks = [];
      const recorder = new MediaRecorder(stream);
      recorder.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
      const stopped = new Promise(resolve => { recorder.onstop = resolve; });
      try {
        recorder.start();
        await new Promise(resolve => setTimeout(resolve, 7000));
        recorder.stop();
        await stopped;
      } finally { stream.getTracks().forEach(t => t.stop()); }
      const decoder = new AudioContext();
      try {
        const audio = await decoder.decodeAudioData(await new Blob(chunks).arrayBuffer());
        const samples = audio.getChannelData(0).subarray(Math.floor(audio.sampleRate * 3));
        let energy = 0, peak = 0;
        for (const value of samples) { energy += value * value; peak = Math.max(peak, Math.abs(value)); }
        return {gain: settings.autoGainControl, echo: settings.echoCancellation,
          noise: settings.noiseSuppression, rms: Math.sqrt(energy / samples.length),
          peak, duration: audio.duration, tracksReleased: track.readyState === 'ended'};
      } finally { await decoder.close(); }
    }, gain);
    assert.equal(result.gain, gain); assert.equal(result.echo, false); assert.equal(result.noise, false);
    assert(result.rms > 0 && result.peak < 0.99 && result.duration > 6 && result.tracksReleased);
    assert.deepEqual([...outside], []); assert.deepEqual(uploads, []); assert.deepEqual(errors, []);
    results.push(result);
    await context.close();
  }
  const improvementDb = 20 * Math.log10(results[1].rms / results[0].rms);
  assert(improvementDb > 1, 'Native AGC did not raise this quiet fixture');
  const report = {checkedAt: new Date().toISOString(), origin,
    environment: 'Linux Chromium; simulated quiet waveform; NOT physical Windows/Opera or speech accuracy',
    results, improvementDb, outsideRequests: 0, audioUploads: 0};
  await writeFile(`${output}/report.json`, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report)); console.log('Evidence: ' + output);
} finally { await browser.close(); }
