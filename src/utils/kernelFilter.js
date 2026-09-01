// Преднастроенные ядра 3x3
export const KERNEL_PRESETS = {
  identity: {
    name: 'Тождественное отображение',
    matrix: [0, 0, 0, 0, 1, 0, 0, 0, 0],
    divisor: 1
  },
  sharpen: {
    name: 'Повышение резкости',
    matrix: [0, -1, 0, -1, 5, -1, 0, -1, 0],
    divisor: 1
  },
  gaussian: {
    name: 'Фильтр Гаусса (3x3)',
    matrix: [1, 2, 1, 2, 4, 2, 1, 2, 1],
    divisor: 16
  },
  boxBlur: {
    name: 'Прямоугольное размытие',
    matrix: [1, 1, 1, 1, 1, 1, 1, 1, 1],
    divisor: 9
  },
  prewittHorizontal: {
    name: 'Оператор Прюитт (Горизонтальный)',
    matrix: [-1, 0, 1, -1, 0, 1, -1, 0, 1],
    divisor: 1
  },
  prewittVertical: {
    name: 'Оператор Прюитт (Вертикальный)',
    matrix: [-1, -1, -1, 0, 0, 0, 1, 1, 1],
    divisor: 1
  }
};

/**
 * Получение пикселя с учетом краевых условий
 */
function getPixelPadded(srcData, width, height, x, y, channel, edgeStrategy) {
  // Если внутри границ
  if (x >= 0 && x < width && y >= 0 && y < height) {
    return srcData[(y * width + x) * 4 + channel];
  }

  // Стратегия: Копирование крайних пикселей (Clamp)
  if (edgeStrategy === 'clamp') {
    const clampedX = Math.min(Math.max(x, 0), width - 1);
    const clampedY = Math.min(Math.max(y, 0), height - 1);
    return srcData[(clampedY * width + clampedX) * 4 + channel];
  }

  // Стратегия: Заполнение белым
  if (edgeStrategy === 'white') {
    return 255;
  }

  // Стратегия: Заполнение черным (по умолчанию)
  return 0;
}

/**
 * Применение ядра свертки 3x3 к ImageData
 */
export function applyConvolution(imageData, kernel, channels = { r: true, g: true, b: true }, edgeStrategy = 'black') {
  const { width, height, data } = imageData;
  const output = new Uint8ClampedArray(data.length);
  output.set(data); // Копируем исходные данные для непроверяемых/пропущенных каналов

  const sumDivisor = kernel.reduce((a, b) => a + b, 0);
  const divisor = sumDivisor === 0 ? 1 : sumDivisor;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;

      // Обрабатываем каждый выбранный канал (R=0, G=1, B=2)
      [0, 1, 2].forEach((ch) => {
        const channelKey = ch === 0 ? 'r' : ch === 1 ? 'g' : 'b';
        
        if (channels[channelKey]) {
          let sum = 0;
          let kIdx = 0;

          for (let ky = -1; ky <= 1; ky++) {
            for (let kx = -1; kx <= 1; kx++) {
              const pixelVal = getPixelPadded(data, width, height, x + kx, y + ky, ch, edgeStrategy);
              sum += pixelVal * kernel[kIdx++];
            }
          }

          const val = sum / divisor;
          output[idx + ch] = Math.min(Math.max(val, 0), 255);
        }
      });

      // Альфа-канал сохраняем без изменений
      output[idx + 3] = data[idx + 3];
    }
  }

  return new ImageData(output, width, height);
}