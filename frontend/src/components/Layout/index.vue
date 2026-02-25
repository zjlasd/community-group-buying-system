<template>
  <div class="layout-container">
    <el-container>
      <!-- 侧边栏 -->
      <el-aside :width="isCollapse ? '64px' : '200px'" class="sidebar">
        <div class="logo">
          <span v-if="!isCollapse">社区团购系统</span>
          <span v-else>团购</span>
        </div>
        <el-menu
          :default-active="activeMenu"
          :collapse="isCollapse"
          :router="true"
          background-color="#304156"
          text-color="#bfcbd9"
          active-text-color="#409eff"
        >
          <!-- 管理员菜单 -->
          <template v-if="userStore.isAdmin()">
            <el-menu-item index="/dashboard">
              <el-icon><DataAnalysis /></el-icon>
              <template #title>数据看板</template>
            </el-menu-item>
            <el-menu-item index="/order">
              <el-icon><List /></el-icon>
              <template #title>订单管理</template>
            </el-menu-item>
            <el-menu-item index="/product-manage">
              <el-icon><Goods /></el-icon>
              <template #title>商品管理</template>
            </el-menu-item>
            <el-menu-item index="/leader">
              <el-icon><User /></el-icon>
              <template #title>团长管理</template>
            </el-menu-item>
            <el-menu-item index="/community">
              <el-icon><Location /></el-icon>
              <template #title>社区管理</template>
            </el-menu-item>
            <el-menu-item index="/commission">
              <el-icon><Wallet /></el-icon>
              <template #title>佣金管理</template>
            </el-menu-item>
          </template>

          <!-- 团长菜单 -->
          <template v-if="userStore.isLeader()">
            <el-menu-item index="/leader-center">
              <el-icon><User /></el-icon>
              <template #title>个人中心</template>
            </el-menu-item>
            <el-menu-item index="/my-orders">
              <el-icon><List /></el-icon>
              <template #title>我的订单</template>
            </el-menu-item>
            <el-menu-item index="/products">
              <el-icon><Goods /></el-icon>
              <template #title>可推广商品</template>
            </el-menu-item>
            <el-menu-item index="/customers">
              <el-icon><UserFilled /></el-icon>
              <template #title>客户管理</template>
            </el-menu-item>
            <el-menu-item index="/withdraw">
              <el-icon><Wallet /></el-icon>
              <template #title>提现管理</template>
            </el-menu-item>
          </template>
        </el-menu>
      </el-aside>

      <!-- 主内容区 -->
      <el-container>
        <!-- 顶部导航 -->
        <el-header class="header">
          <div class="header-left">
            <el-icon class="collapse-icon" @click="toggleCollapse">
              <Fold v-if="!isCollapse" />
              <Expand v-else />
            </el-icon>
          </div>
          <div class="header-right">
            <el-dropdown>
              <div class="user-info">
                <el-avatar :size="32">
                  {{ userStore.userInfo?.nickname?.charAt(0) || '用' }}
                </el-avatar>
                <span class="username">{{ userStore.userInfo?.nickname }}</span>
                <el-tag
                  v-if="userStore.isLeader()"
                  type="success"
                  size="small"
                  style="margin-left: 8px"
                >
                  团长
                </el-tag>
              </div>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item disabled>
                    <div style="display: flex; flex-direction: column; gap: 4px">
                      <span style="font-size: 14px; font-weight: bold">
                        {{ userStore.userInfo?.nickname }}
                      </span>
                      <span style="font-size: 12px; color: #909399">
                        {{ userStore.isAdmin() ? '系统管理员' : '社区团长' }}
                      </span>
                    </div>
                  </el-dropdown-item>
                  <el-dropdown-item divided @click="handleLogout">
                    <el-icon><SwitchButton /></el-icon>
                    退出登录
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </el-header>

        <!-- 主体内容 -->
        <el-main class="main-content">
          <router-view />
        </el-main>
      </el-container>
    </el-container>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/stores/user'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const isCollapse = ref(false)

const activeMenu = computed(() => route.path)

const toggleCollapse = () => {
  isCollapse.value = !isCollapse.value
}

const handleLogout = () => {
  userStore.logout()
  ElMessage.success('退出登录成功')
  router.push('/login')
}
</script>

<style scoped>
.layout-container {
  height: 100vh;
}

.el-container {
  height: 100%;
}

.sidebar {
  background-color: #304156;
  transition: width 0.3s;
  overflow-x: hidden;
}

.logo {
  height: 50px;
  line-height: 50px;
  text-align: center;
  font-size: 16px;
  font-weight: bold;
  color: #fff;
  background-color: #2b3a4b;
}

.el-menu {
  border-right: none;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: #fff;
  border-bottom: 1px solid #dcdfe6;
  padding: 0 20px;
}

.header-left {
  display: flex;
  align-items: center;
}

.collapse-icon {
  font-size: 20px;
  cursor: pointer;
  transition: transform 0.3s;
}

.collapse-icon:hover {
  transform: scale(1.2);
}

.header-right {
  display: flex;
  align-items: center;
}

.user-info {
  display: flex;
  align-items: center;
  cursor: pointer;
  padding: 5px 10px;
}

.username {
  margin-left: 10px;
  font-size: 14px;
}

.main-content {
  background-color: #f0f2f5;
  padding: 20px;
  overflow-y: auto;
}
</style>

