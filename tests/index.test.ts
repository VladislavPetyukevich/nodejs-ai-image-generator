import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateImage } from '../src/index';

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
