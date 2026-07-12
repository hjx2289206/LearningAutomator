<template>
  <div class="app-container">
    <TitleBar />
    <div class="main-container">
      <Sidebar />
      <div class="content-area">
        <router-view />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import TitleBar from './components/TitleBar.vue'
import Sidebar from './components/Sidebar.vue'
</script>

<style scoped>
.app-container {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #1a1a2e;
}

.main-container {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.content-area {
  flex: 1;
  background: #1a1a2e;
  overflow: auto;
}
</style>
