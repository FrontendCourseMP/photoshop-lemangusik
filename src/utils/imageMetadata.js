const JPEG_SOF_MARKERS = new Set([
  0xc0, 0xc1, 0xc2, 0xc3,
  0xc5, 0xc6, 0xc7,
  0xc9, 0xca, 0xcb,
  0xcd, 0xce, 0xcf
]);

function isJpeg(bytes) {
  return bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xd8;
}

function isPng(bytes) {
  const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  return bytes.length >= signature.length && signature.every((value, index) => bytes[index] === value);
}

function parseJpeg(arrayBuffer) {
  const bytes = new Uint8Array(arrayBuffer);
  if (!isJpeg(bytes)) return null;

  let offset = 2;

  while (offset < bytes.length) {
    while (offset < bytes.length && bytes[offset] !== 0xff) offset += 1;
    while (offset < bytes.length && bytes[offset] === 0xff) offset += 1;
    if (offset >= bytes.length) break;

    const marker = bytes[offset++];

    // Маркеры без тела сегмента.
    if (marker === 0xd8 || marker === 0xd9 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      continue;
    }

    if (offset + 1 >= bytes.length) break;
    const segmentLength = (bytes[offset] << 8) | bytes[offset + 1];
    if (segmentLength < 2 || offset + segmentLength > bytes.length) break;

    if (JPEG_SOF_MARKERS.has(marker) && segmentLength >= 8) {
      const bitsPerComponent = bytes[offset + 2];
      const components = bytes[offset + 7];
      const colorDepth = bitsPerComponent * components;

      let channelLayout = 'rgb';
      let model = `${components} компонента`;

      if (components === 1) {
        channelLayout = 'gray';
        model = 'Grayscale';
      } else if (components === 3) {
        channelLayout = 'rgb';
        model = 'RGB';
      } else if (components === 4) {
        // В JPEG четыре компонента обычно означают CMYK/YCCK. Canvas после
        // декодирования всё равно предоставляет RGB, поэтому альфа-канал здесь
        // не появляется.
        channelLayout = 'rgb';
        model = '4 компонента JPEG';
      }

      return {
        channelLayout,
        channelCount: components,
        bitsPerComponent,
        colorDepth,
        colorDepthLabel: `${colorDepth} бит (${model}, ${bitsPerComponent} бит/компонент)`
      };
    }

    offset += segmentLength;
  }

  return null;
}

function parsePng(arrayBuffer) {
  const bytes = new Uint8Array(arrayBuffer);
  if (!isPng(bytes) || bytes.length < 26) return null;

  // После 8-байтовой сигнатуры идут length(4), "IHDR"(4), затем данные IHDR.
  const bitDepth = bytes[24];
  const colorType = bytes[25];

  const colorTypes = {
    0: { channels: 1, layout: 'gray', model: 'Grayscale' },
    2: { channels: 3, layout: 'rgb', model: 'RGB' },
    3: { channels: 1, layout: 'rgb', model: 'Indexed' },
    4: { channels: 2, layout: 'graya', model: 'Grayscale + Alpha' },
    6: { channels: 4, layout: 'rgba', model: 'RGBA' }
  };

  const info = colorTypes[colorType];
  if (!info) return null;

  // Для indexed PNG bitDepth относится к индексу палитры, а не к RGB-компонентам.
  if (colorType === 3) {
    return {
      channelLayout: info.layout,
      channelCount: info.channels,
      bitsPerComponent: bitDepth,
      colorDepth: bitDepth,
      colorDepthLabel: `${bitDepth} бит (Indexed PNG)`
    };
  }

  const colorDepth = bitDepth * info.channels;
  return {
    channelLayout: info.layout,
    channelCount: info.channels,
    bitsPerComponent: bitDepth,
    colorDepth,
    colorDepthLabel: `${colorDepth} бит (${info.model}, ${bitDepth} бит/канал)`
  };
}

export function getImageMetadata(arrayBuffer, fileName = '', mimeType = '') {
  const bytes = new Uint8Array(arrayBuffer);

  if (isJpeg(bytes)) {
    return parseJpeg(arrayBuffer) || {
      channelLayout: 'rgb',
      channelCount: 3,
      bitsPerComponent: 8,
      colorDepth: 24,
      colorDepthLabel: '24 бит (RGB, 8 бит/канал)'
    };
  }

  if (isPng(bytes)) {
    return parsePng(arrayBuffer) || {
      channelLayout: 'rgba',
      channelCount: 4,
      bitsPerComponent: 8,
      colorDepth: 32,
      colorDepthLabel: '32 бит (RGBA, 8 бит/канал)'
    };
  }

  const normalizedName = fileName.toLowerCase();
  const normalizedMime = mimeType.toLowerCase();

  if (normalizedName.endsWith('.jpg') || normalizedName.endsWith('.jpeg') || normalizedMime === 'image/jpeg') {
    return {
      channelLayout: 'rgb',
      channelCount: 3,
      bitsPerComponent: 8,
      colorDepth: 24,
      colorDepthLabel: '24 бит (RGB, 8 бит/канал)'
    };
  }

  // Для форматов вне требований лабораторной браузер уже отдаёт RGBA ImageData.
  return {
    channelLayout: 'rgba',
    channelCount: 4,
    bitsPerComponent: 8,
    colorDepth: 32,
    colorDepthLabel: '32 бит (RGBA после декодирования браузером)'
  };
}
