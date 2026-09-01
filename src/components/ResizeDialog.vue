<template>
  <BaseModal ref="modalRef" title="Изменение размера изображения">
    <!-- Информация о мегапикселях -->
    <div class="mp-info">
      <div>Исходный размер: <strong>{{ originalMp }} MP</strong> ({{ originalWidth }}×{{ originalHeight }} px)</div>
      <div>Новый размер: <strong>{{ newMp }} MP</strong> ({{ width }}×{{ height }} px)</div>
    </div>

    <!-- Режим единиц и пропорции -->
    <div class="controls-grid">
      <label>
        Единицы:
        <select v-model="unit" @change="handleUnitChange">
          <option value="px">Пиксели (px)</option>
          <option value="percent">Проценты (%)</option>
        </select>
      </label>

      <label class="checkbox-label">
        <input type="checkbox" v-model="keepAspectRatio" @change="recalculateHeight" />
        Сохранять пропорции
      </label>
    </div>

    <!-- Поля ввода ширины и высоты -->
    <div class="inputs-grid">
      <label>
        Ширина ({{ unit }}):
        <input 
          type="number" 
          v-model.number="widthInput" 
          :min="unit === 'px' ? 1 : 1" 
          :max="unit === 'px' ? 10000 : 1000"
          @input="onWidthChange"
        />
      </label>

      <label>
        Высота ({{ unit }}):
        <input 
          type="number" 
          v-model.number="heightInput" 
          :min="unit === 'px' ? 1 : 1" 
          :max="unit === 'px' ? 10000 : 1000"
          @input="onHeightChange"
        />
      </label>
    </div>

    <!-- Алгоритм интерполяции с Tooltip -->
    <div class="algo-section">
      <label class="algo-label">
        Алгоритм интерполяции:
        <select v-model="selectedAlgorithm">
          <option v-for="(algo, key) in INTERPOLATION_ALGORITHMS" :key="key" :value="key">
            {{ algo.name }}
          </option>
        </select>
      </label>

      <div class="tooltip-box">
        ℹ️ {{ currentAlgoDescription }}
      </div>
    </div>

    <!-- Ошибка валидации -->
    <div v-if="errorMessage" class="error-msg">{{ errorMessage }}</div>

    <template #actions>
      <div class="spacer"></div>
      <button class="btn" @click="modalRef.close()">Отмена</button>
      <button class="btn btn-primary" :disabled="!!errorMessage" @click="apply">Применить</button>
    </template>
  </BaseModal>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import BaseModal from './BaseModal.vue';
import { INTERPOLATION_ALGORITHMS } from '../utils/interpolation';

const props = defineProps({
  originalWidth: { type: Number, default: 800 },
  originalHeight: { type: Number, default: 600 }
});

const emit = defineEmits(['apply-resize']);

const modalRef = ref(null);
const unit = ref('px');
const keepAspectRatio = ref(true);
const selectedAlgorithm = ref('bilinear');

const widthInput = ref(800);
const heightInput = ref(600);
const errorMessage = ref('');

const aspectRatio = computed(() => props.originalWidth / props.originalHeight);

const width = computed(() => {
  return unit.value === 'px' ? widthInput.value : Math.round((props.originalWidth * widthInput.value) / 100);
});

const height = computed(() => {
  return unit.value === 'px' ? heightInput.value : Math.round((props.originalHeight * heightInput.value) / 100);
});

const originalMp = computed(() => ((props.originalWidth * props.originalHeight) / 1000000).toFixed(2));
const newMp = computed(() => ((width.value * height.value) / 1000000).toFixed(2));

const currentAlgoDescription = computed(() => INTERPOLATION_ALGORITHMS[selectedAlgorithm.value]?.description || '');

function validate() {
  if (width.value < 1 || height.value < 1) {
    errorMessage.value = 'Размеры должны быть больше 0!';
    return false;
  }
  if (width.value > 10000 || height.value > 10000) {
    errorMessage.value = 'Максимальный размер: 10000px!';
    return false;
  }
  errorMessage.value = '';
  return true;
}

function onWidthChange() {
  if (keepAspectRatio.value && aspectRatio.value) {
    heightInput.value = unit.value === 'px' 
      ? Math.round(widthInput.value / aspectRatio.value)
      : widthInput.value;
  }
  validate();
}

function onHeightChange() {
  if (keepAspectRatio.value && aspectRatio.value) {
    widthInput.value = unit.value === 'px' 
      ? Math.round(heightInput.value * aspectRatio.value)
      : heightInput.value;
  }
  validate();
}

function handleUnitChange() {
  if (unit.value === 'percent') {
    widthInput.value = 100;
    heightInput.value = 100;
  } else {
    widthInput.value = props.originalWidth;
    heightInput.value = props.originalHeight;
  }
  validate();
}

function recalculateHeight() {
  if (keepAspectRatio.value) onWidthChange();
}

function showModal() {
  unit.value = 'px';
  widthInput.value = props.originalWidth;
  heightInput.value = props.originalHeight;
  keepAspectRatio.value = true;
  validate();
  modalRef.value.showModal();
}

function apply() {
  if (!validate()) return;
  emit('apply-resize', {
    newWidth: width.value,
    newHeight: height.value,
    algorithm: selectedAlgorithm.value
  });
  modalRef.value.close();
}

defineExpose({ showModal });
</script>

<style scoped>
.mp-info { background: #1e1e1e; padding: 10px; border-radius: 4px; font-size: 12px; line-height: 1.5; }
.controls-grid, .inputs-grid { display: flex; justify-content: space-between; gap: 12px; font-size: 13px; }
.checkbox-label { display: flex; align-items: center; gap: 6px; cursor: pointer; }
select, input[type="number"] {
  background: #333; color: #fff; border: 1px solid #555; padding: 4px 8px; border-radius: 3px; width: 100%;
}
.inputs-grid label { flex: 1; display: flex; flex-direction: column; gap: 4px; }
.algo-section { display: flex; flex-direction: column; gap: 8px; font-size: 13px; }
.algo-label { display: flex; flex-direction: column; gap: 4px; }
.tooltip-box {
  background: #1a2634; border: 1px solid #007acc; padding: 8px; border-radius: 4px; font-size: 11px; color: #9cdcfe;
}
.error-msg { color: #ff5555; font-size: 12px; }
.spacer { flex: 1; }
.btn { background: #3c3c3c; color: #fff; border: 1px solid #555; padding: 5px 12px; font-size: 12px; border-radius: 3px; cursor: pointer; }
.btn:hover { background: #4a4a4a; }
.btn-primary { background: #007acc; border-color: #0098ff; }
</style>