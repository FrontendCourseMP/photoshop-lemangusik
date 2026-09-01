/**
 * Интерполяция методом ближайшего соседа (Nearest Neighbor)
 */
export function nearestNeighborInterpolation(sourceData, newWidth, newHeight) {
  const { width: srcW, height: srcH, data: src } = sourceData;
  const result = new ImageData(newWidth, newHeight);
  const dst = result.data;

  const xRatio = srcW / newWidth;
  const yRatio = srcH / newHeight;

  for (let y = 0; y < newHeight; y++) {
    const srcY = Math.floor((y + 0.5) * yRatio);
    const clampedY = Math.min(Math.max(srcY, 0), srcH - 1);

    for (let x = 0; x < newWidth; x++) {
      const srcX = Math.floor((x + 0.5) * xRatio);
      const clampedX = Math.min(Math.max(srcX, 0), srcW - 1);

      const dstIdx = (y * newWidth + x) * 4;
      const srcIdx = (clampedY * srcW + clampedX) * 4;

      dst[dstIdx]     = src[srcIdx];
      dst[dstIdx + 1] = src[srcIdx + 1];
      dst[dstIdx + 2] = src[srcIdx + 2];
      dst[dstIdx + 3] = src[srcIdx + 3];
    }
  }
  return result;
}

/**
 * Билинейная интерполяция (Bilinear Interpolation)
 */
export function bilinearInterpolation(sourceData, newWidth, newHeight) {
  const { width: srcW, height: srcH, data: src } = sourceData;
  const result = new ImageData(newWidth, newHeight);
  const dst = result.data;

  const xRatio = newWidth > 1 ? (srcW - 1) / (newWidth - 1) : 0;
  const yRatio = newHeight > 1 ? (srcH - 1) / (newHeight - 1) : 0;

  for (let y = 0; y < newHeight; y++) {
    const srcY = y * yRatio;
    const y1 = Math.floor(srcY);
    const y2 = Math.min(y1 + 1, srcH - 1);
    const yWeight = srcY - y1;

    for (let x = 0; x < newWidth; x++) {
      const srcX = x * xRatio;
      const x1 = Math.floor(srcX);
      const x2 = Math.min(x1 + 1, srcW - 1);
      const xWeight = srcX - x1;

      const idx11 = (y1 * srcW + x1) * 4;
      const idx12 = (y1 * srcW + x2) * 4;
      const idx21 = (y2 * srcW + x1) * 4;
      const idx22 = (y2 * srcW + x2) * 4;

      const dstIdx = (y * newWidth + x) * 4;

      for (let c = 0; c < 4; c++) {
        const top = src[idx11 + c] * (1 - xWeight) + src[idx12 + c] * xWeight;
        const bottom = src[idx21 + c] * (1 - xWeight) + src[idx22 + c] * xWeight;
        dst[dstIdx + c] = Math.round(top * (1 - yWeight) + bottom * yWeight);
      }
    }
  }
  return result;
}

/**
 * Реестр алгоритмов с описаниями (для Tooltip)
 */
export const INTERPOLATION_ALGORITHMS = {
  bilinear: {
    name: 'Билинейная',
    fn: bilinearInterpolation,
    description: 'Рассчитывает цвет пикселя на основе средневзвешенного значения 4 ближайших точек. Обеспечивает сглаженный результат без резких ступенек.'
  },
  nearest: {
    name: 'Ближайший сосед',
    fn: nearestNeighborInterpolation,
    description: 'Берет цвет ближайшего пикселя. Работает быстро, сохраняет чёткие пиксельные границы (Pixel Art), но может вызывать ступенчатый эффект.'
  }
};

export function scaleImageData(sourceData, newWidth, newHeight, algorithmKey = 'bilinear') {
  const algo = INTERPOLATION_ALGORITHMS[algorithmKey] || INTERPOLATION_ALGORITHMS.bilinear;
  return algo.fn(sourceData, newWidth, newHeight);
}