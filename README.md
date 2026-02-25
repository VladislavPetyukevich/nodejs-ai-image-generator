# nodejs-ai-image-generator

Generate images using [Ollama](https://ollama.com) image models from Node.js.

## Requirements

- [Ollama](https://ollama.com) running locally (default: `http://localhost:11434`)
- An image-capable model pulled, e.g. `ollama pull x/flux2-klein:4b` (**Experimental, currently available only on macOS. Follow this repo for feature updates :)** )

## Installation

```bash
npm install nodejs-ai-image-generator
```

## Usage

```ts
import { generateImage } from 'nodejs-ai-image-generator';

const result = await generateImage({
  prompt: 'a futuristic city at sunset, highly detailed, cinematic lighting',
  // optional — defaults shown below
  host: 'http://localhost:11434',
  model: 'x/flux2-klein:4b',
  options: {
    seed: 42, // Don't pass if you want to generate different images every time
    width: 512,
    height: 512,
    steps: 20,
    negative_prompt: 'blurry, low quality',
  },
});

// result.imageBase64 — base64-encoded PNG
// result.model       — model name used
// result.createdAt   — ISO timestamp
```

Save the image to disk:

```ts
import fs from 'fs';

fs.writeFileSync('output.png', Buffer.from(result.imageBase64, 'base64'));
```

## Config

| Field | Type | Default | Description |
|---|---|---|---|
| `prompt` | `string` | — | Image prompt (required) |
| `host` | `string` | `http://localhost:11434` | Ollama host URL |
| `model` | `string` | `x/flux2-klein:4b` | Model to use |
| `options.seed` | `number` | — | Reproducibility seed |
| `options.width` | `number` | — | Output width in px |
| `options.height` | `number` | — | Output height in px |
| `options.steps` | `number` | — | Diffusion steps |
| `options.negative_prompt` | `string` | — | Things to avoid |

## License

ISC
