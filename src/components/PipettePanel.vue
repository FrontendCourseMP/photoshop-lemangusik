<template>
  <div 
    v-if="isOpen" 
    class="draggable-panel" 
    :style="{ top: position.y + 'px', left: position.x + 'px' }"
  >
    <!-- Шапка панели -->
    <div class="panel-header" @mousedown="startDrag">
      <div class="panel-title">
        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M14.5 2a1.5 1.5 0 0 0-1 2.5l2 2-7.5 7.5a2.12 2.12 0 0 0-.6 1.4l-.4 3.5 3.5-.4a2.12 2.12 0 0 0 1.4-.6l7.5-7.5 2 2A1.5 1.5 0 0 0 22 9.5L14.5 2z"></path>
          <path d="M2 22l3-3"></path>
        </svg>
        <span>Информация о пикселе</span>
      </div>
      <button class="close-btn" @click="closePanel">&times;</button>
    </div>

    <!-- Контент панели -->
    <div class="panel-body">
      <template v-if="pixelInfo">
        <div class="color-preview-row">
          <div 
            class="color-box" 
            :style="{ backgroundColor: `rgba(${pixelInfo.r}, ${pixelInfo.g}, ${pixelInfo.b}, ${pixelInfo.a / 255})` }"
          ></div>
          <div class="coords-info">
            <div><strong>X:</strong> {{ pixelInfo.x }} px</div>
            <div><strong>Y:</strong> {{ pixelInfo.y }} px</div>
          </div>
        </div>

        <div class="info-group">
          <div class="info-label">RGB / Alpha:</div>
          <div class="info-value">
            R: {{ pixelInfo.r }} | G: {{ pixelInfo.g }} | B: {{ pixelInfo.b }} | A: {{ pixelInfo.a }}
          </div>
        </div>

        <div class="info-group" v-if="pixelInfo.lab">
          <div class="info-label">CIE L*a*b*:</div>
          <div class="info-value">
            L*: {{ pixelInfo.lab.l }} | a*: {{ pixelInfo.lab.a }} | b*: {{ pixelInfo.lab.b }}
          </div>
        </div>
      </template>

      <div v-else class="empty-state">
        Выберите инструмент «Пипетка» и кликните по пикселю на холсте.
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onUnmounted } from 'vue';

const props = defineProps({
  pixelInfo: { type: Object, default: null }
});

const emit = defineEmits(['close']);

const isOpen = ref(true);

// По умолчанию позиционируем панель справа снизу от центра
const position = reactive({ x: window.innerWidth - 280, y: 150 });
let isDragging = false;
let dragOffset = { x: 0, y: 0 };

function closePanel() {
  isOpen.value = false;
  emit('close');
}

function showPanel() {
  isOpen.value = true;
}

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

onUnmounted(() => {
  window.removeEventListener('mousemove', onDrag);
  window.removeEventListener('mouseup', stopDrag);
});

defineExpose({ showPanel, closePanel });
</script>

<style scoped>
.draggable-panel {
  position: fixed;
  z-index: 900;
  width: 250px;
  background-color: #181818; /* Единый цвет фона как у рабочей зоны канвас */
  color: #ccc;
  border: 1px solid #3c3c3c;
  border-radius: 6px;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.6);
  user-select: none;
  font-size: 12px;
}

.panel-header {
  background: #252525;
  padding: 6px 10px;
  border-bottom: 1px solid #3c3c3c;
  border-top-left-radius: 6px;
  border-top-right-radius: 6px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: move;
}

.panel-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 600;
  color: #eee;
}

.icon {
  width: 14px;
  height: 14px;
}

.close-btn {
  background: none;
  border: none;
  color: #888;
  font-size: 16px;
  cursor: pointer;
  line-height: 1;
}

.close-btn:hover {
  color: #fff;
}

.panel-body {
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.color-preview-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.color-box {
  width: 36px;
  height: 36px;
  border-radius: 4px;
  border: 1px solid #555;
  box-shadow: inset 0 0 4px rgba(0,0,0,0.5);
}

.coords-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  color: #aaa;
}

.info-group {
  background: #202020;
  padding: 6px 8px;
  border-radius: 4px;
  border: 1px solid #2a2a2a;
}

.info-label {
  font-size: 11px;
  color: #888;
  margin-bottom: 2px;
}

.info-value {
  font-family: monospace;
  color: #0098ff;
}

.empty-state {
  color: #777;
  font-style: italic;
  text-align: center;
  padding: 6px 0;
}
</style>