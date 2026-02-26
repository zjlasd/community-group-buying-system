<template>
  <div class="commission-container">
    <!-- 佣金统计卡片 -->
    <el-row :gutter="20" class="stat-cards">
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-content">
            <div class="stat-info">
              <div class="stat-title">今日佣金支出</div>
              <div class="stat-value">¥{{ Number(stats.todayIncome || 0).toFixed(2) }}</div>
            </div>
            <el-icon class="stat-icon" color="#67c23a"><TrendCharts /></el-icon>
          </div>
        </el-card>
      </el-col>

      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-content">
            <div class="stat-info">
              <div class="stat-title">本月佣金支出</div>
              <div class="stat-value">¥{{ Number(stats.monthIncome || 0).toFixed(2) }}</div>
            </div>
            <el-icon class="stat-icon" color="#409eff"><Money /></el-icon>
          </div>
        </el-card>
      </el-col>

      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-content">
            <div class="stat-info">
              <div class="stat-title">累计佣金支出</div>
              <div class="stat-value">¥{{ Number(stats.totalIncome || 0).toFixed(2) }}</div>
            </div>
            <el-icon class="stat-icon" color="#f56c6c"><WalletFilled /></el-icon>
          </div>
        </el-card>
      </el-col>

      <el-col :span="6">
        <el-card shadow="hover" class="stat-card balance-card">
          <div class="stat-content">
            <div class="stat-info">
              <div class="stat-title">待审核提现</div>
              <div class="stat-value balance">¥{{ Number(stats.balance || 0).toFixed(2) }}</div>
              <div style="margin-top: 8px; font-size: 12px; opacity: 0.9">
                团长待审核的提现金额
              </div>
            </div>
            <el-icon class="stat-icon" color="#e6a23c"><Wallet /></el-icon>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 佣金支出趋势图 -->
    <el-card shadow="hover" style="margin-top: 20px">
      <template #header>
        <div class="card-header">
          <span>佣金支出趋势</span>
          <el-radio-group v-model="trendType" size="small">
            <el-radio-button value="week">近7天</el-radio-button>
            <el-radio-button value="month">近30天</el-radio-button>
          </el-radio-group>
        </div>
      </template>
      <div ref="chartRef" style="height: 300px"></div>
    </el-card>

    <!-- 提现申请列表 -->
    <el-card shadow="hover" style="margin-top: 20px">
      <template #header>
        <div class="card-header">
          <span>提现申请记录</span>
          <el-button type="primary" size="small" @click="showCommissionRecords">
            查看佣金记录
          </el-button>
        </div>
      </template>

      <!-- 搜索栏 -->
      <el-form :inline="true" :model="searchForm" class="search-form">
        <el-form-item label="团长">
          <el-select 
            v-model="searchForm.leaderId" 
            placeholder="全部" 
            clearable 
            filterable
            style="width: 150px"
          >
            <el-option
              v-for="leader in leaderList"
              :key="leader.id"
              :label="leader.name"
              :value="leader.id"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="状态">
          <el-select v-model="searchForm.status" placeholder="全部" clearable style="width: 120px">
            <el-option label="全部" value="" />
            <el-option label="待审核" value="pending" />
            <el-option label="已通过" value="approved" />
            <el-option label="已拒绝" value="rejected" />
          </el-select>
        </el-form-item>

        <el-form-item>
          <el-button type="primary" @click="handleSearch">
            <el-icon><Search /></el-icon>
            查询
          </el-button>
          <el-button @click="handleReset">
            <el-icon><Refresh /></el-icon>
            重置
          </el-button>
        </el-form-item>
      </el-form>

      <!-- 提现列表 -->
      <el-table :data="withdrawalList" v-loading="loading" style="width: 100%">
        <el-table-column prop="id" label="申请ID" width="80" />
        <el-table-column label="团长" width="100">
          <template #default="{ row }">
            {{ row.leader?.name || '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="amount" label="提现金额（元）" width="150">
          <template #default="{ row }">
            <span style="color: #f56c6c; font-weight: bold">¥{{ parseFloat(row.amount).toFixed(2) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="accountName" label="账户名" width="100" />
        <el-table-column prop="accountNumber" label="账号" width="180" />
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)">
              {{ getStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="申请时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" fixed="right" width="200">
          <template #default="{ row }">
            <el-button
              v-if="row.status === 'pending'"
              link
              type="success"
              size="small"
              @click="handleApprove(row)"
            >
              通过
            </el-button>
            <el-button
              v-if="row.status === 'pending'"
              link
              type="danger"
              size="small"
              @click="handleReject(row)"
            >
              拒绝
            </el-button>
            <el-button link type="primary" size="small" @click="handleView(row)">详情</el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <el-pagination
        v-model:current-page="pagination.page"
        v-model:page-size="pagination.pageSize"
        :total="pagination.total"
        :page-sizes="[10, 20, 50, 100]"
        layout="total, sizes, prev, pager, next, jumper"
        style="margin-top: 20px; justify-content: flex-end"
        @current-change="fetchWithdrawals"
        @size-change="fetchWithdrawals"
      />
    </el-card>

    <!-- 佣金记录对话框 -->
    <el-dialog v-model="commissionDialogVisible" title="佣金记录" width="1000px">
      <!-- 工具栏 -->
      <div style="margin-bottom: 15px">
        <el-button type="primary" @click="showAdjustmentDialog">
          <el-icon><Plus /></el-icon>
          佣金调整
        </el-button>
      </div>

      <!-- 搜索栏 -->
      <el-form :inline="true" :model="commissionSearchForm" style="margin-bottom: 15px">
        <el-form-item label="团长">
          <el-select v-model="commissionSearchForm.leaderId" placeholder="全部" clearable style="width: 150px">
            <el-option
              v-for="leader in leaderList"
              :key="leader.id"
              :label="leader.name"
              :value="leader.id"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="类型">
          <el-select v-model="commissionSearchForm.type" placeholder="全部" clearable style="width: 120px">
            <el-option label="全部" value="" />
            <el-option label="订单佣金" value="order" />
            <el-option label="手动调整" value="adjustment" />
          </el-select>
        </el-form-item>

        <el-form-item label="状态">
          <el-select v-model="commissionSearchForm.status" placeholder="全部" clearable style="width: 120px">
            <el-option label="全部" value="" />
            <el-option label="待结算" value="pending" />
            <el-option label="已结算" value="settled" />
          </el-select>
        </el-form-item>

        <el-form-item>
          <el-button type="primary" @click="handleCommissionSearch">查询</el-button>
          <el-button @click="handleCommissionReset">重置</el-button>
        </el-form-item>
      </el-form>

      <!-- 佣金记录表格 -->
      <el-table :data="commissionList" v-loading="commissionLoading" style="width: 100%">
        <el-table-column prop="id" label="ID" width="60" />
        <el-table-column label="团长" width="100">
          <template #default="{ row }">
            {{ row.leader?.name || '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="amount" label="佣金金额（元）" width="130">
          <template #default="{ row }">
            <span :style="{ color: parseFloat(row.amount.toString()) >= 0 ? '#67c23a' : '#f56c6c', fontWeight: 'bold' }">
              {{ parseFloat(row.amount.toString()) >= 0 ? '+' : '' }}¥{{ parseFloat(row.amount.toString()).toFixed(2) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="类型" width="100">
          <template #default="{ row }">
            <el-tag :type="row.type === 'order' ? 'success' : 'warning'">
              {{ row.type === 'order' ? '订单佣金' : row.type === 'adjustment' ? '手动调整' : row.remark || '-' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 'settled' ? 'success' : 'info'">
              {{ row.status === 'settled' ? '已结算' : '待结算' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="remark" label="备注" min-width="150" show-overflow-tooltip />
        <el-table-column label="创建时间" width="160">
          <template #default="{ row }">
            {{ formatDate(row.createdAt || row.created_at) }}
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <el-pagination
        v-model:current-page="commissionPagination.page"
        v-model:page-size="commissionPagination.pageSize"
        :total="commissionPagination.total"
        :page-sizes="[10, 20, 50, 100]"
        layout="total, sizes, prev, pager, next, jumper"
        style="margin-top: 20px; justify-content: flex-end"
        @current-change="fetchCommissions"
        @size-change="fetchCommissions"
      />
    </el-dialog>

    <!-- 提现详情对话框 -->
    <el-dialog v-model="detailDialogVisible" title="提现申请详情" width="600px">
      <el-descriptions :column="2" border v-if="currentWithdrawal">
        <el-descriptions-item label="申请ID">{{ currentWithdrawal.id }}</el-descriptions-item>
        <el-descriptions-item label="申请团长">{{ currentWithdrawal.leader?.name || '-' }}</el-descriptions-item>
        <el-descriptions-item label="团长电话">{{ currentWithdrawal.leader?.phone || '-' }}</el-descriptions-item>
        <el-descriptions-item label="提现金额">
          <span style="color: #f56c6c; font-weight: bold; font-size: 16px">
            ¥{{ Number(currentWithdrawal.amount || 0).toFixed(2) }}
          </span>
        </el-descriptions-item>
        <el-descriptions-item label="账户名">{{ currentWithdrawal.accountName || '-' }}</el-descriptions-item>
        <el-descriptions-item label="账号">{{ currentWithdrawal.accountNumber || '-' }}</el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag :type="getStatusType(String(currentWithdrawal.status))">
            {{ getStatusText(String(currentWithdrawal.status)) }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="申请时间" :span="2">
          {{ formatDate(currentWithdrawal.createdAt) }}
        </el-descriptions-item>
        <el-descriptions-item label="审核时间" :span="2" v-if="currentWithdrawal.reviewedAt || currentWithdrawal.auditedAt">
          {{ formatDate(currentWithdrawal.reviewedAt || currentWithdrawal.auditedAt || '') }}
        </el-descriptions-item>
        <el-descriptions-item label="备注" :span="2" v-if="currentWithdrawal.remark">
          {{ currentWithdrawal.remark }}
        </el-descriptions-item>
        <el-descriptions-item label="拒绝原因" :span="2" v-if="currentWithdrawal.rejectReason">
          <span style="color: #f56c6c">{{ currentWithdrawal.rejectReason }}</span>
        </el-descriptions-item>
      </el-descriptions>

      <template #footer>
        <el-button @click="detailDialogVisible = false">关闭</el-button>
        <el-button 
          v-if="currentWithdrawal?.status === 'pending'" 
          type="success" 
          @click="handleApproveFromDetail"
        >
          通过
        </el-button>
        <el-button 
          v-if="currentWithdrawal?.status === 'pending'" 
          type="danger" 
          @click="handleRejectFromDetail"
        >
          拒绝
        </el-button>
      </template>
    </el-dialog>

    <!-- 佣金调整对话框 -->
    <el-dialog v-model="adjustmentDialogVisible" title="佣金调整" width="500px">
      <el-form :model="adjustmentForm" :rules="adjustmentRules" ref="adjustmentFormRef" label-width="100px">
        <el-form-item label="选择团长" prop="leaderId">
          <el-select v-model="adjustmentForm.leaderId" placeholder="请选择团长" style="width: 100%">
            <el-option
              v-for="leader in leaderList"
              :key="leader.id"
              :label="`${leader.name} (${leader.phone})`"
              :value="leader.id"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="调整金额" prop="amount">
          <el-input-number
            v-model="adjustmentForm.amount"
            :precision="2"
            :step="10"
            style="width: 100%"
          />
          <div style="margin-top: 5px; font-size: 12px; color: #909399">
            正数为增加佣金，负数为扣除佣金
          </div>
        </el-form-item>

        <el-form-item label="备注" prop="remark">
          <el-input
            v-model="adjustmentForm.remark"
            type="textarea"
            :rows="3"
            placeholder="请输入调整原因"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="adjustmentDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmitAdjustment" :loading="adjustmentLoading">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, watch, nextTick } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import * as echarts from 'echarts'
import type { EChartsOption } from 'echarts'
import type { FormInstance, FormRules } from 'element-plus'
import {
  getCommissionStats,
  getCommissionList,
  createAdjustment,
  type Commission,
  type CommissionStats
} from '@/api/commission'
import { getWithdrawalList, approveWithdrawal, rejectWithdrawal, type Withdrawal } from '@/api/withdrawal'
import { getLeaderList, type Leader } from '@/api/leader'

// 统计数据
const stats = reactive<CommissionStats>({
  todayIncome: 0,
  monthIncome: 0,
  totalIncome: 0,
  balance: 0,
  monthTrend: [],
  weekTrend: []
})

// 团长列表
const leaderList = ref<Leader[]>([])

// 趋势类型
const trendType = ref('week')

// 图表引用
const chartRef = ref<HTMLDivElement>()

// 搜索表单
const searchForm = reactive({
  leaderId: '',
  status: ''
})

// 加载状态
const loading = ref(false)
const statsLoading = ref(false)

// 提现申请列表
const withdrawalList = ref<Withdrawal[]>([])

// 提现详情
const detailDialogVisible = ref(false)
const currentWithdrawal = ref<Withdrawal | null>(null)

// 佣金记录
const commissionDialogVisible = ref(false)
const commissionLoading = ref(false)
const commissionList = ref<Commission[]>([])

const commissionSearchForm = reactive({
  leaderId: '',
  type: '',
  status: ''
})

const commissionPagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0
})

// 佣金调整
const adjustmentDialogVisible = ref(false)
const adjustmentLoading = ref(false)
const adjustmentFormRef = ref<FormInstance>()

const adjustmentForm = reactive({
  leaderId: null as number | null,
  amount: 0,
  remark: ''
})

const adjustmentRules: FormRules = {
  leaderId: [{ required: true, message: '请选择团长', trigger: 'change' }],
  amount: [{ required: true, message: '请输入调整金额', trigger: 'blur' }],
  remark: [{ required: true, message: '请输入调整原因', trigger: 'blur' }]
}

// 分页
const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0
})

// 获取统计数据
const fetchStats = async () => {
  try {
    statsLoading.value = true
    const res = await getCommissionStats()
    Object.assign(stats, res.data)
    
    // 统计数据更新后重新渲染图表
    await nextTick()
    initChart()
  } catch (error: any) {
    ElMessage.error(error.message || '获取统计数据失败')
  } finally {
    statsLoading.value = false
  }
}

// 获取团长列表（获取所有团长，不分页）
const fetchLeaders = async () => {
  try {
    const res = await getLeaderList({ page: 1, pageSize: 9999 })  // 使用足够大的数值获取所有团长
    leaderList.value = res.data.list
  } catch (error: any) {
    console.error('获取团长列表失败:', error)
  }
}

// 获取提现列表
const fetchWithdrawals = async () => {
  try {
    loading.value = true
    const res = await getWithdrawalList({
      page: pagination.page,
      pageSize: pagination.pageSize,
      leaderId: searchForm.leaderId || undefined,
      status: searchForm.status !== '' ? searchForm.status : undefined
    })
    withdrawalList.value = res.data.list
    pagination.total = res.data.total
  } catch (error: any) {
    ElMessage.error(error.message || '获取提现列表失败')
  } finally {
    loading.value = false
  }
}

// 获取收益趋势数据
const getIncomeData = (type: string) => {
  const trendData = type === 'week' ? stats.weekTrend : stats.monthTrend
  
  if (!trendData || trendData.length === 0) {
    return {
      dates: [],
      incomes: []
    }
  }

  return {
    dates: trendData.map(item => {
      const date = new Date(item.date)
      return `${date.getMonth() + 1}/${date.getDate()}`
    }),
    incomes: trendData.map(item => parseFloat(item.amount.toString()))
  }
}

// 初始化图表
const initChart = () => {
  if (!chartRef.value) return

  const chart = echarts.init(chartRef.value)
  const data = getIncomeData(trendType.value)

  const option: EChartsOption = {
    tooltip: {
      trigger: 'axis',
      formatter: '{b}<br/>佣金支出: ¥{c}'
    },
    xAxis: {
      type: 'category',
      data: data.dates
    },
    yAxis: {
      type: 'value',
      name: '佣金支出（元）'
    },
    series: [
      {
        name: '佣金支出',
        type: 'line',
        smooth: true,
        data: data.incomes,
        itemStyle: { color: '#409eff' },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(64, 158, 255, 0.3)' },
            { offset: 1, color: 'rgba(64, 158, 255, 0.05)' }
          ])
        }
      }
    ]
  }

  chart.setOption(option)
  window.addEventListener('resize', () => chart.resize())
}

// 监听趋势类型变化
watch(trendType, () => {
  initChart()
})

// 获取状态类型
const getStatusType = (status: string) => {
  const typeMap: Record<string, 'warning' | 'success' | 'danger' | 'info'> = {
    'pending': 'warning',
    'approved': 'success',
    'rejected': 'danger'
  }
  return typeMap[status] || 'info'
}

// 获取状态文本
const getStatusText = (status: string) => {
  const textMap: Record<string, string> = {
    'pending': '待审核',
    'approved': '已通过',
    'rejected': '已拒绝'
  }
  return textMap[status] || '未知'
}

// 查询
const handleSearch = () => {
  pagination.page = 1
  fetchWithdrawals()
}

// 重置
const handleReset = () => {
  searchForm.leaderId = ''
  searchForm.status = ''
  pagination.page = 1
  fetchWithdrawals()
}

// 查看详情
const handleView = (row: Withdrawal) => {
  currentWithdrawal.value = row
  detailDialogVisible.value = true
}

// 从详情弹窗中通过审核
const handleApproveFromDetail = async () => {
  if (!currentWithdrawal.value) return
  
  try {
    await ElMessageBox.confirm(
      `确定通过 ${currentWithdrawal.value.leader?.name} 的提现申请吗?`,
      '提示',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'success'
      }
    )
    
    await approveWithdrawal(currentWithdrawal.value.id, { remark: '审核通过' })
    ElMessage.success('审核通过')
    detailDialogVisible.value = false
    currentWithdrawal.value = null
    fetchWithdrawals()
    fetchStats()
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '操作失败')
    }
  }
}

// 从详情弹窗中拒绝审核
const handleRejectFromDetail = async () => {
  if (!currentWithdrawal.value) return
  
  try {
    const result = await ElMessageBox.prompt(
      '请输入拒绝原因',
      '拒绝提现申请',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        inputType: 'textarea',
        inputValidator: (value) => {
          if (!value) {
            return '请输入拒绝原因'
          }
          return true
        }
      }
    )
    
    const remark = (result as any).value
    await rejectWithdrawal(currentWithdrawal.value.id, { remark })
    ElMessage.success('已拒绝')
    detailDialogVisible.value = false
    currentWithdrawal.value = null
    fetchWithdrawals()
    fetchStats()
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '操作失败')
    }
  }
}

// 审核通过
const handleApprove = async (row: Withdrawal) => {
  try {
    await ElMessageBox.confirm(`确定通过 ${row.leader?.name} 的提现申请吗?`, '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'success'
    })
    
    await approveWithdrawal(row.id, { remark: '审核通过' })
    ElMessage.success('审核通过')
    fetchWithdrawals()
    fetchStats()
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '操作失败')
    }
  }
}

// 审核拒绝
const handleReject = async (row: Withdrawal) => {
  try {
    const result = await ElMessageBox.prompt('请输入拒绝原因', '拒绝提现', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      inputPattern: /.+/,
      inputErrorMessage: '请输入拒绝原因'
    }) as { value: string }
    
    await rejectWithdrawal(row.id, { remark: result.value })
    ElMessage.success('已拒绝')
    fetchWithdrawals()
    fetchStats()
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '操作失败')
    }
  }
}

// 格式化日期
const formatDate = (date: string) => {
  if (!date) return '-'
  return new Date(date).toLocaleString('zh-CN')
}

// 获取佣金记录列表
const fetchCommissions = async () => {
  try {
    commissionLoading.value = true
    const res = await getCommissionList({
      page: commissionPagination.page,
      pageSize: commissionPagination.pageSize,
      leaderId: commissionSearchForm.leaderId || undefined,
      type: commissionSearchForm.type || undefined,
      status: commissionSearchForm.status || undefined
    })
    commissionList.value = res.data.list
    commissionPagination.total = res.data.total
  } catch (error: any) {
    ElMessage.error(error.message || '获取佣金记录失败')
  } finally {
    commissionLoading.value = false
  }
}

// 显示佣金记录对话框
const showCommissionRecords = () => {
  commissionDialogVisible.value = true
  fetchCommissions()
}

// 佣金记录搜索
const handleCommissionSearch = () => {
  commissionPagination.page = 1
  fetchCommissions()
}

// 佣金记录重置
const handleCommissionReset = () => {
  commissionSearchForm.leaderId = ''
  commissionSearchForm.type = ''
  commissionSearchForm.status = ''
  commissionPagination.page = 1
  fetchCommissions()
}

// 显示佣金调整对话框
const showAdjustmentDialog = () => {
  adjustmentDialogVisible.value = true
  Object.assign(adjustmentForm, {
    leaderId: null,
    amount: 0,
    remark: ''
  })
}

// 提交佣金调整
const handleSubmitAdjustment = async () => {
  if (!adjustmentFormRef.value) return

  await adjustmentFormRef.value.validate(async (valid) => {
    if (valid) {
      try {
        adjustmentLoading.value = true
        await createAdjustment({
          leaderId: adjustmentForm.leaderId!,
          amount: adjustmentForm.amount,
          remark: adjustmentForm.remark
        })
        ElMessage.success('佣金调整成功')
        adjustmentDialogVisible.value = false
        fetchCommissions()
        fetchStats()
      } catch (error: any) {
        ElMessage.error(error.message || '佣金调整失败')
      } finally {
        adjustmentLoading.value = false
      }
    }
  })
}

onMounted(() => {
  fetchStats()
  fetchWithdrawals()
  fetchLeaders()
})
</script>

<style scoped>
.commission-container {
  width: 100%;
}

.stat-cards {
  margin-bottom: 20px;
}

.stat-card {
  cursor: pointer;
  transition: transform 0.3s;
}

.stat-card:hover {
  transform: translateY(-5px);
}

.balance-card {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
}

.balance-card .stat-title,
.balance-card .stat-value {
  color: #fff;
}

.stat-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.stat-info {
  flex: 1;
}

.stat-title {
  font-size: 14px;
  color: #909399;
  margin-bottom: 10px;
}

.stat-value {
  font-size: 28px;
  font-weight: bold;
  color: #303133;
}

.stat-value.balance {
  color: #fff;
}

.stat-icon {
  font-size: 48px;
  opacity: 0.8;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.search-form {
  margin-bottom: 20px;
}
</style>
