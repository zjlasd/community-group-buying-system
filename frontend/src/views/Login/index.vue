<template>
  <div class="login-container">
    <div class="login-box">
      <div class="login-left">
        <h1>社区团购团长分销与订单汇总系统</h1>
        <p class="subtitle">Community Group Buying Management System</p>
        <div class="features">
          <div class="feature-item">
            <el-icon><Check /></el-icon>
            <span>团长佣金自动核算</span>
          </div>
          <div class="feature-item">
            <el-icon><Check /></el-icon>
            <span>订单自动汇总</span>
          </div>
          <div class="feature-item">
            <el-icon><Check /></el-icon>
            <span>配送清单一键生成</span>
          </div>
          <div class="feature-item">
            <el-icon><Check /></el-icon>
            <span>数据可视化分析</span>
          </div>
        </div>
      </div>

      <div class="login-right">
        <div class="login-form">
          <h2>欢迎登录</h2>
          <el-form :model="loginForm" :rules="rules" ref="formRef" @submit.prevent="handleLogin">
            <el-form-item prop="username">
              <el-input
                v-model="loginForm.username"
                placeholder="请输入用户名"
                size="large"
                clearable
              >
                <template #prefix>
                  <el-icon><User /></el-icon>
                </template>
              </el-input>
            </el-form-item>

            <el-form-item prop="password">
              <el-input
                v-model="loginForm.password"
                type="password"
                placeholder="请输入密码"
                size="large"
                show-password
                clearable
              >
                <template #prefix>
                  <el-icon><Lock /></el-icon>
                </template>
              </el-input>
            </el-form-item>

            <el-form-item>
              <el-button 
                type="primary" 
                size="large" 
                style="width: 100%" 
                @click="handleLogin"
                :loading="loading"
              >
                登录
              </el-button>
            </el-form-item>
          </el-form>

          <div class="tips">
            <p>管理员账号：admin / admin123</p>
            <p>团长账号：leader1 / leader123</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { useUserStore } from '@/stores/user'
import * as authApi from '@/api/auth'

const router = useRouter()
const userStore = useUserStore()
const formRef = ref<FormInstance>()
const loading = ref(false)

const loginForm = reactive({
  username: 'admin',
  password: 'admin123'
})

const rules: FormRules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
}

const handleLogin = async () => {
  if (!formRef.value) return

  await formRef.value.validate(async (valid) => {
    if (valid) {
      loading.value = true
      try {
        // 调用真实的登录 API
        const res = await authApi.login({
          username: loginForm.username,
          password: loginForm.password
        })

        // 登录成功，保存 token 和用户信息
        const { token, userInfo } = res.data
        
        // 转换后端返回的用户信息格式
        const user = {
          id: userInfo.id,
          username: userInfo.username,
          nickname: userInfo.realName || userInfo.username,
          role: userInfo.role as 'admin' | 'leader',
          avatar: userInfo.avatar
        }

        userStore.login(user, token)
        
        ElMessage.success(`欢迎${user.nickname}`)
        
        // 根据角色跳转不同页面
        if (user.role === 'admin') {
          router.push('/dashboard')
        } else {
          router.push('/leader-center')
        }
      } catch (error) {
        console.error('登录失败:', error)
        const err = error as { response?: { data?: { message?: string } }; message?: string }
        ElMessage.error(err.response?.data?.message || err.message || '登录失败')
      } finally {
        loading.value = false
      }
    }
  })
}
</script>

<style scoped>
.login-container {
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.login-box {
  width: 900px;
  height: 500px;
  background: #fff;
  border-radius: 10px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
  display: flex;
  overflow: hidden;
}

.login-left {
  flex: 1;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  padding: 60px 40px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.login-left h1 {
  font-size: 28px;
  margin-bottom: 10px;
}

.subtitle {
  font-size: 14px;
  opacity: 0.9;
  margin-bottom: 40px;
}

.features {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.feature-item {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 16px;
}

.feature-item .el-icon {
  font-size: 20px;
}

.login-right {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 40px;
}

.login-form {
  width: 100%;
  max-width: 350px;
}

.login-form h2 {
  text-align: center;
  margin-bottom: 30px;
  color: #303133;
}

.tips {
  margin-top: 20px;
  padding: 15px;
  background-color: #f5f7fa;
  border-radius: 4px;
  font-size: 13px;
  color: #606266;
  line-height: 1.8;
}

.tips p {
  margin: 5px 0;
}
</style>
