/**
 * Создаёт Таблицу Подстановки (LUT) на 256 элементов
 * @param {number} inBlack [0..255]
 * @param {number} inWhite [0..255]
 * @param {number} gamma   [0.1..9.9]
 * @returns {Uint8Array} Массив из 256 значений
 */
export function createLevelsLUT(inBlack, inWhite, gamma) {
  const lut = new Uint8Array(256);
  const range = Math.max(1, inWhite - inBlack);

  for (let i = 0; i < 256; i++) {
    // 1. Клиппинг по входному диапазону
    let normalized = (i - inBlack) / range;
    normalized = Math.min(Math.max(normalized, 0), 1);

    // 2. Гамма-коррекция (нелинейное сжатие/растяжение)
    // Pow(v, 1 / gamma): gamma > 1 осветляет, gamma < 1 затемняет
    const corrected = Math.pow(normalized, 1 / gamma);

    // 3. Приведение к [0..255]
    lut[i] = Math.round(corrected * 255);
  }

  return lut;
}

/**
 * Расчёт гистограммы для ImageData
 * @param {ImageData} imageData 
 * @returns {{ master: Uint32Array, r: Uint32Array, g: Uint32Array, b: Uint32Array, a: Uint32Array }}
 */
export function calculateHistograms(imageData) {
  const master = new Uint32Array(256);
  const r = new Uint32Array(256);
  const g = new Uint32Array(256);
  const b = new Uint32Array(256);
  const a = new Uint32Array(256);

  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    const red = data[i];
    const green = data[i + 1];
    const blue = data[i + 2];
    const alpha = data[i + 3];

    r[red]++;
    g[green]++;
    b[blue]++;
    a[alpha]++;

    // Вычисляем светлоту (Grayscale) по стандартной формуле
    const gray = Math.round(0.299 * red + 0.587 * green + 0.114 * blue);
    master[gray]++;
  }

  return { master, r, g, b, a };
}

/**
 * Применение настроек Levels ко всему ImageData с использованием LUT
 */
export function applyLevelsToImageData(sourceImageData, channelSettings) {
  const { width, height, data } = sourceImageData;
  const result = new ImageData(new Uint8ClampedArray(data), width, height);
  const out = result.data;

  // Создаем LUT для каждого канала
  const lutMaster = createLevelsLUT(channelSettings.master.inBlack, channelSettings.master.inWhite, channelSettings.master.gamma);
  const lutR = createLevelsLUT(channelSettings.r.inBlack, channelSettings.r.inWhite, channelSettings.r.gamma);
  const lutG = createLevelsLUT(channelSettings.g.inBlack, channelSettings.g.inWhite, channelSettings.g.gamma);
  const lutB = createLevelsLUT(channelSettings.b.inBlack, channelSettings.b.inWhite, channelSettings.b.gamma);
  const lutA = createLevelsLUT(channelSettings.a.inBlack, channelSettings.a.inWhite, channelSettings.a.gamma);

  for (let i = 0; i < out.length; i += 4) {
    // Сначала применяем Master, затем индивидуальный канал
    out[i]     = lutR[lutMaster[out[i]]];
    out[i + 1] = lutG[lutMaster[out[i + 1]]];
    out[i + 2] = lutB[lutMaster[out[i + 2]]];
    out[i + 3] = lutA[out[i + 3]]; // Alpha не зависит от Master
  }

  return result;
}