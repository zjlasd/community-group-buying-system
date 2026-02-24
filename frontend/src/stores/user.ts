import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface UserInfo {
  id: number
  username: string
  nickname: string
  role: 'admin' | 'leader' // admin: 管理员, leader: 团长
  avatar?: string
  leaderId?: number // 团长ID(仅团长角色有)
  commissionRate?: number // 佣金比例(仅团长角色有)
}

export const useUserStore = defineStore('user', () => {
  const userInfo = ref<UserInfo | null>(null)
  const token = ref<string>('')

  // 登录
  const login = (user: UserInfo, tokenStr: string) => {
    userInfo.value = user
    token.value = tokenStr
    // 存储到localStorage
    localStorage.setItem('userInfo', JSON.stringify(user))
    localStorage.setItem('token', tokenStr)
  }

  // 退出登录
  const logout = () => {
    userInfo.value = null
    token.value = ''
    localStorage.removeItem('userInfo')
    localStorage.removeItem('token')
  }

  // 从localStorage恢复登录状态
  const restoreLogin = () => {
    const savedUser = localStorage.getItem('userInfo')
    const savedToken = localStorage.getItem('token')
    if (savedUser && savedToken) {
      userInfo.value = JSON.parse(savedUser)
      token.value = savedToken
    }
  }

  // 是否为管理员
  const isAdmin = () => {
    return userInfo.value?.role === 'admin'
  }

  // 是否为团长
  const isLeader = () => {
    return userInfo.value?.role === 'leader'
  }

  return {
    userInfo,
    token,
    login,
    logout,
    restoreLogin,
    isAdmin,
    isLeader
  }
})
