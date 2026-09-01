<template>
  <dialog ref="dialogRef" class="base-modal" :style="modalStyle">
    <div class="modal-header" @mousedown="startDrag">
      <h3>{{ title }}</h3>
      <button class="close-btn" @click="close" @mousedown.stop>✕</button>
    </div>
    <div class="modal-body">
      <slot />
    </div>
    <div v-if="$slots.actions" class="modal-actions">
      <slot name="actions" />
    </div>
  </dialog>
</template>

<script setup>
import { ref, reactive, computed, onUnmounted } from 'vue';

defineProps({
  title: { type: String, default: 'Модальное окно' }
});

const emit = defineEmits(['close']);
const dialogRef = ref(null);

const position = reactive({ x: 0, y: 0 });
const isDragging = ref(false);
const dragOffset = { x: 0, y: 0 };

const modalStyle = computed(() => {
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

function showModal() {
  if (dialogRef.value) {
    position.x = (window.innerWidth - 440) / 2;
    position.y = (window.innerHeight - 400) / 2;
    dialogRef.value.show();
  }
}

function close() {
  if (dialogRef.value) dialogRef.value.close();
  emit('close');
}

defineExpose({ showModal, close });
</script>

<style scoped>
.base-modal {
  position: fixed;
  background: #252526;
  color: #ccc;
  border: 1px solid #454545;
  border-radius: 6px;
  padding: 0;
  width: 440px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.65);
  z-index: 1000;
}
.base-modal::backdrop { background: transparent; }
.modal-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 10px 16px; background-color: #2d2d2d; border-bottom: 1px solid #3c3c3c;
  cursor: move; user-select: none;
}
.modal-header h3 { margin: 0; font-size: 14px; color: #fff; pointer-events: none; }
.close-btn { background: none; border: none; color: #888; font-size: 16px; cursor: pointer; }
.close-btn:hover { color: #fff; }
.modal-body { padding: 16px; display: flex; flex-direction: column; gap: 14px; }
.modal-actions {
  display: flex; gap: 8px; padding: 12px 16px; background: #2d2d2d; border-top: 1px solid #3c3c3c;
}
</style>
