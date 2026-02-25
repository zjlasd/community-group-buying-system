import request from '@/utils/request'

/**
 * 客户管理 API（团长端）
 */

// 客户类型
export interface Customer {
  name: string
  phone: string
  address: string
  tag: string
  orderCount: number
  totalAmount: number
  lastOrderTime: string
  remark?: string
  orders?: Array<{
    orderNo: string
    amount: number
    status: string
    createTime: string
  }>
}

// 客户列表查询参数
export interface CustomerListParams {
  page?: number
  pageSize?: number
  keyword?: string
  tag?: string
}

// 客户统计
export interface CustomerStats {
  total: number
  active: number
  sleeping: number
  vip: number
}

/**
 * 获取客户列表
 */
export const getCustomerList = (params: CustomerListParams) => {
  return request<{
    list: Customer[]
    total: number
    page: number
    pageSize: number
    stats: CustomerStats
  }>({
    url: '/customers',
    method: 'get',
    params
  })
}

/**
 * 获取客户详情
 */
export const getCustomerDetail = (phone: string) => {
  return request<Customer>({
    url: `/customers/${phone}`,
    method: 'get'
  })
}
