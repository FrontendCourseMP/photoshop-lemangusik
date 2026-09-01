<template>
  <div 
    v-if="isOpen" 
    class="draggable-modal" 
    :style="{ top: position.y + 'px', left: position.x + 'px' }"
  >
    <!-- Шапка окна для перетаскивания -->
    <div class="modal-header" @mousedown="startDrag">
      <span class="modal-title">Заказные фильтры (Kernels)</span>
      <button class="close-btn" @click="closeModal">&times;</button>
    </div>

    <div class="dialog-content">
      <div class="preset-selector">
        <label>Преднастройки:</label>
        <select v-model="selectedPreset" @change="applyPreset">
          <option value="identity">Тождественное отображение</option>
          <option value="sharpen">Повышение резкости</option>
          <option value="gaussian">Фильтр Гаусса (3x3)</option>
          <option value="boxBlur">Прямоугольное размытие</option>
          <option value="prewittHorizontal">Оператор Прюитт (Горизонтальный)</option>
          <option value="prewittVertical">Оператор Прюитт (Вертикальный)</option>
        </select>
      </div>

      <!-- Сетка ядра 3x3 -->
      <div class="kernel-grid">
        <input 
          v-for="(val, idx) in kernelMatrix" 
          :key="idx" 
          type="number" 
          v-model.number="kernelMatrix[idx]" 
          @input="onInputDebounce" 
        />
      </div>

      <!-- Выбор каналов -->
      <div class="options-group">
        <label>Каналы обработки:</label>
        <div class="checkbox-row">
          <label><input type="checkbox" v-model="channels.r" @change="triggerPreview" /> Red</label>
          <label><input type="checkbox" v-model="channels.g" @change="triggerPreview" /> Green</label>
          <label><input type="checkbox" v-model="channels.b" @change="triggerPreview" /> Blue</label>
        </div>
      </div>

      <!-- Стратегия края -->
      <div class="options-group">
        <label>Обработка краев (Edge Handling):</label>
        <select v-model="edgeStrategy" @change="triggerPreview">
          <option value="black">Заполнение черным</option>
          <option value="white">Заполнение белым</option>
          <option value="clamp">Копирование крайних пикселей</option>
        </select>
      </div>

      <!-- Статус и предпросмотр -->
      <div class="preview-option">
        <label>
          <input type="checkbox" v-model="enablePreview" @change="triggerPreview" />
          Предпросмотр
        </label>
        <span v-if="isProcessing" class="status-indicator">Вычисление (Worker)...</span>
      </div>

      <div class="dialog-actions">
        <button class="btn" @click="resetToDefault">Сбросить</button>
        <button class="btn" @click="closeModal">Отмена</button>
        <button class="btn primary" @click="applyFilter" :disabled="isProcessing">Применить</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onUnmounted } from 'vue';
import { KERNEL_PRESETS } from '../utils/kernelFilter';

const props = defineProps({
  imageData: { type: Object, default: null }
});

const emit = defineEmits(['preview', 'apply']);

const isOpen = ref(false);
const isProcessing = ref(false);
const enablePreview = ref(true);
const selectedPreset = ref('identity');

const kernelMatrix = ref([...KERNEL_PRESETS.identity.matrix]);
const edgeStrategy = ref('black');
const channels = reactive({ r: true, g: true, b: true });

// Координаты окна
const position = reactive({ x: 100, y: 100 });
let isDragging = false;
let dragOffset = { x: 0, y: 0 };

// Web Worker
let worker = null;
let debounceTimer = null;
let lastResultImageData = null;

function initWorker() {
  if (!worker) {
    worker = new Worker(new URL('../workers/filterWorker.js', import.meta.url), { type: 'module' });
  }
}

function showModal() {
  isOpen.value = true;
  initWorker();
  if (enablePreview.value) {
    triggerPreview();
  }
}

function closeModal() {
  isOpen.value = false;
  // Восстанавливаем оригинальное изображение при отмене
  emit('preview', props.imageData);
}

// Драг-н-Дроп логика
function startDrag(e) {
  if (e.target.classList.contains('close-btn')) return;
  isDragging = true;
  dragOffset.x = e.clientX - position.x;
  dragOffset.y = e.clientY - position.y;
  window.addEventListener('mousemove', onDrag);
  window.addEventListener('mouseup', stopDrag);
}

function onDrag(e) {
  if (!isDragging) return;
  position.x = e.clientX - dragOffset.x;
  position.y = e.clientY - dragOffset.y;
}

function stopDrag() {
  isDragging = false;
  window.removeEventListener('mousemove', onDrag);
  window.removeEventListener('mouseup', stopDrag);
}

function applyPreset() {
  const preset = KERNEL_PRESETS[selectedPreset.value];
  if (preset) {
    kernelMatrix.value = [...preset.matrix];
    triggerPreview();
  }
}

function onInputDebounce() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    triggerPreview();
  }, 150);
}

function resetToDefault() {
  selectedPreset.value = 'identity';
  kernelMatrix.value = [...KERNEL_PRESETS.identity.matrix];
  edgeStrategy.value = 'black';
  channels.r = true;
  channels.g = true;
  channels.b = true;
  triggerPreview();
}

/**
 * Запуск фоновых расчетов в Web Worker
 */
function runWorkerTask(srcImageData) {
  return new Promise((resolve) => {
    if (!worker || !srcImageData) return resolve(srcImageData);

    isProcessing.value = true;

    // Скопируем ArrayBuffer для безопасной передачи без блокировки UI
    const bufferCopy = srcImageData.data.buffer.slice(0);

    worker.onmessage = (e) => {
      const { buffer, width, height } = e.data;
      const clamped = new Uint8ClampedArray(buffer);
      const resData = new ImageData(clamped, width, height);
      isProcessing.value = false;
      resolve(resData);
    };

    worker.postMessage({
      buffer: bufferCopy,
      width: srcImageData.width,
      height: srcImageData.height,
      kernel: [...kernelMatrix.value],
      channels: { ...channels },
      edgeStrategy: edgeStrategy.value
    }, [bufferCopy]);
  });
}

async function triggerPreview() {
  if (!enablePreview.value || !props.imageData || !isOpen.value) return;
  lastResultImageData = await runWorkerTask(props.imageData);
  emit('preview', lastResultImageData);
}

async function applyFilter() {
  if (!props.imageData) return;
  if (!lastResultImageData) {
    lastResultImageData = await runWorkerTask(props.imageData);
  }
  emit('apply', lastResultImageData);
  isOpen.value = false;
}

onUnmounted(() => {
  if (worker) worker.terminate();
  window.removeEventListener('mousemove', onDrag);
  window.removeEventListener('mouseup', stopDrag);
});

defineExpose({ showModal });
</script>

<style scoped>
.draggable-modal {
  position: fixed;
  z-index: 1000;
  width: 320px;
  background: #2b2b2b;
  color: #ccc;
  border: 1px solid #454545;
  border-radius: 6px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.7);
  user-select: none;
}

.modal-header {
  background: #383838;
  padding: 8px 12px;
  border-bottom: 1px solid #454545;
  border-top-left-radius: 6px;
  border-top-right-radius: 6px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: move;
}

.modal-title {
  font-size: 13px;
  font-weight: 600;
  color: #fff;
}

.close-btn {
  background: none;
  border: none;
  color: #aaa;
  font-size: 18px;
  cursor: pointer;
  line-height: 1;
}

.close-btn:hover {
  color: #fff;
}

.dialog-content {
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.preset-selector select,
.options-group select {
  width: 100%;
  padding: 5px;
  background: #1e1e1e;
  border: 1px solid #454545;
  color: #fff;
  border-radius: 3px;
  margin-top: 4px;
}

.kernel-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
  background: #1e1e1e;
  padding: 8px;
  border-radius: 4px;
}

.kernel-grid input {
  width: 100%;
  text-align: center;
  background: #333;
  border: 1px solid #555;
  color: #fff;
  padding: 5px;
  border-radius: 3px;
}

.options-group {
  display: flex;
  flex-direction: column;
  font-size: 12px;
}

.checkbox-row {
  display: flex;
  gap: 12px;
  margin-top: 4px;
}

.preview-option {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
}

.status-indicator {
  color: #0098ff;
  font-size: 11px;
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 6px;
}

.btn {
  background: #3c3c3c;
  border: 1px solid #555;
  color: #ccc;
  padding: 5px 10px;
  font-size: 12px;
  border-radius: 3px;
  cursor: pointer;
}

.btn.primary {
  background: #007acc;
  border-color: #0098ff;
  color: #fff;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>