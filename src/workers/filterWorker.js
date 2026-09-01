/**
 * Обработка пикселя с учетом выходов за границы (Padding)
 */
function getPixelPadded(srcData, width, height, x, y, channel, edgeStrategy) {
  if (x >= 0 && x < width && y >= 0 && y < height) {
    return srcData[(y * width + x) * 4 + channel];
  }

  if (edgeStrategy === 'clamp') {
    const clampedX = Math.min(Math.max(x, 0), width - 1);
    const clampedY = Math.min(Math.max(y, 0), height - 1);
    return srcData[(clampedY * width + clampedX) * 4 + channel];
  }

  if (edgeStrategy === 'white') {
    return 255;
  }

  // 'black' или по умолчанию
  return 0;
}

self.onmessage = function (e) {
  const { buffer, width, height, kernel, channels, edgeStrategy } = e.data;
  const srcData = new Uint8ClampedArray(buffer);
  const outputData = new Uint8ClampedArray(srcData.length);
  
  outputData.set(srcData); // Скопируем исходный массив для необрабатываемых каналов

  const sumDivisor = kernel.reduce((a, b) => a + b, 0);
  const divisor = sumDivisor === 0 ? 1 : sumDivisor;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;

      // Обработка каналов R=0, G=1, B=2
      for (let ch = 0; ch < 3; ch++) {
        const channelKey = ch === 0 ? 'r' : ch === 1 ? 'g' : 'b';

        if (channels[channelKey]) {
          let sum = 0;
          let kIdx = 0;

          for (let ky = -1; ky <= 1; ky++) {
            for (let kx = -1; kx <= 1; kx++) {
              const pixelVal = getPixelPadded(srcData, width, height, x + kx, y + ky, ch, edgeStrategy);
              sum += pixelVal * kernel[kIdx++];
            }
          }

          const val = sum / divisor;
          outputData[idx + ch] = Math.min(Math.max(val, 0), 255);
        }
      }
      // Альфа-канал сохраняем
      outputData[idx + 3] = srcData[idx + 3];
    }
  }

  // Отправляем готовый ArrayBuffer обратно через Transferable
  self.postMessage({ buffer: outputData.buffer, width, height }, [outputData.buffer]);
};