import request from '@/utils/request'

/**
 * 佣金管理 API
 */

// 佣金记录类型
export interface Commission {
  id: number
  leaderId: number
  orderId: number | null
  amount: number
  type: 'order' | 'adjustment'
  status: 'pending' | 'settled'
  remark: string | null
  createdAt: string
  leader?: {
    id: number
    name: string
    phone: string
  }
  order?: {
    id: number
    orderNo: string
    totalAmount: number
  }
}

// 佣金列表查询参数
export interface CommissionListParams {
  page?: number
  pageSize?: number
  leaderId?: number | string
  type?: 'order' | 'adjustment' | string
  status?: 'pending' | 'settled' | string
  startDate?: string
  endDate?: string
}

// 佣金调整参数
export interface CreateAdjustmentParams {
  leaderId: number
  amount: number
  remark?: string
}

/**
 * 获取佣金记录列表
 */
export const getCommissionList = (params: CommissionListParams) => {
  return request<{
    list: Commission[]
    total: number
    page: number
    pageSize: number
  }>({
    url: '/commissions',
    method: 'get',
    params
  })
}

/**
 * 获取佣金统计数据
 */
export const getCommissionStats = (params?: { leaderId?: number; startDate?: string; endDate?: string }) => {
  return request<{
    statusStats: Array<{ status: string; count: number; totalAmount: number }>
    typeStats: Array<{ type: string; count: number; totalAmount: number }>
  }>({
    url: '/commissions/stats',
    method: 'get',
    params
  })
}

/**
 * 获取佣金详情
 */
export const getCommissionById = (id: number) => {
  return request<Commission>({
    url: `/commissions/${id}`,
    method: 'get'
  })
}

/**
 * 创建佣金调整记录（管理员）
 */
export const createAdjustment = (data: CreateAdjustmentParams) => {
  return request<{
    id: number
    message: string
  }>({
    url: '/commissions/adjustment',
    method: 'post',
    data
  })
}

/**
 * 批量结算佣金（管理员）
 */
export const batchSettleCommissions = (ids: number[]) => {
  return request<{
    settledCount: number
    message: string
  }>({
    url: '/commissions/batch/settle',
    method: 'post',
    data: { ids }
  })
}
