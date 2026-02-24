import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/Login/index.vue'),
    meta: { title: '登录' }
  },
  {
    path: '/',
    component: () => import('@/components/Layout/index.vue'),
    redirect: '/dashboard',
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('@/views/Dashboard/index.vue'),
        meta: { title: '数据看板', icon: 'DataAnalysis' }
      },
      {
        path: 'order',
        name: 'Order',
        component: () => import('@/views/Order/index.vue'),
        meta: { title: '订单管理', icon: 'List' }
      },
      {
        path: 'leader',
        name: 'Leader',
        component: () => import('@/views/Leader/index.vue'),
        meta: { title: '团长管理', icon: 'User' }
      },
      {
        path: 'commission',
        name: 'Commission',
        component: () => import('@/views/Commission/index.vue'),
        meta: { title: '佣金管理', icon: 'Wallet' }
      }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

export default router
