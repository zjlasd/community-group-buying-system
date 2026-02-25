<template>
  <div class="commission-container">
    <!-- 佣金统计卡片 -->
    <el-row :gutter="20" class="stat-cards">
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-content">
            <div class="stat-info">
              <div class="stat-title">今日佣金支出</div>
              <div class="stat-value">¥{{ stats.todayIncome.toFixed(2) }}</div>
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
              <div class="stat-value">¥{{ stats.monthIncome.toFixed(2) }}</div>
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
              <div class="stat-value">¥{{ stats.totalIncome.toFixed(2) }}</div>
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
              <div class="stat-value balance">¥{{ stats.balance.toFixed(2) }}</div>
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
        <span>提现申请记录</span>
      </template>

      <!-- 搜索栏 -->
      <el-form :inline="true" :model="searchForm" class="search-form">
        <el-form-item label="团长">
          <el-select v-model="searchForm.leaderId" placeholder="全部" clearable>
            <el-option label="全部" value="" />
            <el-option label="张阿姨" value="1" />
            <el-option label="李叔叔" value="2" />
            <el-option label="王大姐" value="3" />
          </el-select>
        </el-form-item>

        <el-form-item label="状态">
          <el-select v-model="searchForm.status" placeholder="全部" clearable>
            <el-option label="全部" value="" />
            <el-option label="待审核" :value="0" />
            <el-option label="已通过" :value="1" />
            <el-option label="已拒绝" :value="2" />
          </el-select>
        </el-form-item>

        <el-form-item>
          <el-button type="primary" @click="handleSearch">
            <el-icon><Search /></el-icon>
            查询
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
              v-if="row.status === 0"
              link
              type="success"
              size="small"
              @click="handleApprove(row)"
            >
              通过
            </el-button>
            <el-button
              v-if="row.status === 0"
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
    </el-card>

    <!-- 提现申请对话框 -->
    <el-dialog v-model="dialogVisible" title="申请提现" width="500px">
      <el-form :model="withdrawForm" :rules="withdrawRules" ref="formRef" label-width="100px">
        <el-form-item label="提现金额" prop="amount">
          <el-input-number
            v-model="withdrawForm.amount"
            :min="0.01"
            :max="stats.balance"
            :precision="2"
            :step="100"
            style="width: 100%"
          />
          <div style="margin-top: 5px; font-size: 12px; color: #909399">
            可提现余额: ¥{{ stats.balance.toFixed(2) }}
          </div>
        </el-form-item>

        <el-form-item label="账户名" prop="accountName">
          <el-input v-model="withdrawForm.accountName" placeholder="请输入账户名" />
        </el-form-item>

        <el-form-item label="账号" prop="accountNumber">
          <el-input v-model="withdrawForm.accountNumber" placeholder="请输入银行卡号" />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmitWithdraw">提交申请</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import * as echarts from 'echarts'
import type { EChartsOption } from 'echarts'
import type { FormInstance, FormRules } from 'element-plus'
import {
  getCommissionStats
} from '@/api/commission'
import { getWithdrawalList, approveWithdrawal, rejectWithdrawal, type Withdrawal } from '@/api/withdrawal'

// 统计数据
const stats = reactive({
  todayIncome: 0,
  monthIncome: 0,
  totalIncome: 0,
  balance: 0
})

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
  } catch (error: any) {
    ElMessage.error(error.message || '获取统计数据失败')
  } finally {
    statsLoading.value = false
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

// 提现对话框
const dialogVisible = ref(false)
const formRef = ref<FormInstance>()

const withdrawForm = reactive({
  amount: 0,
  accountName: '',
  accountNumber: ''
})

const withdrawRules: FormRules = {
  amount: [{ required: true, message: '请输入提现金额', trigger: 'blur' }],
  accountName: [{ required: true, message: '请输入账户名', trigger: 'blur' }],
  accountNumber: [{ required: true, message: '请输入账号', trigger: 'blur' }]
}

// 获取收益趋势数据
const getIncomeData = (type: string) => {
  if (type === 'week') {
    return {
      dates: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
      incomes: [120, 150, 180, 165, 195, 210, 156.8]
    }
  } else {
    const dates = Array.from({ length: 30 }, (_, i) => `${i + 1}日`)
    const incomes = Array.from({ length: 30 }, () => Math.floor(Math.random() * 100) + 100)
    return { dates, incomes }
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
const getStatusType = (status: number) => {
  const types = ['warning', 'success', 'danger']
  return types[status] || 'info'
}

// 获取状态文本
const getStatusText = (status: number) => {
  const texts = ['待审核', '已通过', '已拒绝']
  return texts[status] || '未知'
}

// 提交提现申请
const handleSubmitWithdraw = async () => {
  if (!formRef.value) return

  await formRef.value.validate((valid) => {
    if (valid) {
      ElMessage.success('提现申请提交成功，等待审核')
      dialogVisible.value = false
      formRef.value?.resetFields()
    }
  })
}

// 查询
const handleSearch = () => {
  pagination.page = 1
  fetchWithdrawals()
}

// 查看详情
const handleView = (row: any) => {
  ElMessage.info(`查看提现申请: ${row.id}`)
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

onMounted(() => {
  initChart()
  fetchStats()
  fetchWithdrawals()
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
