import request from '@/utils/request'

/**
 * 数据看板 API
 */

// 管理员看板数据
export interface AdminDashboardData {
  stats: {
    todayOrders: number
    todaySales: number
    pendingWithdrawals: number
    activeLeaders: number
  }
  trends: {
    week: {
      dates: string[]
      orders: number[]
      sales: number[]
    }
    month: {
      dates: string[]
      orders: number[]
      sales: number[]
    }
  }
  leaderRanking: Array<{
    name: string
    community: string
    orders: number
    sales: number
    commission: number
  }>
}

// 团长看板数据
export interface LeaderDashboardData {
  stats: {
    todayIncome: number
    todayOrders: number
    monthIncome: number
    monthOrders: number
    totalIncome: number
    totalOrders: number
    balance: number
    commissionRate: number
    community: string
    customers: number
  }
  trend: {
    dates: string[]
    orders: number[]
    sales: number[]
  }
  recentOrders: Array<{
    orderNo: string
    customerName: string
    amount: number
    commission: number
    status: number
    createTime: string
  }>
}

/**
 * 获取管理员看板数据
 */
export const getAdminDashboard = () => {
  return request<AdminDashboardData>({
    url: '/dashboard/admin',
    method: 'get'
  })
}

/**
 * 获取团长看板数据
 */
export const getLeaderDashboard = () => {
  return request<LeaderDashboardData>({
    url: '/dashboard/leader',
    method: 'get'
  })
}
