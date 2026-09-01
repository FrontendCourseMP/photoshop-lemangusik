<template>
  <main class="canvas-area" ref="areaRef">
    <div class="canvas-wrapper">
      <canvas 
        ref="canvasRef" 
        :style="canvasStyle"
        @click="handleClick"
      ></canvas>
    </div>
  </main>
</template>

<script setup>
import { ref, computed } from 'vue';

const props = defineProps({
  currentTool: String,
  displayZoom: { type: Number, default: 100 }
});

const emit = defineEmits(['pixel-click']);
const canvasRef = ref(null);
const areaRef = ref(null);

// Динамически задаем CSS-размеры холста на основе процентного масштаба
const canvasStyle = computed(() => {
  if (!canvasRef.value) return {};
  const zoomFactor = props.displayZoom / 100;
  return {
    width: `${canvasRef.value.width * zoomFactor}px`,
    height: `${canvasRef.value.height * zoomFactor}px`,
    cursor: props.currentTool === 'pipette' ? 'crosshair' : 'default'
  };
});

function getCanvas() { return canvasRef.value; }

function handleClick(e) {
  if (!canvasRef.value) return;
  const rect = canvasRef.value.getBoundingClientRect();
  
  // Рассчитываем точные координаты клика на исходном растре
  const scaleX = canvasRef.value.width / rect.width;
  const scaleY = canvasRef.value.height / rect.height;

  const x = Math.floor((e.clientX - rect.left) * scaleX);
  const y = Math.floor((e.clientY - rect.top) * scaleY);

  if (x >= 0 && x < canvasRef.value.width && y >= 0 && y < canvasRef.value.height) {
    emit('pixel-click', { x, y });
  }
}

defineExpose({ getCanvas, areaRef });
</script>

<style scoped>
.canvas-area {
  flex: 1;
  background-color: #181818;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: auto; /* Позволяет скроллить, если масштаб > 100% */
  padding: 50px;  /* Минимальный отступ от краев по ТЗ */
  position: relative;
}

.canvas-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 0 20px rgba(0,0,0,0.8);
}

canvas {
  display: block;
  background-color: #000;
  image-rendering: pixelated; /* Сохраняет четкость пикселей при приближении */
}
</style>