export function decodeGB7(arrayBuffer) {
  const view = new DataView(arrayBuffer);

  const sig0 = view.getUint8(0);
  const sig1 = view.getUint8(1);
  const sig2 = view.getUint8(2);
  const sig3 = view.getUint8(3);

  if (sig0 !== 0x47 || sig1 !== 0x42 || sig2 !== 0x37 || sig3 !== 0x1D) {
    throw new Error('Файл не является валидным GrayBit-7!');
  }

  const version = view.getUint8(4);
  const flags = view.getUint8(5);
  const width = view.getUint16(6, false);
  const height = view.getUint16(8, false);

  const hasMask = (flags & 0x01) === 1;
  const pixelArray = new Uint8ClampedArray(width * height * 4);
  let offset = 12;

  for (let i = 0; i < width * height; i++) {
    const pixelByte = view.getUint8(offset++);

    const rawGray = pixelByte & 0x7F;
    const gray = Math.round((rawGray / 127) * 255);

    const maskBit = (pixelByte >> 7) & 0x01;
    let alpha = 255;

    if (hasMask) {
      alpha = maskBit === 1 ? 255 : 0;
    }

    const pIndex = i * 4;
    pixelArray[pIndex] = gray;
    pixelArray[pIndex + 1] = gray;
    pixelArray[pIndex + 2] = gray;
    pixelArray[pIndex + 3] = alpha;
  }

  return {
    width,
    height,
    hasMask,
    imageData: new ImageData(pixelArray, width, height)
  };
}

export function encodeGB7(canvas) {
  const ctx = canvas.getContext('2d');
  const width = canvas.width;
  const height = canvas.height;
  const imgData = ctx.getImageData(0, 0, width, height).data;

  const totalSize = 12 + width * height;
  const buffer = new ArrayBuffer(totalSize);
  const view = new DataView(buffer);

  view.setUint8(0, 0x47);
  view.setUint8(1, 0x42);
  view.setUint8(2, 0x37);
  view.setUint8(3, 0x1D);

  view.setUint8(4, 0x01);
  view.setUint8(5, 0x01);
  view.setUint16(6, width, false);
  view.setUint16(8, height, false);
  view.setUint16(10, 0x0000, false);

  let offset = 12;
  for (let i = 0; i < imgData.length; i += 4) {
    const r = imgData[i];
    const g = imgData[i + 1];
    const b = imgData[i + 2];
    const a = imgData[i + 3];

    const gray8 = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
    const gray7 = Math.round((gray8 / 255) * 127) & 0x7F;

    const maskBit = a > 128 ? 1 : 0;
    const pixelByte = (maskBit << 7) | gray7;

    view.setUint8(offset++, pixelByte);
  }

  return buffer;
}