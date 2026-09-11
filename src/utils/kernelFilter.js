export const PRESETS = {
  identity: [
    [0, 0, 0],
    [0, 1, 0],
    [0, 0, 0]
  ],
  sharpen: [
    [0, -1, 0],
    [-1, 5, -1],
    [0, -1, 0]
  ],
  gaussian: [
    [1, 2, 1],
    [2, 4, 2],
    [1, 2, 1]
  ],
  boxBlur: [
    [1, 1, 1],
    [1, 1, 1],
    [1, 1, 1]
  ],
  sobelX: [
    [-1, 0, 1],
    [-2, 0, 2],
    [-1, 0, 1]
  ],
  sobelY: [
    [-1, -2, -1],
    [ 0,  0,  0],
    [ 1,  2,  1]
  ],
  prewittX: [
    [-1, 0, 1],
    [-1, 0, 1],
    [-1, 0, 1]
  ]
};

/**
 * Вспомогательная функция получения координаты пикселя с учетом выходящего за край диапазона
 * @param {number} coord - Текущая координата (X или Y)
 * @param {number} max - Максимальный размер (Ширина или Высота)
 * @param {string} mode - Режим обработки краев ('clamp', 'wrap', 'zero')
 * @returns {number} Координата внутри массива или -1 для режима 'zero'
 */
function getEdgeCoordinate(coord, max, mode) {
  if (coord >= 0 && coord < max) return coord;

  if (mode === 'clamp') {
    return Math.min(Math.max(coord, 0), max - 1);
  } else if (mode === 'wrap') {
    return (coord + max) % max;
  } else if (mode === 'zero') {
    return -1; // Сигнал для выхода за границы (черный цвет)
  }
  return Math.min(Math.max(coord, 0), max - 1);
}

/**
 * Применение ядра свертки 3x3 к ImageData
 * @param {ImageData} imageData - Исходный растр
 * @param {Array<Array<number>>} kernel - Матрица 3x3
 * @param {Object} channels - Включенные каналы { r: boolean, g: boolean, b: boolean }
 * @param {string} edgeMode - Режим краевых условий ('clamp', 'wrap', 'zero')
 * @returns {ImageData} Обработанное изображение
 */
export function applyKernelFilter(imageData, kernel, channels = { r: true, g: true, b: true }, edgeMode = 'clamp') {
  const { width, height, data } = imageData;
  const output = new ImageData(new Uint8ClampedArray(data.length), width, height);
  const src = data;
  const dst = output.data;

  // Рассчитываем сумму элементов ядра для правильной нормировки
  let kernelWeight = 0;
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      kernelWeight += kernel[r][c];
    }
  }

  // Если сумма равна 0 (как в фильтрах выделения границ Собеля/Прюитта), нормировка не требуется
  const divisor = kernelWeight !== 0 ? kernelWeight : 1;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const dstIdx = (y * width + x) * 4;

      let sumR = 0;
      let sumG = 0;
      let sumB = 0;

      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const px = getEdgeCoordinate(x + kx, width, edgeMode);
          const py = getEdgeCoordinate(y + ky, height, edgeMode);

          const weight = kernel[ky + 1][kx + 1];

          if (px === -1 || py === -1) {
            // Выход за пределы для режима 'zero' (нулевое значение)
            continue;
          }

          const srcIdx = (py * width + px) * 4;
          sumR += src[srcIdx] * weight;
          sumG += src[srcIdx + 1] * weight;
          sumB += src[srcIdx + 2] * weight;
        }
      }

      // Канал Red
      if (channels.r) {
        dst[dstIdx] = Math.min(Math.max(Math.round(sumR / divisor), 0), 255);
      } else {
        dst[dstIdx] = src[dstIdx];
      }

      // Канал Green
      if (channels.g) {
        dst[dstIdx + 1] = Math.min(Math.max(Math.round(sumG / divisor), 0), 255);
      } else {
        dst[dstIdx + 1] = src[dstIdx + 1];
      }

      // Канал Blue
      if (channels.b) {
        dst[dstIdx + 2] = Math.min(Math.max(Math.round(sumB / divisor), 0), 255);
      } else {
        dst[dstIdx + 2] = src[dstIdx + 2];
      }

      // Канал Alpha не изменяем
      dst[dstIdx + 3] = src[dstIdx + 3];
    }
  }

  return output;
}