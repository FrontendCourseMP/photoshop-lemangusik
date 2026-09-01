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
        v-model:activeMode="activeMode"
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

const canvasAreaRef = ref(null);
const levelsDialogRef = ref(null);
const resizeDialogRef = ref(null);
const filterDialogRef = ref(null);
const pipettePanelRef = ref(null);

const currentTool = ref('select');
const activeMode = ref(4);
const displayZoom = ref(100);

const originalImageData = ref(null);
const currentImageData = ref(null);
const pixelInfo = ref(null);

const imageInfo = reactive({ 
  width: 0, 
  height: 0, 
  colorDepth: '—' 
});

// Отслеживаем переключение каналов и изменения растра для перерисовки
watch([activeMode, currentImageData], renderFilteredCanvas);

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

async function handleFileSelect(event) {
  const file = event.target.files[0];
  if (!file) return;

  const canvas = canvasAreaRef.value.getCanvas();
  const ctx = canvas.getContext('2d');
  const fileName = file.name.toLowerCase();
  let imgData = null;

  if (fileName.endsWith('.gb7')) {
    const arrayBuffer = await file.arrayBuffer();
    const { width, height, hasMask, imageData } = decodeGB7(arrayBuffer);
    imgData = imageData;
    imageInfo.colorDepth = hasMask ? '7-bit Grayscale + 1-bit Alpha' : '7-bit Grayscale';
  } else {
    await new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        imgData = ctx.getImageData(0, 0, img.width, img.height);
        imageInfo.colorDepth = '32-bit (RGBA)';
        URL.revokeObjectURL(img.src);
        resolve();
      };
      img.src = URL.createObjectURL(file);
    });
  }

  imageInfo.width = imgData.width;
  imageInfo.height = imgData.height;
  originalImageData.value = imgData;
  currentImageData.value = imgData;

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
  const mode = activeMode.value;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
    const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);

    if (mode === 1) { out[i] = gray; out[i + 1] = gray; out[i + 2] = gray; out[i + 3] = 255; }
    else if (mode === 2) { out[i] = gray; out[i + 1] = gray; out[i + 2] = gray; out[i + 3] = a; }
    else if (mode === 3) { out[i] = r; out[i + 1] = g; out[i + 2] = b; out[i + 3] = 255; }
    else if (mode === 4) { out[i] = r; out[i + 1] = g; out[i + 2] = b; out[i + 3] = a; }
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