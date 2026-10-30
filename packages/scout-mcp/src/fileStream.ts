/**
 * High-performance chunked file streaming for Scout MCP.
 * Prevents memory exhaustion on large files by reading chunks via streams.
 */

import fs from 'fs';
import fsPromises from 'fs/promises';
import { StringDecoder } from 'string_decoder';

export interface StreamReadOptions {
  offset?: number;
  limit?: number;
  maxBytes?: number;
  highWaterMark?: number;
}

export interface StreamReadResult {
  content: string;
  bytesRead: number;
  totalBytes: number;
  truncated: boolean;
  offset: number;
}

export const DEFAULT_MAX_FILE_READ_BYTES = 5 * 1024 * 1024; // 5 MB default safety ceiling
export const DEFAULT_CHUNK_HIGH_WATER_MARK = 64 * 1024; // 64 KB stream chunk buffer

/**
 * Stream a file in chunked buffers, preserving UTF-8 multi-byte sequence boundaries.
 */
export async function streamReadFile(
  filePath: string,
  options: StreamReadOptions = {},
): Promise<StreamReadResult> {
  const stat = await fsPromises.stat(filePath);
  const totalBytes = stat.size;

  const offset = Math.max(0, options.offset ?? 0);
  if (offset >= totalBytes && totalBytes > 0) {
    return {
      content: '',
      bytesRead: 0,
      totalBytes,
      truncated: false,
      offset,
    };
  }

  const effectiveMax = options.limit ?? options.maxBytes ?? DEFAULT_MAX_FILE_READ_BYTES;
  const endByte = Math.min(totalBytes - 1, offset + effectiveMax - 1);

  if (totalBytes === 0) {
    return {
      content: '',
      bytesRead: 0,
      totalBytes: 0,
      truncated: false,
      offset: 0,
    };
  }

  return new Promise<StreamReadResult>((resolve, reject) => {
    const stream = fs.createReadStream(filePath, {
      start: offset,
      end: endByte,
      highWaterMark: options.highWaterMark ?? DEFAULT_CHUNK_HIGH_WATER_MARK,
    });

    const decoder = new StringDecoder('utf8');
    let content = '';
    let bytesRead = 0;

    stream.on('data', (chunk: Buffer) => {
      bytesRead += chunk.length;
      content += decoder.write(chunk);
    });

    stream.on('end', () => {
      content += decoder.end();
      const truncated = offset + bytesRead < totalBytes && options.limit === undefined;
      resolve({
        content,
        bytesRead,
        totalBytes,
        truncated,
        offset,
      });
    });

    stream.on('error', (err) => {
      reject(err);
    });
  });
}
