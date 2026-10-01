<template>
  <div class="app-container">
    <Toolbar 
      v-model:currentTool="currentTool"
      @file-selected="handleFileSelect" 
      @save-file="handleSaveFile" 
      @open-levels="openLevelsDialog"
      @open-resize="openResizeDialog"
      @open-filter="openFilterDialog"
    />

    <div class="main-body">
      <CanvasArea 
        ref="canvasAreaRef" 
        :currentTool="currentTool"
        :displayZoom="displayZoom"
        @pixel-click="handlePixelClick"
      />
      
      <ChannelsPanel 
        :originalImageData="originalImageData"
        :channelLayout="imageInfo.channelLayout"
        v-model:activeChannels="activeChannels"
      />

      <!-- Плавающая панель пипетки с фоном цвета рабочей зоны канвас (#181818) -->
      <PipettePanel 
        ref="pipettePanelRef"
        :pixelInfo="pixelInfo"
      />
    </div>

    <StatusBar 
      :width="imageInfo.width" 
      :height="imageInfo.height" 
      :colorDepth="imageInfo.colorDepth" 
      :pixelInfo="pixelInfo"
      v-model:displayZoom="displayZoom"
    />

    <!-- Модальные и плавающие окна диалогов -->
    <LevelsDialog 
      ref="levelsDialogRef"
      :imageData="originalImageData"
      @preview="handlePreview"
      @apply="handleApply"
    />

    <ResizeDialog 
      ref="resizeDialogRef"
      :originalWidth="imageInfo.width"
      :originalHeight="imageInfo.height"
      @apply-resize="handleApplyResize"
    />

    <FilterDialog 
      ref="filterDialogRef"
      :imageData="originalImageData"
      @preview="handlePreview"
      @apply="handleApply"
    />
  </div>
</template>

<script setup>
import { ref, reactive, watch, nextTick } from 'vue';
import Toolbar from './components/Toolbar.vue';
import CanvasArea from './components/CanvasArea.vue';
import ChannelsPanel from './components/ChannelsPanel.vue';
import PipettePanel from './components/PipettePanel.vue';
import StatusBar from './components/StatusBar.vue';
import LevelsDialog from './components/LevelsDialog.vue';
import ResizeDialog from './components/ResizeDialog.vue';
import FilterDialog from './components/FilterDialog.vue';
import { scaleImageData } from './utils/interpolation';
import { decodeGB7, encodeGB7 } from './utils/gb7Codec';
import { rgbToLab } from './utils/colorUtils';
import { getImageMetadata } from './utils/imageMetadata';

const canvasAreaRef = ref(null);
const levelsDialogRef = ref(null);
const resizeDialogRef = ref(null);
const filterDialogRef = ref(null);
const pipettePanelRef = ref(null);

const currentTool = ref('select');
const activeChannels = ref(['r', 'g', 'b', 'a']);
const displayZoom = ref(100);

const originalImageData = ref(null);
const currentImageData = ref(null);
const pixelInfo = ref(null);

const imageInfo = reactive({ 
  width: 0, 
  height: 0, 
  colorDepth: '—',
  channelLayout: 'rgba'
});

// Отслеживаем переключение каналов и изменения растра для перерисовки
watch([activeChannels, currentImageData], renderFilteredCanvas);

// Автоматически раскрываем панель пипетки при получении данных о пикселе
watch(pixelInfo, (newVal) => {
  if (newVal && pipettePanelRef.value) {
    pipettePanelRef.value.showPanel();
  }
});

// Автоматически открываем панель пипетки при выборе инструмента «Пипетка»
watch(currentTool, (newTool) => {
  if (newTool === 'pipette' && pipettePanelRef.value) {
    pipettePanelRef.value.showPanel();
  }
});

function openLevelsDialog() {
  if (!originalImageData.value) return alert('Сначала откройте изображение!');
  levelsDialogRef.value.showModal();
}

function openResizeDialog() {
  if (!originalImageData.value) return alert('Сначала откройте изображение!');
  resizeDialogRef.value.showModal();
}

function openFilterDialog() {
  if (!originalImageData.value) return alert('Сначала откройте изображение!');
  filterDialogRef.value.showModal();
}

/**
 * Физическое изменение размера растра через выбранный алгоритм интерполяции
 */
function handleApplyResize({ newWidth, newHeight, algorithm }) {
  if (!originalImageData.value) return;

  const scaledData = scaleImageData(originalImageData.value, newWidth, newHeight, algorithm);
  
  originalImageData.value = scaledData;
  currentImageData.value = scaledData;
  imageInfo.width = newWidth;
  imageInfo.height = newHeight;

  renderFilteredCanvas();
}

/**
 * Универсальные обработчики для коррекций (Уровни, Фильтры)
 */
function handlePreview(data) {
  currentImageData.value = data;
}

function handleApply(data) {
  originalImageData.value = data;
  currentImageData.value = data;
  imageInfo.width = data.width;
  imageInfo.height = data.height;
}

/**
 * Автоматический подгон масштаба отображения (displayZoom), 
 * чтобы картинка полностью влезла в область просмотра с отступом min 50px
 */
function calculateAutoFitZoom(imgW, imgH) {
  if (!canvasAreaRef.value || !canvasAreaRef.value.areaRef) return;

  const areaEl = canvasAreaRef.value.areaRef;
  const availW = areaEl.clientWidth - 100; // Отступы 50px с каждой стороны
  const availH = areaEl.clientHeight - 100;

  if (availW <= 0 || availH <= 0) return;

  const scaleX = availW / imgW;
  const scaleY = availH / imgH;
  
  let autoZoom = Math.min(scaleX, scaleY) * 100;

  // Ограничение диапазона масштаба согласно ТЗ
  autoZoom = Math.min(Math.max(autoZoom, 12), 300);
  displayZoom.value = Math.round(autoZoom);
}

function getDefaultChannels(layout) {
  if (layout === 'gray') return ['gray'];
  if (layout === 'graya') return ['gray', 'a'];
  if (layout === 'rgb') return ['r', 'g', 'b'];
  return ['r', 'g', 'b', 'a'];
}

async function handleFileSelect(event) {
  const file = event.target.files[0];
  if (!file) return;

  const canvas = canvasAreaRef.value.getCanvas();
  const ctx = canvas.getContext('2d');
  const fileName = file.name.toLowerCase();
  const arrayBuffer = await file.arrayBuffer();
  let imgData = null;

  if (fileName.endsWith('.gb7')) {
    const { hasMask, imageData } = decodeGB7(arrayBuffer);
    imgData = imageData;
    imageInfo.colorDepth = hasMask
      ? '8 бит (7 бит Grayscale + 1 бит маски)'
      : '7 бит (Grayscale)';
    imageInfo.channelLayout = hasMask ? 'graya' : 'gray';
  } else {
    const metadata = getImageMetadata(arrayBuffer, file.name, file.type);
    imageInfo.colorDepth = metadata.colorDepthLabel;
    imageInfo.channelLayout = metadata.channelLayout;

    await new Promise((resolve, reject) => {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);

      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        imgData = ctx.getImageData(0, 0, img.width, img.height);
        URL.revokeObjectURL(objectUrl);
        resolve();
      };

      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('Не удалось декодировать изображение'));
      };

      img.src = objectUrl;
    });
  }

  imageInfo.width = imgData.width;
  imageInfo.height = imgData.height;
  activeChannels.value = getDefaultChannels(imageInfo.channelLayout);
  originalImageData.value = imgData;
  currentImageData.value = imgData;
  pixelInfo.value = null;

  renderFilteredCanvas();

  await nextTick();
  calculateAutoFitZoom(imgData.width, imgData.height);
}

function renderFilteredCanvas() {
  const dataToRender = currentImageData.value || originalImageData.value;
  if (!dataToRender || !canvasAreaRef.value) return;

  const canvas = canvasAreaRef.value.getCanvas();
  const ctx = canvas.getContext('2d');
  const { width, height, data } = dataToRender;

  canvas.width = width;
  canvas.height = height;
  ctx.clearRect(0, 0, width, height);

  const filtered = ctx.createImageData(width, height);
  const out = filtered.data;
  const enabled = new Set(activeChannels.value);
  const layout = imageInfo.channelLayout;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];
    const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);

    if (layout === 'gray') {
      const value = enabled.has('gray') ? gray : 0;
      out[i] = value;
      out[i + 1] = value;
      out[i + 2] = value;
      out[i + 3] = 255;
      continue;
    }

    if (layout === 'graya') {
      const grayEnabled = enabled.has('gray');
      const alphaEnabled = enabled.has('a');

      // Если оставлен только Alpha, показываем его как чёрно-белую маску,
      // а не как полностью прозрачное изображение.
      if (!grayEnabled && alphaEnabled) {
        out[i] = a;
        out[i + 1] = a;
        out[i + 2] = a;
        out[i + 3] = 255;
      } else {
        const value = grayEnabled ? gray : 0;
        out[i] = value;
        out[i + 1] = value;
        out[i + 2] = value;
        out[i + 3] = alphaEnabled ? a : 255;
      }
      continue;
    }

    const redEnabled = enabled.has('r');
    const greenEnabled = enabled.has('g');
    const blueEnabled = enabled.has('b');
    const hasVisibleColorChannel = redEnabled || greenEnabled || blueEnabled;
    const alphaEnabled = layout === 'rgba' && enabled.has('a');

    // Требование лабораторной: если виден только Alpha, пользователь должен
    // увидеть маску прозрачности.
    if (!hasVisibleColorChannel && alphaEnabled) {
      out[i] = a;
      out[i + 1] = a;
      out[i + 2] = a;
      out[i + 3] = 255;
    } else {
      out[i] = redEnabled ? r : 0;
      out[i + 1] = greenEnabled ? g : 0;
      out[i + 2] = blueEnabled ? b : 0;
      out[i + 3] = alphaEnabled ? a : 255;
    }
  }

  ctx.putImageData(filtered, 0, 0);
}

function handlePixelClick({ x, y }) {
  const activeData = currentImageData.value || originalImageData.value;
  if (!activeData) return;

  const { width, data } = activeData;
  const idx = (y * width + x) * 4;

  pixelInfo.value = {
    x, y,
    r: data[idx], 
    g: data[idx + 1], 
    b: data[idx + 2], 
    a: data[idx + 3],
    lab: rgbToLab(data[idx], data[idx + 1], data[idx + 2])
  };
}

function handleSaveFile(format) {
  const canvas = canvasAreaRef.value.getCanvas();
  if (!canvas || !originalImageData.value) return alert('Нет изображения для сохранения!');

  if (format === 'gb7') {
    const blob = new Blob([encodeGB7(canvas)], { type: 'application/octet-stream' });
    downloadBlob(blob, 'image.gb7');
  } else if (format === 'png') {
    downloadUrl(canvas.toDataURL('image/png'), 'image.png');
  } else if (format === 'jpg') {
    downloadUrl(canvas.toDataURL('image/jpeg', 0.9), 'image.jpg');
  }
}

function downloadUrl(url, fileName) {
  const a = document.createElement('a');
  a.href = url; 
  a.download = fileName; 
  a.click();
}

function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  downloadUrl(url, fileName);
  URL.revokeObjectURL(url);
}
</script>

<style>
* { 
  box-sizing: border-box; 
  margin: 0; 
  padding: 0; 
}

body { 
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; 
  background-color: #1e1e1e; 
  color: #ccc; 
  height: 100vh; 
  overflow: hidden; 
}

.app-container { 
  display: flex; 
  flex-direction: column; 
  height: 100vh; 
}

.main-body { 
  display: flex; 
  flex: 1; 
  overflow: hidden; 
  position: relative; 
}
</style>