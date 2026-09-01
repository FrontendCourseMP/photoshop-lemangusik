<template>
  <dialog 
    ref="dialogRef" 
    class="levels-dialog" 
    :style="dialogStyle"
    @close="handleNativeClose"
  >
    <!-- Шапка, за которую можно перетаскивать окно -->
    <div class="dialog-header" @mousedown="startDrag">
      <h3>Уровни (Levels)</h3>
      <button class="close-btn" @click="cancel" @mousedown.stop>✕</button>
    </div>

    <div class="dialog-body">
      <!-- Селектор канала и режим гистограммы -->
      <div class="controls-row">
        <label>
          Канал:
          <select v-model="selectedChannel">
            <option value="master">RGB (Master)</option>
            <option value="r">Красный (Red)</option>
            <option value="g">Зеленый (Green)</option>
            <option value="b">Синий (Blue)</option>
            <option value="a">Альфа (Alpha)</option>
          </select>
        </label>

        <label class="scale-toggle">
          <input type="checkbox" v-model="isLogScale" />
          Логарифмическая шкала
        </label>
      </div>

      <!-- Canvas для Гистограммы -->
      <div class="histogram-container">
        <canvas ref="histCanvasRef" width="256" height="120"></canvas>
      </div>

      <!-- Входные уровни (Input Levels) -->
      <div class="inputs-section">
        <div class="section-title">Входные значения (Input Levels)</div>
        
        <div class="inputs-row">
          <label>
            Точка черного:
            <input 
              type="number" 
              min="0" 
              :max="currentSetting.inWhite - 1" 
              v-model.number="currentSetting.inBlack"
              @input="validateBlack"
            />
          </label>

          <label>
            Гамма:
            <input 
              type="number" 
              step="0.01" 
              min="0.1" 
              max="9.9" 
              v-model.number="currentSetting.gamma"
            />
          </label>

          <label>
            Точка белого:
            <input 
              type="number" 
              :min="currentSetting.inBlack + 1" 
              max="255" 
              v-model.number="currentSetting.inWhite"
              @input="validateWhite"
            />
          </label>
        </div>

        <!-- Слайдеры -->
        <div class="range-sliders">
          <input 
            type="range" 
            min="0" 
            :max="currentSetting.inWhite - 1" 
            v-model.number="currentSetting.inBlack" 
            class="slider slider-black" 
          />
          <input 
            type="range" 
            min="0.1" 
            max="9.9" 
            step="0.05" 
            v-model.number="currentSetting.gamma" 
            class="slider slider-gamma" 
          />
          <input 
            type="range" 
            :min="currentSetting.inBlack + 1" 
            max="255" 
            v-model.number="currentSetting.inWhite" 
            class="slider slider-white" 
          />
        </div>
      </div>

      <!-- Опции предпросмотра -->
      <div class="preview-row">
        <label class="checkbox-label">
          <input type="checkbox" v-model="isPreview" />
          Предпросмотр (Live Preview)
        </label>
      </div>
    </div>

    <!-- Кнопки управления -->
    <div class="dialog-actions">
      <button class="btn btn-reset" @click="resetCurrentChannel">Сброс канала</button>
      <button class="btn btn-reset-all" @click="resetAll">Сбросить всё</button>
      <div class="spacer"></div>
      <button class="btn" @click="cancel">Отмена</button>
      <button class="btn btn-primary" @click="apply">Применить</button>
    </div>
  </dialog>
</template>

<script setup>
import { ref, reactive, watch, computed, nextTick, onUnmounted } from 'vue';
import { calculateHistograms, applyLevelsToImageData } from '../utils/levelsUtils';

const props = defineProps({
  imageData: { type: Object, default: null }
});

const emit = defineEmits(['apply', 'preview', 'cancel']);

const dialogRef = ref(null);
const histCanvasRef = ref(null);

const selectedChannel = ref('master');
const isLogScale = ref(false);
const isPreview = ref(true);

// Позиционирование и перетаскивание
const position = reactive({ x: 0, y: 0 });
const isDragging = ref(false);
const dragOffset = { x: 0, y: 0 };

const dialogStyle = computed(() => {
  if (position.x === 0 && position.y === 0) return {};
  return {
    left: `${position.x}px`,
    top: `${position.y}px`,
    transform: 'none',
    margin: '0'
  };
});

function startDrag(e) {
  isDragging.value = true;
  const rect = dialogRef.value.getBoundingClientRect();
  dragOffset.x = e.clientX - rect.left;
  dragOffset.y = e.clientY - rect.top;

  window.addEventListener('mousemove', onDrag);
  window.addEventListener('mouseup', stopDrag);
}

function onDrag(e) {
  if (!isDragging.value) return;
  position.x = e.clientX - dragOffset.x;
  position.y = e.clientY - dragOffset.y;
}

function stopDrag() {
  isDragging.value = false;
  window.removeEventListener('mousemove', onDrag);
  window.removeEventListener('mouseup', stopDrag);
}

onUnmounted(stopDrag);

const defaultSettings = () => ({
  master: { inBlack: 0, inWhite: 255, gamma: 1.0 },
  r: { inBlack: 0, inWhite: 255, gamma: 1.0 },
  g: { inBlack: 0, inWhite: 255, gamma: 1.0 },
  b: { inBlack: 0, inWhite: 255, gamma: 1.0 },
  a: { inBlack: 0, inWhite: 255, gamma: 1.0 }
});

const settings = reactive(defaultSettings());
const histograms = ref(null);

const currentSetting = computed(() => settings[selectedChannel.value]);

function validateBlack() {
  if (currentSetting.value.inBlack >= currentSetting.value.inWhite) {
    currentSetting.value.inBlack = currentSetting.value.inWhite - 1;
  }
}

function validateWhite() {
  if (currentSetting.value.inWhite <= currentSetting.value.inBlack) {
    currentSetting.value.inWhite = currentSetting.value.inBlack + 1;
  }
}

function showModal() {
  if (dialogRef.value) {
    resetAll();
    // Центрирование при открытии
    position.x = (window.innerWidth - 420) / 2;
    position.y = (window.innerHeight - 450) / 2;

    if (props.imageData) {
      histograms.value = calculateHistograms(props.imageData);
    }
    // Открываем без модального затемнения заднего фона
    dialogRef.value.show();
    nextTick(drawHistogram);
  }
}

function drawHistogram() {
  const canvas = histCanvasRef.value;
  if (!canvas || !histograms.value) return;

  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;

  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#1e1e1e';
  ctx.fillRect(0, 0, w, h);

  const data = histograms.value[selectedChannel.value];
  if (!data) return;

  let maxVal = 0;
  for (let i = 0; i < 256; i++) {
    const val = isLogScale.value ? Math.log10(data[i] + 1) : data[i];
    if (val > maxVal) maxVal = val;
  }

  if (maxVal === 0) maxVal = 1;

  const colors = {
    master: '#aaaaaa',
    r: '#ff5555',
    g: '#55ff55',
    b: '#5599ff',
    a: '#ffffff'
  };

  ctx.fillStyle = colors[selectedChannel.value] || '#aaa';

  for (let i = 0; i < 256; i++) {
    const val = isLogScale.value ? Math.log10(data[i] + 1) : data[i];
    const barHeight = Math.round((val / maxVal) * h);
    ctx.fillRect(i, h - barHeight, 1, barHeight);
  }
}

let rafId = null;
watch([settings, isPreview], () => {
  if (rafId) cancelAnimationFrame(rafId);
  rafId = requestAnimationFrame(() => {
    drawHistogram();
    if (isPreview.value && props.imageData) {
      const result = applyLevelsToImageData(props.imageData, settings);
      emit('preview', result);
    } else {
      emit('preview', props.imageData);
    }
  });
}, { deep: true });

watch([selectedChannel, isLogScale], drawHistogram);

function resetCurrentChannel() {
  settings[selectedChannel.value] = { inBlack: 0, inWhite: 255, gamma: 1.0 };
}

function resetAll() {
  Object.assign(settings, defaultSettings());
}

function apply() {
  if (props.imageData) {
    const result = applyLevelsToImageData(props.imageData, settings);
    emit('apply', result);
  }
  dialogRef.value.close();
}

function cancel() {
  emit('preview', props.imageData);
  dialogRef.value.close();
}

function handleNativeClose() {
  emit('preview', props.imageData);
}

defineExpose({ showModal });
</script>

<style scoped>
.levels-dialog {
  position: fixed;
  background: #252526;
  color: #ccc;
  border: 1px solid #454545;
  border-radius: 6px;
  padding: 0;
  width: 420px;
  /* Глубокая тень и отсутствие затемнения заднего плана */
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.65), 0 0 0 1px rgba(255, 255, 255, 0.05);
  z-index: 1000;
}

/* Убираем затемнение бэкграунда */
.levels-dialog::backdrop {
  background: transparent;
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 16px;
  background-color: #2d2d2d;
  border-bottom: 1px solid #3c3c3c;
  cursor: move; /* Указатель перетаскивания */
  user-select: none;
}
.dialog-header h3 { margin: 0; font-size: 14px; color: #fff; pointer-events: none; }
.close-btn { background: none; border: none; color: #888; font-size: 16px; cursor: pointer; }
.close-btn:hover { color: #fff; }

.dialog-body { padding: 16px; display: flex; flex-direction: column; gap: 14px; }

.controls-row { display: flex; justify-content: space-between; align-items: center; font-size: 13px; }
select {
  background: #333; color: #fff; border: 1px solid #555; padding: 4px 8px; border-radius: 3px;
}

.histogram-container {
  background: #1e1e1e;
  border: 1px solid #3c3c3c;
  height: 120px;
  display: flex;
  justify-content: center;
}

.section-title { font-size: 12px; color: #888; margin-bottom: 6px; }
.inputs-row { display: flex; justify-content: space-between; gap: 8px; font-size: 12px; }
.inputs-row label { display: flex; flex-direction: column; gap: 4px; }
.inputs-row input[type="number"] {
  width: 60px; background: #333; color: #fff; border: 1px solid #555; padding: 3px 6px; border-radius: 3px;
}

.range-sliders { display: flex; flex-direction: column; gap: 6px; margin-top: 8px; }
.slider { width: 100%; accent-color: #007acc; cursor: pointer; }

.preview-row { font-size: 13px; }
.checkbox-label { display: flex; align-items: center; gap: 6px; cursor: pointer; }

.dialog-actions {
  display: flex; gap: 8px; padding: 12px 16px; background: #2d2d2d; border-top: 1px solid #3c3c3c;
}
.spacer { flex: 1; }
.btn {
  background: #3c3c3c; color: #fff; border: 1px solid #555; padding: 5px 12px; font-size: 12px; border-radius: 3px; cursor: pointer;
}
.btn:hover { background: #4a4a4a; }
.btn-primary { background: #007acc; border-color: #0098ff; }
.btn-primary:hover { background: #0098ff; }
</style>