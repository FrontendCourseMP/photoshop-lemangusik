<template>
  <footer class="status-bar">
    <div class="status-left">
      <span>Размер: {{ width }} × {{ height }} px</span>
      <span class="divider">|</span>
      <span>Глубина цвета: {{ colorDepth }}</span>
      <template v-if="pixelInfo">
        <span class="divider">|</span>
        <span>X: {{ pixelInfo.x }}, Y: {{ pixelInfo.y }}</span>
        <span class="divider">|</span>
        <span>RGBA: ({{ pixelInfo.r }}, {{ pixelInfo.g }}, {{ pixelInfo.b }}, {{ pixelInfo.a }})</span>
      </template>
    </div>

    <div class="status-right">
      <label class="zoom-control">
        <span>Масштаб:</span>
        <select :value="displayZoom" @change="$emit('update:displayZoom', Number($event.target.value))">
          <option v-for="z in zoomPresetList" :key="z" :value="z">{{ z }}%</option>
        </select>
        <input 
          type="range" 
          min="12" 
          max="300" 
          :value="displayZoom" 
          @input="$emit('update:displayZoom', Number($event.target.value))"
          class="zoom-slider"
        />
        <span class="zoom-value">{{ displayZoom }}%</span>
      </label>
    </div>
  </footer>
</template>

<script setup>
defineProps({
  width: { type: Number, default: 0 },
  height: { type: Number, default: 0 },
  colorDepth: { type: String, default: '—' },
  pixelInfo: { type: Object, default: null },
  displayZoom: { type: Number, default: 100 }
});

defineEmits(['update:displayZoom']);

const zoomPresetList = [12, 25, 50, 75, 100, 125, 150, 200, 300];
</script>

<style scoped>
.status-bar {
  height: 28px;
  background-color: #007acc;
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 12px;
  font-size: 12px;
  user-select: none;
}

.status-left {
  display: flex;
  align-items: center;
  gap: 8px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.divider {
  opacity: 0.5;
}

.status-right {
  display: flex;
  align-items: center;
  margin-left: 12px;
}

.zoom-control {
  display: flex;
  align-items: center;
  gap: 8px;
}

.zoom-control select {
  background: #005999;
  color: #fff;
  border: 1px solid #0098ff;
  border-radius: 3px;
  padding: 1px 4px;
  font-size: 11px;
  outline: none;
  cursor: pointer;
}

.zoom-control select:hover {
  background: #004b80;
}

.zoom-slider {
  width: 90px;
  accent-color: #ffffff;
  cursor: pointer;
}

.zoom-value {
  display: inline-block;
  min-width: 36px;
  text-align: right;
  font-weight: 500;
}
</style>