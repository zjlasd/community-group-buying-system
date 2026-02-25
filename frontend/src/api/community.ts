import request from '@/utils/request'

/**
 * 社区管理 API
 */

// 社区类型
export interface Community {
  id: number
  name: string
  address: string | null
  district: string | null
  createdAt: string
  leaders?: Array<{
    id: number
    name: string
    phone: string
    status: number
    totalOrders?: number
    totalAmount?: number
  }>
}

// 社区列表查询参数
export interface CommunityListParams {
  page?: number
  pageSize?: number
  keyword?: string
  district?: string
}

// 创建社区参数
export interface CreateCommunityParams {
  name: string
  address?: string
  district?: string
}

// 更新社区参数
export interface UpdateCommunityParams {
  name?: string
  address?: string | null
  district?: string | null
}

/**
 * 获取社区列表
 */
export const getCommunityList = (params: CommunityListParams) => {
  return request<{
    list: Community[]
    total: number
    page: number
    pageSize: number
  }>({
    url: '/communities',
    method: 'get',
    params
  })
}

/**
 * 获取所有社区（不分页，用于下拉选择）
 */
export const getAllCommunities = () => {
  return request<Community[]>({
    url: '/communities/all',
    method: 'get'
  })
}

/**
 * 获取社区详情
 */
export const getCommunityById = (id: number) => {
  return request<Community>({
    url: `/communities/${id}`,
    method: 'get'
  })
}

/**
 * 创建社区
 */
export const createCommunity = (data: CreateCommunityParams) => {
  return request<{
    id: number
    message: string
  }>({
    url: '/communities',
    method: 'post',
    data
  })
}

/**
 * 更新社区信息
 */
export const updateCommunity = (id: number, data: UpdateCommunityParams) => {
  return request<{
    message: string
  }>({
    url: `/communities/${id}`,
    method: 'put',
    data
  })
}

/**
 * 删除社区
 */
export const deleteCommunity = (id: number) => {
  return request<{
    message: string
  }>({
    url: `/communities/${id}`,
    method: 'delete'
  })
}

/**
 * 获取区域列表（用于筛选）
 */
export const getDistricts = () => {
  return request<string[]>({
    url: '/communities/meta/districts',
    method: 'get'
  })
}

/**
 * 获取区域统计（社区数量分布）
 */
export const getCommunityAreas = () => {
  return request<Array<{
    area: string
    count: number
  }>>({
    url: '/communities/areas',
    method: 'get'
  })
}

/**
 * 获取社区下的团长列表
 */
export const getCommunityLeaders = (communityId: number) => {
  return request<Array<{
    id: number
    name: string
    phone: string
    status: number
    totalOrders: number
    totalCommission: number
  }>>({
    url: `/communities/${communityId}/leaders`,
    method: 'get'
  })
}
