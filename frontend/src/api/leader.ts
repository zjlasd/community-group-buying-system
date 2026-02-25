import request from '@/utils/request'

/**
 * 团长管理 API
 */

// 团长信息类型
export interface Leader {
  id: number
  userId: number
  communityId: number | null
  name: string
  phone: string
  commissionRate: number
  balance: number
  totalOrders: number
  totalAmount: number
  totalCommission: number
  status: number
  createdAt: string
  updatedAt: string
  community?: {
    id: number
    name: string
    address: string
  }
  user?: {
    id: number
    username: string
    role: string
  }
}

// 团长列表查询参数
export interface LeaderListParams {
  page?: number
  pageSize?: number
  keyword?: string
  status?: number | string
  communityId?: number | string
}

// 创建团长参数
export interface CreateLeaderParams {
  username: string
  password: string
  name: string
  phone: string
  communityId?: number
  commissionRate?: number
}

// 更新团长参数
export interface UpdateLeaderParams {
  name?: string
  phone?: string
  communityId?: number | null
  commissionRate?: number
  status?: number
}

// 团长统计信息
export interface LeaderStats {
  leader: Leader
  orderStats: Array<{
    status: string
    count: number
    totalAmount: number
    totalCommission: number
  }>
  recentOrders: Array<{
    date: string
    count: number
    amount: number
  }>
}

/**
 * 获取团长列表
 */
export const getLeaderList = (params: LeaderListParams) => {
  return request<{
    list: Leader[]
    total: number
    page: number
    pageSize: number
  }>({
    url: '/leaders',
    method: 'get',
    params
  })
}

/**
 * 获取团长详情
 */
export const getLeaderById = (id: number) => {
  return request<Leader>({
    url: `/leaders/${id}`,
    method: 'get'
  })
}

/**
 * 获取团长统计信息
 */
export const getLeaderStats = (id: number) => {
  return request<LeaderStats>({
    url: `/leaders/${id}/stats`,
    method: 'get'
  })
}

/**
 * 获取团长业绩排行榜
 */
export const getLeaderRanking = (params?: { type?: 'orders' | 'amount' | 'commission'; limit?: number }) => {
  return request<Leader[]>({
    url: '/leaders/ranking/list',
    method: 'get',
    params
  })
}

/**
 * 创建团长
 */
export const createLeader = (data: CreateLeaderParams) => {
  return request<{
    id: number
    userId: number
    username: string
    name: string
    phone: string
  }>({
    url: '/leaders',
    method: 'post',
    data
  })
}

/**
 * 更新团长信息
 */
export const updateLeader = (id: number, data: UpdateLeaderParams) => {
  return request<Leader>({
    url: `/leaders/${id}`,
    method: 'put',
    data
  })
}

/**
 * 删除团长
 */
export const deleteLeader = (id: number) => {
  return request<null>({
    url: `/leaders/${id}`,
    method: 'delete'
  })
}
