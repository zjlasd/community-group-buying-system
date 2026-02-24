import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { useUserStore } from '@/stores/user'

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
      // 管理员路由
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('@/views/Dashboard/index.vue'),
        meta: { title: '数据看板', icon: 'DataAnalysis', roles: ['admin'] }
      },
      {
        path: 'order',
        name: 'Order',
        component: () => import('@/views/Order/index.vue'),
        meta: { title: '订单管理', icon: 'List', roles: ['admin'] }
      },
      {
        path: 'leader',
        name: 'Leader',
        component: () => import('@/views/Leader/index.vue'),
        meta: { title: '团长管理', icon: 'User', roles: ['admin'] }
      },
      {
        path: 'commission',
        name: 'Commission',
        component: () => import('@/views/Commission/index.vue'),
        meta: { title: '佣金管理', icon: 'Wallet', roles: ['admin'] }
      },
      // 团长路由
      {
        path: 'leader-center',
        name: 'LeaderCenter',
        component: () => import('@/views/LeaderCenter/index.vue'),
        meta: { title: '个人中心', icon: 'User', roles: ['leader'] }
      },
      {
        path: 'my-orders',
        name: 'MyOrders',
        component: () => import('@/views/MyOrders/index.vue'),
        meta: { title: '我的订单', icon: 'List', roles: ['leader'] }
      },
      {
        path: 'products',
        name: 'Products',
        component: () => import('@/views/Products/index.vue'),
        meta: { title: '可推广商品', icon: 'Goods', roles: ['leader'] }
      },
      {
        path: 'customers',
        name: 'Customers',
        component: () => import('@/views/Customers/index.vue'),
        meta: { title: '客户管理', icon: 'UserFilled', roles: ['leader'] }
      },
      {
        path: 'withdraw',
        name: 'Withdraw',
        component: () => import('@/views/Withdraw/index.vue'),
        meta: { title: '提现管理', icon: 'Wallet', roles: ['leader'] }
      }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

// 路由守卫
router.beforeEach((to, from, next) => {
  const userStore = useUserStore()
  
  // 恢复登录状态
  if (!userStore.userInfo) {
    userStore.restoreLogin()
  }

  // 如果访问登录页,且已登录,则跳转到首页
  if (to.path === '/login') {
    if (userStore.userInfo) {
      next(userStore.isAdmin() ? '/dashboard' : '/leader-center')
    } else {
      next()
    }
    return
  }

  // 如果访问需要登录的页面,但未登录,则跳转到登录页
  if (to.path !== '/login' && !userStore.userInfo) {
    next('/login')
    return
  }

  // 权限验证
  const roles = to.meta.roles as string[] | undefined
  if (roles && userStore.userInfo) {
    if (roles.includes(userStore.userInfo.role)) {
      next()
    } else {
      // 没有权限,跳转到对应角色的首页
      next(userStore.isAdmin() ? '/dashboard' : '/leader-center')
    }
    return
  }

  next()
})

export default router
