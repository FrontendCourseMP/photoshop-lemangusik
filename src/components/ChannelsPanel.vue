<template>
  <aside class="channels-panel">
    <div class="panel-header">
      <h3>Каналы</h3>
      <button
        class="panel-toggle"
        type="button"
        :aria-expanded="!collapsed"
        @click="collapsed = !collapsed"
      >
        {{ collapsed ? 'Показать' : 'Скрыть' }}
      </button>
    </div>

    <div v-if="!collapsed && originalImageData" class="channels-list">
      <div
        v-for="channel in availableChannels"
        :key="channel.id"
        class="channel-item"
        :class="{ active: isChannelActive(channel.id), disabled: !isChannelActive(channel.id) }"
        role="button"
        tabindex="0"
        :aria-pressed="isChannelActive(channel.id)"
        @click="toggleChannel(channel.id)"
        @keydown.enter.prevent="toggleChannel(channel.id)"
        @keydown.space.prevent="toggleChannel(channel.id)"
      >
        <input
          class="channel-checkbox"
          type="checkbox"
          :checked="isChannelActive(channel.id)"
          :aria-label="`${isChannelActive(channel.id) ? 'Скрыть' : 'Показать'} канал ${channel.name}`"
          @click.stop
          @change="toggleChannel(channel.id)"
        />

        <canvas
          :ref="el => setCanvasRef(el, channel.id)"
          class="thumb-canvas"
          width="64"
          height="48"
        ></canvas>

        <div class="channel-info">
          <span class="channel-name">{{ channel.name }}</span>
          <span class="channel-description">{{ channel.description }}</span>
        </div>
      </div>
    </div>

    <div v-else-if="!collapsed" class="empty-state">
      Откройте изображение, чтобы просмотреть его каналы.
    </div>
  </aside>
</template>

<script setup>
import { computed, nextTick, ref, watch } from 'vue';

const props = defineProps({
  originalImageData: { type: Object, default: null },
  channelLayout: { type: String, default: 'rgba' },
  activeChannels: { type: Array, default: () => [] }
});

const emit = defineEmits(['update:activeChannels']);

const collapsed = ref(false);

const channelDefinitions = {
  gray: { id: 'gray', name: 'Gray', description: 'Яркость' },
  r: { id: 'r', name: 'Red', description: 'Красный' },
  g: { id: 'g', name: 'Green', description: 'Зелёный' },
  b: { id: 'b', name: 'Blue', description: 'Синий' },
  a: { id: 'a', name: 'Alpha', description: 'Прозрачность' }
};

const channelIdsByLayout = {
  gray: ['gray'],
  graya: ['gray', 'a'],
  rgb: ['r', 'g', 'b'],
  rgba: ['r', 'g', 'b', 'a']
};

const availableChannels = computed(() => {
  const ids = channelIdsByLayout[props.channelLayout] || channelIdsByLayout.rgba;
  return ids.map(id => channelDefinitions[id]);
});

const canvasRefs = new Map();

function setCanvasRef(el, id) {
  if (el) canvasRefs.set(id, el);
  else canvasRefs.delete(id);
}

function isChannelActive(id) {
  return props.activeChannels.includes(id);
}

function toggleChannel(id) {
  const next = new Set(props.activeChannels);

  if (next.has(id)) next.delete(id);
  else next.add(id);

  emit('update:activeChannels', Array.from(next));
}

function getChannelValue(channelId, r, g, b, a) {
  if (channelId === 'r') return r;
  if (channelId === 'g') return g;
  if (channelId === 'b') return b;
  if (channelId === 'a') return a;
  return Math.round(0.299 * r + 0.587 * g + 0.114 * b);
}

function renderThumbnails() {
  if (!props.originalImageData) return;

  const { width, height, data } = props.originalImageData;
  const sourceCanvas = document.createElement('canvas');
  sourceCanvas.width = width;
  sourceCanvas.height = height;
  const sourceCtx = sourceCanvas.getContext('2d');

  for (const channel of availableChannels.value) {
    const thumbCanvas = canvasRefs.get(channel.id);
    if (!thumbCanvas) continue;

    const channelImageData = sourceCtx.createImageData(width, height);
    const out = channelImageData.data;

    for (let i = 0; i < data.length; i += 4) {
      const value = getChannelValue(
        channel.id,
        data[i],
        data[i + 1],
        data[i + 2],
        data[i + 3]
      );

      // Независимые каналы показываем в градациях серого:
      // белый — максимальная интенсивность, чёрный — отсутствие.
      out[i] = value;
      out[i + 1] = value;
      out[i + 2] = value;
      out[i + 3] = 255;
    }

    sourceCtx.putImageData(channelImageData, 0, 0);

    const thumbCtx = thumbCanvas.getContext('2d');
    thumbCtx.clearRect(0, 0, thumbCanvas.width, thumbCanvas.height);
    thumbCtx.drawImage(sourceCanvas, 0, 0, thumbCanvas.width, thumbCanvas.height);
  }
}

watch(
  [() => props.originalImageData, () => props.channelLayout, collapsed],
  async () => {
    await nextTick();
    renderThumbnails();
  },
  { immediate: true }
);
</script>

<style scoped>
.channels-panel {
  width: 240px;
  background-color: #252526;
  border-left: 1px solid #3c3c3c;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

h3 {
  font-size: 13px;
  color: #ddd;
  text-transform: uppercase;
  font-weight: 600;
}

.panel-toggle {
  padding: 2px 7px;
  border: 1px solid #4a4a4a;
  border-radius: 3px;
  background: #2d2d2d;
  color: #aaa;
  font: inherit;
  font-size: 11px;
  cursor: pointer;
}

.panel-toggle:hover,
.panel-toggle:focus-visible {
  color: #fff;
  border-color: #666;
  outline: none;
}

.empty-state {
  color: #888;
  font-size: 11px;
}

.channels-list {
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.channel-item {
  display: grid;
  grid-template-columns: 18px 64px 1fr;
  align-items: center;
  gap: 8px;
  padding: 6px;
  background-color: #2d2d2d;
  border: 1px solid #3c3c3c;
  border-radius: 4px;
  cursor: pointer;
  user-select: none;
  transition: opacity 0.15s ease, border-color 0.15s ease, background-color 0.15s ease;
}

.channel-item:hover,
.channel-item:focus-visible {
  border-color: #666;
  outline: none;
}

.channel-item.active {
  border-color: #007acc;
  background-color: #333b42;
}

.channel-item.disabled {
  opacity: 0.5;
}

.channel-checkbox {
  width: 14px;
  height: 14px;
  accent-color: #007acc;
  cursor: pointer;
}

.thumb-canvas {
  width: 64px;
  height: 48px;
  display: block;
  background-color: #000;
  border: 1px solid #444;
}

.channel-info {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.channel-name {
  font-size: 12px;
  color: #eee;
  font-weight: 600;
}

.channel-description {
  font-size: 10px;
  color: #999;
}

.empty-state {
  line-height: 1.4;
  padding: 8px 0;
}
</style>
