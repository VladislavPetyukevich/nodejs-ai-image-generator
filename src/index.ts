export interface GenerateImageOptions {
  seed?: number;
  width?: number;
  height?: number;
  steps?: number;
  negative_prompt?: string;
  [key: string]: unknown;
}

export interface GenerateImageConfig {
  host?: string;
  model?: string;
  prompt: string;
  options?: GenerateImageOptions;
}

export type BatchGenerateProgressCallback = (completed: number, total: number) => void;

export interface BatchGenerateImageConfig {
  host?: string;
  model?: string;
  prompts: string[];
  countPerPrompt?: number;
  options?: GenerateImageOptions;
  onProgress?: BatchGenerateProgressCallback;
}

export interface BatchGenerateImageResult {
  prompt: string;
  results: GenerateImageResult[];
}

export interface GenerateImageResult {
  imageBase64: string;
  model: string;
  createdAt: string;
}

const DEFAULT_CONFIG = {
  host: 'http://localhost:11434',
  model: 'x/flux2-klein:4b',
} as const;

export async function generateImage(config: GenerateImageConfig): Promise<GenerateImageResult> {
  const host = config.host ?? DEFAULT_CONFIG.host;
  const model = config.model ?? DEFAULT_CONFIG.model;

  const response = await fetch(`${host}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      prompt: config.prompt,
      stream: false,
      options: config.options,
    }),
  });

  if (!response.ok) {
    throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  return {
    imageBase64: data.image ?? '',
    model: data.model,
    createdAt: data.created_at,
  };
}

export async function batchGenerateImages(
  config: BatchGenerateImageConfig,
): Promise<BatchGenerateImageResult[]> {
  const { prompts, countPerPrompt = 1, host, model, options, onProgress } = config;
  const total = prompts.length * countPerPrompt;
  let completed = 0;

  const batchResults: BatchGenerateImageResult[] = [];

  for (const prompt of prompts) {
    const results: GenerateImageResult[] = [];

    for (let i = 0; i < countPerPrompt; i++) {
      const result = await generateImage({ host, model, prompt, options });
      results.push(result);
      completed++;
      onProgress?.(completed, total);
    }

    batchResults.push({ prompt, results });
  }

  return batchResults;
}
