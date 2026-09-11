import { applyKernelFilter } from '../utils/kernelFilter';

self.onmessage = (e) => {
  const { type, imageData, kernel, channels, edgeMode, isFinal } = e.data;

  if (type === 'PROCESS') {
    const result = applyKernelFilter(imageData, kernel, channels, edgeMode);

    if (isFinal) {
      self.postMessage({ type: 'APPLY_RESULT', imageData: result });
    } else {
      self.postMessage({ type: 'PREVIEW_RESULT', imageData: result });
    }
  }
};