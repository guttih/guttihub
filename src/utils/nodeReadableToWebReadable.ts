import { Readable } from 'stream';

export function nodeReadableToWebReadable(readable: Readable): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      readable.on('data', (chunk) => controller.enqueue(new Uint8Array(chunk)));
      readable.on('end', () => controller.close());
      readable.on('error', (err) => controller.error(err));
    }
  });
}
