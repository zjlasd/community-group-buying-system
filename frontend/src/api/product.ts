import request from '@/utils/request'

/**
 * 商品管理 API
 */

// 获取商品列表
export const getProducts = (params: {
  page?: number
  pageSize?: number
  keyword?: string
  category?: string
  status?: number | string
  orderBy?: string
  sortDirection?: string
}) => {
  return request({
    url: '/products',
    method: 'get',
    params
  })
}

// 获取商品详情
export const getProduct = (id: number) => {
  return request({
    url: `/products/${id}`,
    method: 'get'
  })
}

// 创建商品
export const createProduct = (data: {
  name: string
  category?: string
  price: number
  commission_rate?: number
  stock?: number
  image_url?: string
  description?: string
}) => {
  return request({
    url: '/products',
    method: 'post',
    data
  })
}

// 更新商品
export const updateProduct = (id: number, data: {
  name?: string
  category?: string
  price?: number
  commission_rate?: number
  stock?: number
  image_url?: string
  description?: string
}) => {
  return request({
    url: `/products/${id}`,
    method: 'put',
    data
  })
}

// 删除商品
export const deleteProduct = (id: number) => {
  return request({
    url: `/products/${id}`,
    method: 'delete'
  })
}

// 更新商品状态（上下架）
export const updateProductStatus = (id: number, status: number) => {
  return request({
    url: `/products/${id}/status`,
    method: 'patch',
    data: { status }
  })
}

// 批量删除商品
export const batchDeleteProducts = (ids: number[]) => {
  return request({
    url: '/products/batch/delete',
    method: 'post',
    data: { ids }
  })
}

// 获取商品分类列表
export const getCategories = () => {
  return request({
    url: '/products/meta/categories',
    method: 'get'
  })
}
