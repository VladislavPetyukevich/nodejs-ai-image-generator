import fs from 'fs';
import path from 'path';
import { batchGenerateImages, BatchGenerateImageConfig } from '../src/index';

const batchConfig: BatchGenerateImageConfig = {
  prompts: [
    'a futuristic city at sunset, highly detailed, cinematic lighting',
    'a serene mountain landscape with snow peaks and a calm lake',
  ],
  countPerPrompt: 2,
  host: 'http://localhost:11434',
  model: 'x/flux2-klein:4b',
  options: {
    width: 512,
    height: 512,
    steps: 20,
    negative_prompt: 'blurry, low quality',
  },
  onProgress: (completed, total) => {
    console.log(`Progress: ${completed}/${total} images generated`);
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

async function mainBatch() {
  console.log('Batch generating images...');
  console.log('Config:', JSON.stringify(batchConfig, null, 2));
  console.log('');

  const start = Date.now();

  console.log('Generating images...');

  const batch = await batchGenerateImages(batchConfig);

  const elapsed = ((Date.now() - start) / 1000).toFixed(2);
  console.log(`Done in ${elapsed}s`);

  for (const { prompt, results } of batch) {
    console.log(`\nPrompt: "${prompt}"`);
    results.forEach((result, i) => {
      if (result.imageBase64) {
        const saved = saveImage(result.imageBase64);
        console.log(`  [${i + 1}] Saved to: ${saved}`);
      } else {
        console.log(`  [${i + 1}] No image returned.`);
      }
    });
  }
}

mainBatch().catch(err => {
  console.error('Batch error:', err.message);
  process.exit(1);
});
