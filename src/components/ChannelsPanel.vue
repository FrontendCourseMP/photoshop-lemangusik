<template>
  <aside class="channels-panel">
    <h3>Режимы каналов</h3>
    <div class="channels-list">
      <div 
        v-for="ch in channelModes" 
        :key="ch.id" 
        class="channel-item"
        :class="{ active: activeMode === ch.id }"
        @click="selectMode(ch.id)"
      >
        <canvas :ref="el => setCanvasRef(el, ch.id)" class="thumb-canvas" width="60" height="45"></canvas>
        <div class="channel-info">
          <span class="channel-num">{{ ch.num }}</span>
          <span class="channel-name">{{ ch.name }}</span>
        </div>
      </div>
    </div>
  </aside>
</template>

<script setup>
import { watch, onMounted } from 'vue';

const props = defineProps({
  originalImageData: { type: Object, default: null },
  activeMode: { type: Number, default: 4 }
});

const emit = defineEmits(['update:activeMode']);

const channelModes = [
  { id: 1, num: '1', name: 'Grayscale' },
  { id: 2, num: '2', name: 'Grayscale + Alpha' },
  { id: 3, num: '3', name: 'RGB' },
  { id: 4, num: '4', name: 'RGB + Alpha' }
];

const canvasRefs = {};

function setCanvasRef(el, id) {
  if (el) canvasRefs[id] = el;
}

function selectMode(id) {
  emit('update:activeMode', id);
}

function renderThumbnails() {
  if (!props.originalImageData) return;

  const { width, height, data } = props.originalImageData;

  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = width;
  tempCanvas.height = height;
  const tempCtx = tempCanvas.getContext('2d');

  channelModes.forEach(mode => {
    const thumbCanvas = canvasRefs[mode.id];
    if (!thumbCanvas) return;

    const chImageData = tempCtx.createImageData(width, height);
    const out = chImageData.data;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];

      // Вычисляем значение в градациях серого
      const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);

      if (mode.id === 1) { // Grayscale
        out[i] = gray; out[i + 1] = gray; out[i + 2] = gray; out[i + 3] = 255;
      } else if (mode.id === 2) { // Grayscale + Alpha
        out[i] = gray; out[i + 1] = gray; out[i + 2] = gray; out[i + 3] = a;
      } else if (mode.id === 3) { // RGB
        out[i] = r; out[i + 1] = g; out[i + 2] = b; out[i + 3] = 255;
      } else if (mode.id === 4) { // RGB + Alpha
        out[i] = r; out[i + 1] = g; out[i + 2] = b; out[i + 3] = a;
      }
    }

    tempCtx.putImageData(chImageData, 0, 0);

    const thumbCtx = thumbCanvas.getContext('2d');
    thumbCtx.clearRect(0, 0, thumbCanvas.width, thumbCanvas.height);
    thumbCtx.drawImage(tempCanvas, 0, 0, thumbCanvas.width, thumbCanvas.height);
  });
}

watch(() => props.originalImageData, renderThumbnails);
onMounted(renderThumbnails);
</script>

<style scoped>
.channels-panel {
  width: 220px;
  background-color: #252526;
  border-left: 1px solid #3c3c3c;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
h3 { font-size: 13px; color: #aaa; text-transform: uppercase; font-weight: 600; }
.channels-list { display: flex; flex-direction: column; gap: 8px; }
.channel-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px;
  background-color: #2d2d2d;
  border: 1px solid #3c3c3c;
  border-radius: 4px;
  cursor: pointer;
  user-select: none;
}
.channel-item.active {
  border-color: #007acc;
  background-color: #333b42;
}
.thumb-canvas {
  width: 50px;
  height: 38px;
  background-color: #000;
  border: 1px solid #444;
}
.channel-info {
  display: flex;
  align-items: center;
  gap: 8px;
}
.channel-num {
  font-weight: bold;
  color: #007acc;
  font-size: 13px;
}
.channel-name { font-size: 12px; color: #eee; }
</style>