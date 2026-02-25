import fs from 'fs';
import path from 'path';
import { generateImage, GenerateImageConfig } from '../src/index';

// --- Edit config here to test different scenarios ---
const config: GenerateImageConfig = {
  host: 'http://localhost:11434',
  model: 'x/flux2-klein:4b',
  prompt: 'a futuristic city at sunset, highly detailed, cinematic lighting',
  options: {
    seed: 42,
    width: 512,
    height: 512,
    steps: 20,
  },
};
// ----------------------------------------------------

const OUTPUT_DIR = path.join(__dirname, 'output');

function saveImage(base64: string): string {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filepath = path.join(OUTPUT_DIR, `image-${timestamp}.png`);
  fs.writeFileSync(filepath, Buffer.from(base64, 'base64'));
  return filepath;
}

async function main() {
  console.log('Generating image...');
  console.log('Config:', JSON.stringify(config, null, 2));
  console.log('');

  const start = Date.now();

  const result = await generateImage(config);

  const elapsed = ((Date.now() - start) / 1000).toFixed(2);
  console.log(`Done in ${elapsed}s`);
  console.log(`Model: ${result.model}`);
  console.log(`Created at: ${result.createdAt}`);

  if (result.imageBase64) {
    const saved = saveImage(result.imageBase64);
    console.log('\nSaved to:', saved);
  } else {
    console.log('\nNo image returned.');
  }
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
