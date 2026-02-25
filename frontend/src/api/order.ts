import request from '@/utils/request'

/**
 * 订单管理 API
 */

export interface Order {
  id: number
  orderNo: string
  leaderId: number
  communityId: number
  customerName: string
  customerPhone: string
  totalAmount: number
  commissionAmount: number
  status: 'pending' | 'confirmed' | 'delivering' | 'pickup' | 'completed' | 'cancelled'
  confirmedAt: string
  completedAt: string
  createdAt: string
  leader: {
    id: number
    name: string
    phone: string
    commissionRate: number
  }
  community: {
    id: number
    name: string
    address: string
  }
  items: Array<{
    id: number
    productId: number
    productName: string
    productPrice: number
    quantity: number
    subtotal: number
    product: {
      id: number
      name: string
      imageUrl: string
    }
  }>
}

export interface OrderListParams {
  page?: number
  pageSize?: number
  keyword?: string
  status?: string
  leaderId?: string | number
  startDate?: string
  endDate?: string
}

export interface OrderStatsParams {
  startDate?: string
  endDate?: string
  leaderId?: string | number
}

export interface DeliveryListParams {
  deliveryDate: string
  groupBy?: 'leader' | 'community'
}

/**
 * 获取订单列表
 */
export const getOrderList = (params: OrderListParams) => {
  return request.get<{
    list: Order[]
    total: number
    page: number
    pageSize: number
  }>('/orders', { params })
}

/**
 * 获取订单详情
 */
export const getOrderDetail = (id: number) => {
  return request.get<Order>(`/orders/${id}`)
}

/**
 * 更新订单状态
 */
export const updateOrderStatus = (id: number, status: Order['status']) => {
  return request.patch(`/orders/${id}/status`, { status })
}

/**
 * 生成配送清单
 */
export const generateDeliveryList = (params: DeliveryListParams) => {
  return request.get<{
    deliveryDate: string
    groupBy: string
    list: Array<{
      id: number
      name: string
      phone: string
      address: string
      products: Array<{
        productId: number
        productName: string
        unit: string
        quantity: number
      }>
      totalOrders: number
      totalAmount: number
    }>
    totalGroups: number
    totalOrders: number
  }>('/orders/delivery-list', { params })
}

/**
 * 获取订单统计数据
 */
export const getOrderStats = (params?: OrderStatsParams) => {
  return request.get<{
    statusStats: Array<{
      status: string
      count: number
      totalAmount: number
    }>
    totalStats: {
      totalOrders: number
      totalAmount: number
      totalCommission: number
    }
    trendStats: Array<{
      date: string
      count: number
      amount: number
    }>
  }>('/orders/stats', { params })
}

/**
 * 批量删除订单
 */
export const batchDeleteOrders = (ids: number[]) => {
  return request.post('/orders/batch/delete', { ids })
}

/**
 * 导出配送清单(Excel)
 */
export const exportDeliveryList = async (params: DeliveryListParams) => {
  const response = await generateDeliveryList(params)
  
  // 使用xlsx库导出Excel
  const XLSX = await import('xlsx')
  
  const data = response.data.list.map(group => {
    const products = group.products.map(p => 
      `${p.productName} x ${p.quantity}${p.unit}`
    ).join('\n')
    
    return {
      '团长/社区': group.name,
      '联系方式': group.phone || group.address,
      '商品清单': products,
      '订单数': group.totalOrders,
      '总金额': `¥${group.totalAmount.toFixed(2)}`
    }
  })
  
  const ws = XLSX.utils.json_to_sheet(data)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, '配送清单')
  
  const fileName = `配送清单_${params.deliveryDate}_${params.groupBy === 'leader' ? '按团长' : '按社区'}.xlsx`
  XLSX.writeFile(wb, fileName)
}
