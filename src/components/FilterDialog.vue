
<template>
  <div v-if="isOpen" class="dialog-overlay">
    <div class="dialog-window" ref="dialogRef">
      <div class="dialog-header" @mousedown="startDrag">
        <span>Фильтры свертки (3x3)</span>
        <button class="close-btn" @click="closeModal">×</button>
      </div>

      <div class="dialog-body">
        <!-- Выбор пресета -->
        <div class="form-group">
          <label>Пресеты:</label>
          <select v-model="selectedPreset" @change="applyPreset">
            <option value="custom">Пользовательский</option>
            <option value="identity">Тождественное отображение</option>
            <option value="sharpen">Повышение резкости</option>
            <option value="gaussian">Размытие по Гауссу</option>
            <option value="boxBlur">Усредняющий фильтр</option>
            <option value="sobelX">Собель (X)</option>
            <option value="sobelY">Собель (Y)</option>
            <option value="prewittX">Прюитт (X)</option>
          </select>
        </div>

        <!-- Матрица ядра 3x3 -->
        <div class="form-group">
          <label>Ядро свертки (-100 ... 100):</label>
          <div class="kernel-grid">
            <div v-for="(row, r) in 3" :key="r" class="kernel-row">
              <input
                v-for="(col, c) in 3"
                :key="c"
                type="number"
                min="-100"
                max="100"
                step="any"
                :value="kernel[r][c]"
                @input="onKernelInput($event, r, c)"
              />
            </div>
          </div>
        </div>

        <!-- Выбор обрабатываемых каналов -->
        <div class="form-group">
          <label>Каналы обработки:</label>
          <div class="checkbox-group">
            <label>
              <input type="checkbox" v-model="master" :indeterminate="masterPartial" @change="triggerPreview" />
              Master
            </label>
            <label v-if="isGray">
              <input type="checkbox" v-model="channels.gray" @change="triggerPreview" /> Gray
            </label>
            <template v-else>
              <label><input type="checkbox" v-model="channels.r" @change="triggerPreview" /> R</label>
              <label><input type="checkbox" v-model="channels.g" @change="triggerPreview" /> G</label>
              <label><input type="checkbox" v-model="channels.b" @change="triggerPreview" /> B</label>
            </template>
            <label v-if="hasAlpha">
              <input type="checkbox" v-model="channels.a" @change="triggerPreview" /> Alpha
            </label>
          </div>
        </div>

        <!-- Краевые условия -->
        <div class="form-group">
          <label>Обработка краев:</label>
          <select v-model="edgeMode" @change="triggerPreview">
            <option value="clamp">Padded / Clamp (повтор края)</option>
            <option value="wrap">Wrap (зацикливание)</option>
            <option value="zero">Zero (заполнение нулем)</option>
          </select>
        </div>
        <div class="form-group">
          <label>
            <input type="checkbox" v-model="isPreview" @change="triggerPreview" />
            Предпросмотр
          </label>
        </div>
      </div>

      <div class="dialog-footer">
        <button class="btn" @click="closeModal">Отмена</button>
        <button class="btn btn-primary" @click="applyFilter">Применить</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onUnmounted } from 'vue';
import { PRESETS } from '../utils/kernelFilter';

const props = defineProps({
  imageData: Object,
  channelLayout: { type: String, default: 'rgba' }
});

const emit = defineEmits(['preview', 'apply']);

const isOpen = ref(false);
const dialogRef = ref(null);
const selectedPreset = ref('identity');
const edgeMode = ref('clamp');

const isPreview = ref(true);
const isGray = computed(() => ['gray', 'graya'].includes(props.channelLayout));
const hasAlpha = computed(() => ['rgba', 'graya'].includes(props.channelLayout));

const channels = reactive({ r: true, g: true, b: true, gray: true, a: false });
const colorChannelIds = computed(() => isGray.value ? ['gray'] : ['r', 'g', 'b']);

// Master управляет всей группой цветовых каналов; Alpha независим.
const master = computed({
  get: () => colorChannelIds.value.every(id => channels[id]),
  set: enabled => {
    for (const id of colorChannelIds.value) channels[id] = enabled;
  }
});
const masterPartial = computed(() =>
  !master.value && colorChannelIds.value.some(id => channels[id])
);

// Gray хранится в растре как три одинаковые компоненты RGB.
const processingChannels = computed(() => ({
  r: isGray.value ? channels.gray : channels.r,
  g: isGray.value ? channels.gray : channels.g,
  b: isGray.value ? channels.gray : channels.b,
  a: hasAlpha.value && channels.a
}));

const kernel = reactive([
  [0, 0, 0],
  [0, 1, 0],
  [0, 0, 0]
]);

let worker = null;
let requestId = 0;
let isApplying = false;

function initWorker() {
  if (!worker) {
    worker = new Worker(new URL('../workers/filterWorker.js', import.meta.url), { type: 'module' });
    worker.onmessage = (e) => {
      const { type, imageData, requestId: resultId } = e.data;
      if (!isOpen.value || resultId !== requestId) return;
      if (type === 'PREVIEW_RESULT' && isPreview.value && !isApplying) {
        emit('preview', imageData);
      } else if (type === 'APPLY_RESULT' && isApplying) {
        // Не восстанавливаем исходный растр после применения.
        closeModal(false);
        emit('apply', imageData);
      }
    };
  }
}

function showModal() {
  Object.assign(channels, { r: true, g: true, b: true, gray: true, a: false });
  isApplying = false;
  isOpen.value = true;
  initWorker();
  triggerPreview();
}

function closeModal(restoreOriginal = true) {
  isOpen.value = false;
  isApplying = false;
  requestId++;
  stopDrag();
  if (restoreOriginal && props.imageData) {
    emit('preview', props.imageData);
  }
}

function onKernelInput(event, r, c) {
  let val = parseFloat(event.target.value);
  
  if (isNaN(val)) {
    val = 0;
  } else {
    if (val > 100) val = 100;
    if (val < -100) val = -100;
  }

  event.target.value = val;
  kernel[r][c] = val;
  selectedPreset.value = 'custom';
  triggerPreview();
}

function applyPreset() {
  const presetKey = selectedPreset.value;
  if (PRESETS[presetKey]) {
    const p = PRESETS[presetKey];
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        kernel[r][c] = p[r][c];
      }
    }
    triggerPreview();
  }
}

function triggerPreview() {
  if (!isOpen.value || isApplying) return;
  // Инвалидируем уже отправленные запросы, в том числе при отключении.
  requestId++;
  if (!isPreview.value) {
    if (props.imageData) emit('preview', props.imageData);
    return;
  }
  processFilter(false);
}

function processFilter(isFinal) {
  if (!props.imageData || !worker) return;

  worker.postMessage({
    type: 'PROCESS',
    requestId,
    imageData: props.imageData,
    kernel: kernel.map(row => [...row]),
    channels: { ...processingChannels.value },
    edgeMode: edgeMode.value,
    isFinal
  });
}

function applyFilter() {
  if (!isOpen.value || !props.imageData || !worker || isApplying) return;
  isApplying = true;
  requestId++;
  processFilter(true);
}

// Логика перетаскивания окна
let isDragging = false;
let startX = 0, startY = 0;

function startDrag(e) {
  if (e.target.tagName === 'BUTTON') return;
  isDragging = true;
  startX = e.clientX - dialogRef.value.offsetLeft;
  startY = e.clientY - dialogRef.value.offsetTop;
  window.addEventListener('mousemove', onDrag);
  window.addEventListener('mouseup', stopDrag);
}

function onDrag(e) {
  if (!isDragging || !dialogRef.value) return;
  dialogRef.value.style.left = `${e.clientX - startX}px`;
  dialogRef.value.style.top = `${e.clientY - startY}px`;
}

function stopDrag() {
  isDragging = false;
  window.removeEventListener('mousemove', onDrag);
  window.removeEventListener('mouseup', stopDrag);
}

onUnmounted(() => {
  stopDrag();
  if (worker) worker.terminate();
});

defineExpose({ showModal });
</script>

<style scoped>
.dialog-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.4);
  z-index: 1000;
}

.dialog-window {
  position: absolute;
  top: 100px;
  left: 100px;
  width: 320px;
  background: #2b2b2b;
  border: 1px solid #444;
  border-radius: 6px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.5);
  color: #ddd;
  display: flex;
  flex-direction: column;
}

.dialog-header {
  padding: 10px 14px;
  background: #333;
  border-bottom: 1px solid #444;
  cursor: move;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: bold;
}

.close-btn {
  background: none;
  border: none;
  color: #aaa;
  font-size: 18px;
  cursor: pointer;
}
.close-btn:hover { color: #fff; }

.dialog-body {
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-group label {
  font-size: 12px;
  color: #aaa;
}

select, input[type="number"] {
  background: #1e1e1e;
  border: 1px solid #444;
  color: #fff;
  padding: 6px;
  border-radius: 4px;
  outline: none;
}

.kernel-grid {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.kernel-row {
  display: flex;
  gap: 4px;
}

.kernel-row input {
  width: 100%;
  text-align: center;
  -moz-appearance: textfield;
}

.kernel-row input::-webkit-outer-spin-button,
.kernel-row input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.checkbox-group {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 12px;
}

.checkbox-group label {
  display: flex;
  align-items: center;
  gap: 4px;
}

.dialog-footer {
  padding: 10px 14px;
  background: #222;
  border-top: 1px solid #444;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.btn {
  padding: 6px 12px;
  border-radius: 4px;
  border: 1px solid #555;
  background: #3a3a3a;
  color: #fff;
  cursor: pointer;
}
.btn:hover { background: #4a4a4a; }
.btn-primary { background: #0066cc; border-color: #0055bb; }
.btn-primary:hover { background: #0077ee; }
</style>