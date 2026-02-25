import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateImage, batchGenerateImages } from '../src/index';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

beforeEach(() => {
  mockFetch.mockReset();
});

describe('generateImage', () => {
  it('should return a GenerateImageResult on success', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        image: 'base64encodedimage',
        model: 'x/flux2-klein:4b',
        created_at: '2026-02-25T00:00:00Z',
      }),
    });

    const result = await generateImage({ prompt: 'a cat' });

    expect(result).toEqual({
      imageBase64: 'base64encodedimage',
      model: 'x/flux2-klein:4b',
      createdAt: '2026-02-25T00:00:00Z',
    });
  });

  it('should use default host and model when not provided', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ image: '', model: 'x/flux2-klein:4b', created_at: '' }),
    });

    await generateImage({ prompt: 'a dog' });

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:11434/api/generate',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"model":"x/flux2-klein:4b"'),
      })
    );
  });

  it('should use custom host and model when provided', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ image: '', model: 'custom-model', created_at: '' }),
    });

    await generateImage({
      host: 'http://custom-host:1234',
      model: 'custom-model',
      prompt: 'a bird',
    });

    expect(mockFetch).toHaveBeenCalledWith(
      'http://custom-host:1234/api/generate',
      expect.objectContaining({
        body: expect.stringContaining('"model":"custom-model"'),
      })
    );
  });

  it('should pass options in the request body', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ image: '', model: 'x/flux2-klein:4b', created_at: '' }),
    });

    await generateImage({
      prompt: 'a landscape',
      options: { seed: 42, width: 512, height: 512, steps: 20 },
    });

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.options).toEqual({ seed: 42, width: 512, height: 512, steps: 20 });
  });

  it('should throw an error when the API response is not ok', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    });

    await expect(generateImage({ prompt: 'a tree' })).rejects.toThrow(
      'Ollama API error: 500 Internal Server Error'
    );
  });

  it('should return empty imageBase64 when image field is missing', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ model: 'x/flux2-klein:4b', created_at: '' }),
    });

    const result = await generateImage({ prompt: 'missing image' });
    expect(result.imageBase64).toBe('');
  });
});

describe('batchGenerateImages', () => {
  const mockResult = (image: string) => ({
    ok: true,
    json: async () => ({ image, model: 'x/flux2-klein:4b', created_at: '2026-02-25T00:00:00Z' }),
  });

  it('should return one result per prompt with countPerPrompt defaulting to 1', async () => {
    mockFetch
      .mockResolvedValueOnce(mockResult('img-a'))
      .mockResolvedValueOnce(mockResult('img-b'));

    const batch = await batchGenerateImages({
      prompts: ['a cat', 'a dog'],
    });

    expect(batch).toHaveLength(2);
    expect(batch[0].prompt).toBe('a cat');
    expect(batch[0].results).toHaveLength(1);
    expect(batch[0].results[0].imageBase64).toBe('img-a');
    expect(batch[1].prompt).toBe('a dog');
    expect(batch[1].results).toHaveLength(1);
    expect(batch[1].results[0].imageBase64).toBe('img-b');
  });

  it('should generate countPerPrompt images for each prompt', async () => {
    mockFetch
      .mockResolvedValueOnce(mockResult('cat-1'))
      .mockResolvedValueOnce(mockResult('cat-2'))
      .mockResolvedValueOnce(mockResult('dog-1'))
      .mockResolvedValueOnce(mockResult('dog-2'));

    const batch = await batchGenerateImages({
      prompts: ['a cat', 'a dog'],
      countPerPrompt: 2,
    });

    expect(batch[0].results).toHaveLength(2);
    expect(batch[0].results.map(r => r.imageBase64)).toEqual(['cat-1', 'cat-2']);
    expect(batch[1].results).toHaveLength(2);
    expect(batch[1].results.map(r => r.imageBase64)).toEqual(['dog-1', 'dog-2']);
  });

  it('should call onProgress after each image in order', async () => {
    mockFetch
      .mockResolvedValueOnce(mockResult('cat-1'))
      .mockResolvedValueOnce(mockResult('cat-2'))
      .mockResolvedValueOnce(mockResult('dog-1'))
      .mockResolvedValueOnce(mockResult('dog-2'));

    const calls: [number, number][] = [];

    await batchGenerateImages({
      prompts: ['a cat', 'a dog'],
      countPerPrompt: 2,
      onProgress: (completed, total) => calls.push([completed, total]),
    });

    expect(calls).toEqual([
      [1, 4],
      [2, 4],
      [3, 4],
      [4, 4],
    ]);
  });

  it('should not require onProgress to be provided', async () => {
    mockFetch.mockResolvedValue(mockResult('img'));

    await expect(
      batchGenerateImages({ prompts: ['a cat'], countPerPrompt: 1 }),
    ).resolves.not.toThrow();
  });

  it('should forward host, model and options to each request', async () => {
    mockFetch.mockResolvedValue(mockResult('img'));

    await batchGenerateImages({
      prompts: ['a bird'],
      countPerPrompt: 1,
      host: 'http://custom-host:1234',
      model: 'custom-model',
      options: { seed: 7, width: 256, height: 256, steps: 10 },
    });

    expect(mockFetch).toHaveBeenCalledWith(
      'http://custom-host:1234/api/generate',
      expect.objectContaining({
        body: expect.stringContaining('"model":"custom-model"'),
      }),
    );

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.options).toEqual({ seed: 7, width: 256, height: 256, steps: 10 });
  });

  it('should make prompts.length * countPerPrompt total fetch calls', async () => {
    mockFetch.mockResolvedValue(mockResult('img'));

    await batchGenerateImages({ prompts: ['p1', 'p2', 'p3'], countPerPrompt: 4 });

    expect(mockFetch).toHaveBeenCalledTimes(12);
  });

  it('should generate images sequentially, not concurrently', async () => {
    const order: number[] = [];
    let callIndex = 0;

    mockFetch.mockImplementation(() => {
      const index = callIndex++;
      order.push(index);
      return Promise.resolve(mockResult(`img-${index}`));
    });

    await batchGenerateImages({ prompts: ['p1', 'p2'], countPerPrompt: 2 });

    expect(order).toEqual([0, 1, 2, 3]);
    expect(mockFetch).toHaveBeenCalledTimes(4);
  });

  it('should throw when any individual generation fails', async () => {
    mockFetch
      .mockResolvedValueOnce(mockResult('img'))
      .mockResolvedValueOnce({ ok: false, status: 503, statusText: 'Service Unavailable' });

    await expect(
      batchGenerateImages({ prompts: ['a cat'], countPerPrompt: 2 }),
    ).rejects.toThrow('Ollama API error: 503 Service Unavailable');
  });

  it('should return an empty array when prompts is empty', async () => {
    const batch = await batchGenerateImages({ prompts: [] });
    expect(batch).toEqual([]);
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
