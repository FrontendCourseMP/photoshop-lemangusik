<template>
  <header class="toolbar">
    <div class="tool-group">
      <label class="btn file-btn">
        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
        </svg>
        <span>Открыть</span>
        <input type="file" accept="image/*,.gb7" @change="$emit('file-selected', $event)" hidden />
      </label>

      <div class="dropdown">
        <button class="btn">
          <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
            <polyline points="17 21 17 13 7 13 7 21"></polyline>
            <polyline points="7 3 7 8 15 8"></polyline>
          </svg>
          <span>Сохранить ▾</span>
        </button>
        <div class="dropdown-content">
          <button @click="$emit('save-file', 'png')">PNG</button>
          <button @click="$emit('save-file', 'jpg')">JPEG</button>
          <button @click="$emit('save-file', 'gb7')">GB7</button>
        </div>
      </div>
    </div>

    <div class="tool-separator"></div>

    <div class="tool-group">
      <!-- Указатель -->
      <button 
        class="btn tool-btn" 
        :class="{ active: currentTool === 'select' }"
        @click="$emit('update:currentTool', 'select')"
        title="Указатель"
      >
        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 3l7 18 3-7 7-3L3 3z"></path>
        </svg>
        <span>Указатель</span>
      </button>

      <!-- Пипетка -->
      <button 
        class="btn tool-btn" 
        :class="{ active: currentTool === 'pipette' }"
        @click="$emit('update:currentTool', 'pipette')"
        title="Пипетка"
      >
        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M14.5 2a1.5 1.5 0 0 0-1 2.5l2 2-7.5 7.5a2.12 2.12 0 0 0-.6 1.4l-.4 3.5 3.5-.4a2.12 2.12 0 0 0 1.4-.6l7.5-7.5 2 2A1.5 1.5 0 0 0 22 9.5L14.5 2z"></path>
          <path d="M2 22l3-3"></path>
        </svg>
        <span>Пипетка</span>
      </button>
    </div>

    <div class="tool-separator"></div>

    <div class="tool-group">
      <!-- Уровни -->
      <button class="btn tool-btn" @click="$emit('open-levels')" title="Коррекция уровней">
        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="4" y1="21" x2="4" y2="14"></line>
          <line x1="4" y1="10" x2="4" y2="3"></line>
          <line x1="12" y1="21" x2="12" y2="12"></line>
          <line x1="12" y1="8" x2="12" y2="3"></line>
          <line x1="20" y1="21" x2="20" y2="16"></line>
          <line x1="20" y1="12" x2="20" y2="3"></line>
          <line x1="1" y1="14" x2="7" y2="14"></line>
          <line x1="9" y1="8" x2="15" y2="8"></line>
          <line x1="17" y1="16" x2="23" y2="16"></line>
        </svg>
        <span>Уровни</span>
      </button>

      <!-- Размер -->
      <button class="btn tool-btn" @click="$emit('open-resize')" title="Изменение размера изображения">
        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="15 3 21 3 21 9"></polyline>
          <polyline points="9 21 3 21 3 15"></polyline>
          <line x1="21" y1="3" x2="14" y2="10"></line>
          <line x1="3" y1="21" x2="10" y2="14"></line>
        </svg>
        <span>Размер</span>
      </button>

      <!-- Фильтры -->
      <button class="btn tool-btn" @click="$emit('open-filter')" title="Фильтрация сверткой (Kernels)">
        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
        </svg>
        <span>Фильтры</span>
      </button>
    </div>
  </header>
</template>

<script setup>
defineProps({
  currentTool: { type: String, default: 'select' }
});

defineEmits([
  'file-selected', 
  'save-file', 
  'update:currentTool', 
  'open-levels', 
  'open-resize',
  'open-filter'
]);
</script>

<style scoped>
.toolbar {
  height: 40px;
  background-color: #2d2d2d;
  border-bottom: 1px solid #3c3c3c;
  display: flex;
  align-items: center;
  padding: 0 12px;
  gap: 10px;
  user-select: none;
}

.tool-group {
  display: flex;
  align-items: center;
  gap: 6px;
}

.tool-separator {
  width: 1px;
  height: 20px;
  background-color: #454545;
}

.btn {
  background-color: #3c3c3c;
  color: #ccc;
  border: 1px solid #555;
  padding: 4px 10px;
  font-size: 12px;
  border-radius: 3px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  transition: background-color 0.15s ease, border-color 0.15s ease;
}

.btn:hover {
  background-color: #4a4a4a;
  color: #fff;
  border-color: #777;
}

.btn.active {
  background-color: #007acc;
  color: #fff;
  border-color: #0098ff;
}

.file-btn {
  margin: 0;
}

.dropdown {
  position: relative;
  display: inline-block;
}

.dropdown-content {
  display: none;
  position: absolute;
  top: 100%;
  left: 0;
  background-color: #252526;
  min-width: 110px;
  box-shadow: 0px 8px 16px 0px rgba(0, 0, 0, 0.5);
  border: 1px solid #454545;
  border-radius: 3px;
  z-index: 100;
}

.dropdown-content button {
  color: #ccc;
  padding: 6px 12px;
  text-decoration: none;
  display: block;
  width: 100%;
  text-align: left;
  background: none;
  border: none;
  font-size: 12px;
  cursor: pointer;
}

.dropdown-content button:hover {
  background-color: #04395e;
  color: #fff;
}

.dropdown:hover .dropdown-content {
  display: block;
}

.icon {
  width: 14px;
  height: 14px;
  vertical-align: middle;
}
</style>