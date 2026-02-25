import request from '@/utils/request'

/**
 * 提现管理 API
 */

// 提现申请类型
export interface Withdrawal {
  id: number
  leaderId: number
  amount: number | string
  accountName: string
  accountNumber: string
  accountType?: string
  status: number | 'pending' | 'approved' | 'rejected'
  rejectReason?: string | null
  remark?: string | null
  reviewedAt?: string | null
  auditedAt?: string | null
  createdAt: string
  leader?: {
    id: number
    name: string
    phone: string
    balance: number
    community?: {
      id: number
      name: string
    }
  }
}

// 提现列表查询参数
export interface WithdrawalListParams {
  page?: number
  pageSize?: number
  status?: 'pending' | 'approved' | 'rejected' | string
  leaderId?: number | string
  startDate?: string
  endDate?: string
}

// 创建提现申请参数
export interface CreateWithdrawalParams {
  amount: number
  accountName: string
  accountNumber: string
  accountType: string
  remark?: string
}

// 审核提现申请参数
export interface ReviewWithdrawalParams {
  status: 'approved' | 'rejected'
  rejectReason?: string
}

/**
 * 获取提现申请列表
 */
export const getWithdrawalList = (params: WithdrawalListParams) => {
  return request<{
    list: Withdrawal[]
    total: number
    page: number
    pageSize: number
  }>({
    url: '/withdrawals',
    method: 'get',
    params
  })
}

/**
 * 获取提现统计数据
 */
export const getWithdrawalStats = (params?: { leaderId?: number }) => {
  return request<{
    balance: number
    available: number
    pending: number
    total: number
  }>({
    url: '/withdrawals/stats',
    method: 'get',
    params
  })
}

/**
 * 获取提现详情
 */
export const getWithdrawalById = (id: number) => {
  return request<Withdrawal>({
    url: `/withdrawals/${id}`,
    method: 'get'
  })
}

/**
 * 创建提现申请（团长）
 */
export const createWithdrawal = (data: CreateWithdrawalParams) => {
  return request<{
    id: number
    message: string
  }>({
    url: '/withdrawals',
    method: 'post',
    data
  })
}

/**
 * 审核提现申请（管理员）
 */
export const reviewWithdrawal = (id: number, data: ReviewWithdrawalParams) => {
  return request<{
    message: string
  }>({
    url: `/withdrawals/${id}/review`,
    method: 'post',
    data
  })
}

/**
 * 取消提现申请（团长)
 */
export const cancelWithdrawal = (id: number) => {
  return request<{
    message: string
  }>({
    url: `/withdrawals/${id}/cancel`,
    method: 'post'
  })
}

/**
 * 审核通过提现申请（管理员）
 */
export const approveWithdrawal = (id: number, data?: { remark?: string }) => {
  return reviewWithdrawal(id, { status: 'approved', rejectReason: data?.remark })
}

/**
 * 审核拒绝提现申请（管理员）
 */
export const rejectWithdrawal = (id: number, data: { remark: string }) => {
  return reviewWithdrawal(id, { status: 'rejected', rejectReason: data.remark })
}
