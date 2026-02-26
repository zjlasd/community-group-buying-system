<template>
  <div class="leader-center" v-loading="loading">
    <!-- 团长等级信息卡片 -->
    <el-card shadow="hover" class="level-card" style="margin-bottom: 20px">
      <div class="level-info">
        <div class="level-left">
          <el-icon :size="40" color="#409eff"><Star /></el-icon>
          <div class="level-text">
            <div class="level-title">
              <span style="font-size: 18px; font-weight: bold">{{ userStore.userInfo?.nickname }}</span>
              <el-tag :type="getLevelType(userStore.userInfo?.level || 1)" size="large" style="margin-left: 12px">
                {{ getLevelName(userStore.userInfo?.level || 1) }}
              </el-tag>
            </div>
            <div style="font-size: 14px; color: #909399; margin-top: 4px">
              佣金加成: <span style="color: #67c23a; font-weight: bold">+{{ (userStore.userInfo?.bonusRate || 0).toFixed(0) }}%</span>
            </div>
          </div>
        </div>
        <div class="level-right">
          <el-button type="primary" link @click="showLevelRules">
            <el-icon><QuestionFilled /></el-icon>
            等级规则
          </el-button>
        </div>
      </div>
    </el-card>

    <!-- 佣金统计卡片 -->
    <el-row :gutter="20" class="stat-cards">
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-content">
            <div class="stat-info">
              <div class="stat-title">今日收益</div>
              <div class="stat-value">¥{{ (stats.todayIncome || 0).toFixed(2) }}</div>
            </div>
            <el-icon class="stat-icon" color="#67c23a"><Money /></el-icon>
          </div>
        </el-card>
      </el-col>

      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-content">
            <div class="stat-info">
              <div class="stat-title">本月收益</div>
              <div class="stat-value">¥{{ (stats.monthIncome || 0).toFixed(2) }}</div>
            </div>
            <el-icon class="stat-icon" color="#409eff"><TrendCharts /></el-icon>
          </div>
        </el-card>
      </el-col>

      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-content">
            <div class="stat-info">
              <div class="stat-title">累计收益</div>
              <div class="stat-value">¥{{ (stats.totalIncome || 0).toFixed(2) }}</div>
            </div>
            <el-icon class="stat-icon" color="#e6a23c"><Wallet /></el-icon>
          </div>
        </el-card>
      </el-col>

      <el-col :span="6">
        <el-card shadow="hover" class="stat-card balance-card">
          <div class="stat-content">
            <div class="stat-info">
              <div class="stat-title">可提现余额</div>
              <div class="stat-value">¥{{ (stats.balance || 0).toFixed(2) }}</div>
            </div>
            <el-icon class="stat-icon" color="#fff"><CreditCard /></el-icon>
          </div>
          <el-button type="success" size="small" class="withdraw-btn" @click="showWithdrawDialog">
            申请提现
          </el-button>
        </el-card>
      </el-col>
    </el-row>

    <!-- 订单趋势图表 -->
    <el-row :gutter="20" style="margin-top: 20px">
      <el-col :span="16">
        <el-card shadow="hover">
          <template #header>
            <div class="card-header">
              <span>订单趋势</span>
              <el-radio-group v-model="trendType" size="small">
                <el-radio-button value="7">近7天</el-radio-button>
                <el-radio-button value="30">近30天</el-radio-button>
              </el-radio-group>
            </div>
          </template>
          <div ref="chartRef" style="height: 350px"></div>
        </el-card>
      </el-col>

      <el-col :span="8">
        <el-card shadow="hover">
          <template #header>
            <span>业绩统计</span>
          </template>
          <div class="performance-stats">
            <div class="performance-item">
              <span class="label">今日订单</span>
              <span class="value">{{ stats.todayOrders || 0 }} 单</span>
            </div>
            <div class="performance-item">
              <span class="label">本月订单</span>
              <span class="value">{{ stats.monthOrders || 0 }} 单</span>
            </div>
            <div class="performance-item">
              <span class="label">累计订单</span>
              <span class="value">{{ stats.totalOrders || 0 }} 单</span>
            </div>
            <div class="performance-item">
              <span class="label">佣金比例</span>
              <span class="value">{{ ((stats.commissionRate || 0) * 100).toFixed(0) }}%</span>
            </div>
            <div class="performance-item">
              <span class="label">服务社区</span>
              <span class="value">{{ stats.community || '-' }}</span>
            </div>
            <div class="performance-item">
              <span class="label">客户数量</span>
              <span class="value">{{ stats.customers || 0 }} 人</span>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 我的订单 -->
    <el-card shadow="hover" style="margin-top: 20px">
      <template #header>
        <div class="card-header">
          <span>我的订单</span>
          <el-button type="primary" size="small" @click="$router.push('/my-orders')">
            查看全部
          </el-button>
        </div>
      </template>
      <el-table :data="recentOrders" style="width: 100%">
        <el-table-column prop="orderNo" label="订单号" width="180" />
        <el-table-column prop="customerName" label="客户姓名" width="120" />
        <el-table-column prop="amount" label="订单金额" width="120">
          <template #default="{ row }">
            <span class="amount">¥{{ (row.amount || 0).toFixed(2) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="commission" label="佣金" width="120">
          <template #default="{ row }">
            <span class="commission">¥{{ (row.commission || 0).toFixed(2) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)">
              {{ getStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createTime" label="下单时间" />
      </el-table>
    </el-card>

    <!-- 提现申请对话框 -->
    <el-dialog v-model="withdrawDialogVisible" title="申请提现" width="500px">
      <el-form :model="withdrawForm" :rules="withdrawRules" ref="withdrawFormRef" label-width="100px">
        <el-form-item label="可提现余额">
          <span class="balance-text">¥{{ (stats.balance || 0).toFixed(2) }}</span>
        </el-form-item>
        <el-form-item label="提现金额" prop="amount">
          <el-input
            v-model.number="withdrawForm.amount"
            placeholder="请输入提现金额"
            type="number"
          >
            <template #append>元</template>
          </el-input>
        </el-form-item>
        <el-form-item label="提现账户" prop="account">
          <el-input v-model="withdrawForm.account" placeholder="请输入银行卡号或支付宝账号" />
        </el-form-item>
        <el-form-item label="账户名称" prop="accountName">
          <el-input v-model="withdrawForm.accountName" placeholder="请输入账户名称" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="withdrawDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleWithdraw">确认提现</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import * as echarts from 'echarts'
import type { EChartsOption } from 'echarts'
import { useUserStore } from '@/stores/user'
import { getLeaderDashboard } from '@/api/dashboard'
import { createWithdrawal } from '@/api/withdrawal'
import { Star, QuestionFilled } from '@element-plus/icons-vue'

const userStore = useUserStore()
const chartRef = ref<HTMLElement>()
const trendType = ref('7')
const withdrawDialogVisible = ref(false)

// 获取等级名称
const getLevelName = (level: number) => {
  const levelNames = ['', '一星团长', '二星团长', '三星团长', '四星团长', '五星团长']
  return levelNames[level] || '一星团长'
}

// 获取等级类型(用于Tag颜色)
const getLevelType = (level: number) => {
  const types = ['', 'info', 'success', 'warning', 'danger', 'primary']
  return types[level] || 'info'
}

// 显示等级规则
const showLevelRules = () => {
  ElMessageBox.alert(
    `<div style="line-height: 1.8">
      <h3 style="margin-bottom: 12px">团长等级规则</h3>
      <p><strong>一星团长:</strong> 累计订单 0-49单，佣金加成 0%</p>
      <p><strong>二星团长:</strong> 累计订单 50-99单，佣金加成 5%</p>
      <p><strong>三星团长:</strong> 累计订单 100-199单，佣金加成 10%</p>
      <p><strong>四星团长:</strong> 累计订单 200-499单，佣金加成 15%</p>
      <p><strong>五星团长:</strong> 累计订单 500单以上，佣金加成 20%</p>
      <br/>
      <p style="color: #909399; font-size: 14px">
        实际佣金 = 商品基础佣金 × (1 + 等级加成)
      </p>
    </div>`,
    '等级规则',
    {
      dangerouslyUseHTMLString: true,
      confirmButtonText: '我知道了'
    }
  )
}
const withdrawFormRef = ref<FormInstance>()
const loading = ref(false)

// 统计数据
const stats = reactive({
  todayIncome: 0,
  monthIncome: 0,
  totalIncome: 0,
  balance: 0,
  todayOrders: 0,
  monthOrders: 0,
  totalOrders: 0,
  commissionRate: 0.12,
  community: '-',
  customers: 0
})

// 最近订单
const recentOrders = ref<any[]>([])

// 趋势数据
const trendsData = ref({
  '7': { dates: [], orders: [], sales: [] },
  '30': { dates: [], orders: [], sales: [] }
})

// 加载看板数据
const loadDashboardData = async () => {
  try {
    loading.value = true
    const res = await getLeaderDashboard()
    
    // 更新统计数据 - 确保数值类型转换
    if (res.data?.stats) {
      Object.assign(stats, {
        todayIncome: parseFloat(res.data.stats.todayIncome) || 0,
        monthIncome: parseFloat(res.data.stats.monthIncome) || 0,
        totalIncome: parseFloat(res.data.stats.totalIncome) || 0,
        balance: parseFloat(res.data.stats.balance) || 0,
        todayOrders: parseInt(res.data.stats.todayOrders) || 0,
        monthOrders: parseInt(res.data.stats.monthOrders) || 0,
        totalOrders: parseInt(res.data.stats.totalOrders) || 0,
        commissionRate: parseFloat(res.data.stats.commissionRate) || 0.12,
        community: res.data.stats.community || '-',
        customers: parseInt(res.data.stats.customers) || 0
      })
    }
    
    // 更新订单列表 - 确保字段映射正确
    if (res.data?.recentOrders && Array.isArray(res.data.recentOrders)) {
      recentOrders.value = res.data.recentOrders.map((order: any) => ({
        orderNo: order.orderNo || '',
        customerName: order.customerName || '',
        amount: parseFloat(order.amount) || 0,
        commission: parseFloat(order.commission) || 0,
        status: parseInt(order.status) ?? 0,
        createTime: order.createTime || ''
      }))
    }
    
    // 更新趋势数据
    if (res.data?.trends) {
      trendsData.value = res.data.trends
    }
    
    // 初始化图表
    initChart()
  } catch (error: any) {
    console.error('加载看板数据失败:', error)
    ElMessage.error(error.message || '加载看板数据失败')
  } finally {
    loading.value = false
  }
}

// 提现表单
const withdrawForm = reactive({
  amount: 0,
  account: '',
  accountName: userStore.userInfo?.nickname || ''
})

const withdrawRules: FormRules = {
  amount: [
    { required: true, message: '请输入提现金额', trigger: 'blur' },
    {
      validator: (rule, value, callback) => {
        if (value <= 0) {
          callback(new Error('提现金额必须大于0'))
        } else if (value > stats.balance) {
          callback(new Error('提现金额不能大于可提现余额'))
        } else {
          callback()
        }
      },
      trigger: 'blur'
    }
  ],
  account: [{ required: true, message: '请输入提现账户', trigger: 'blur' }],
  accountName: [{ required: true, message: '请输入账户名称', trigger: 'blur' }]
}

const getStatusText = (status: number) => {
  const texts = ['待确认', '已确认', '配送中', '已完成', '已取消']
  return texts[status]
}

const getStatusType = (status: number) => {
  const types = ['warning', 'primary', 'info', 'success', 'danger']
  return types[status] as any
}

const showWithdrawDialog = () => {
  withdrawDialogVisible.value = true
  withdrawForm.amount = 0
  withdrawForm.account = ''
}

const handleWithdraw = async () => {
  if (!withdrawFormRef.value) return

  await withdrawFormRef.value.validate(async (valid) => {
    if (valid) {
      try {
        await ElMessageBox.confirm(
          `确认提现 ¥${withdrawForm.amount.toFixed(2)} 到账户 ${withdrawForm.account} 吗?`,
          '提现确认',
          {
            confirmButtonText: '确认',
            cancelButtonText: '取消',
            type: 'warning'
          }
        )
        
        // 调用提现接口
        await createWithdrawal({
          amount: withdrawForm.amount,
          accountNumber: withdrawForm.account,
          accountType: '银行卡',
          accountName: withdrawForm.accountName
        })
        
        ElMessage.success('提现申请已提交,请等待审核')
        withdrawDialogVisible.value = false
        
        // 重新加载数据
        loadDashboardData()
      } catch (error: any) {
        if (error !== 'cancel') {
          ElMessage.error(error.message || '提现申请失败')
        }
      }
    }
  })
}

// 初始化图表
const initChart = () => {
  if (!chartRef.value) return

  const myChart = echarts.init(chartRef.value)
  
  // 根据趋势类型获取数据
  const currentData = trendsData.value[trendType.value as '7' | '30']
  const dates = currentData.dates
  const orderData = currentData.orders
  const salesData = currentData.sales

  const option: EChartsOption = {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'cross'
      }
    },
    legend: {
      data: ['订单数', '销售额']
    },
    xAxis: {
      type: 'category',
      data: dates
    },
    yAxis: [
      {
        type: 'value',
        name: '订单数',
        position: 'left'
      },
      {
        type: 'value',
        name: '销售额',
        position: 'right'
      }
    ],
    series: [
      {
        name: '订单数',
        type: 'bar',
        data: orderData,
        itemStyle: {
          color: '#409eff'
        }
      },
      {
        name: '销售额',
        type: 'line',
        yAxisIndex: 1,
        data: salesData,
        smooth: true,
        itemStyle: {
          color: '#67c23a'
        },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(103, 194, 58, 0.3)' },
            { offset: 1, color: 'rgba(103, 194, 58, 0.05)' }
          ])
        }
      }
    ]
  }

  myChart.setOption(option)

  // 监听窗口大小变化
  window.addEventListener('resize', () => {
    myChart.resize()
  })
}

onMounted(() => {
  loadDashboardData()
})

watch(trendType, () => {
  initChart()
})
</script>

<style scoped>
.leader-center {
  padding: 20px;
}

.level-card .level-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.level-card .level-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.level-card .level-text {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.level-card .level-title {
  display: flex;
  align-items: center;
}

.stat-cards {
  margin-bottom: 20px;
}

.stat-card {
  position: relative;
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

.stat-icon {
  font-size: 48px;
  opacity: 0.8;
}

.balance-card {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
}

.balance-card .stat-title,
.balance-card .stat-value {
  color: #fff;
}

.withdraw-btn {
  position: absolute;
  bottom: 15px;
  right: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.performance-stats {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.performance-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background-color: #f5f7fa;
  border-radius: 8px;
}

.performance-item .label {
  font-size: 14px;
  color: #606266;
}

.performance-item .value {
  font-size: 16px;
  font-weight: bold;
  color: #303133;
}

.amount {
  color: #67c23a;
  font-weight: bold;
}

.commission {
  color: #409eff;
  font-weight: bold;
}

.balance-text {
  font-size: 20px;
  font-weight: bold;
  color: #67c23a;
}
</style>
