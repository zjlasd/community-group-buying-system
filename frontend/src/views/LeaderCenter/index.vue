<template>
  <div class="leader-center">
    <!-- 佣金统计卡片 -->
    <el-row :gutter="20" class="stat-cards">
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-content">
            <div class="stat-info">
              <div class="stat-title">今日收益</div>
              <div class="stat-value">¥{{ stats.todayIncome.toFixed(2) }}</div>
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
              <div class="stat-value">¥{{ stats.monthIncome.toFixed(2) }}</div>
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
              <div class="stat-value">¥{{ stats.totalIncome.toFixed(2) }}</div>
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
              <div class="stat-value">¥{{ stats.balance.toFixed(2) }}</div>
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
              <span class="value">{{ stats.todayOrders }} 单</span>
            </div>
            <div class="performance-item">
              <span class="label">本月订单</span>
              <span class="value">{{ stats.monthOrders }} 单</span>
            </div>
            <div class="performance-item">
              <span class="label">累计订单</span>
              <span class="value">{{ stats.totalOrders }} 单</span>
            </div>
            <div class="performance-item">
              <span class="label">佣金比例</span>
              <span class="value">{{ (stats.commissionRate * 100).toFixed(0) }}%</span>
            </div>
            <div class="performance-item">
              <span class="label">服务社区</span>
              <span class="value">{{ stats.community }}</span>
            </div>
            <div class="performance-item">
              <span class="label">客户数量</span>
              <span class="value">{{ stats.customers }} 人</span>
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
            <span class="amount">¥{{ row.amount.toFixed(2) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="commission" label="佣金" width="120">
          <template #default="{ row }">
            <span class="commission">¥{{ row.commission.toFixed(2) }}</span>
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
          <span class="balance-text">¥{{ stats.balance.toFixed(2) }}</span>
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

const userStore = useUserStore()
const chartRef = ref<HTMLElement>()
const trendType = ref('7')
const withdrawDialogVisible = ref(false)
const withdrawFormRef = ref<FormInstance>()

// 统计数据(模拟团长个人数据)
const stats = reactive({
  todayIncome: 186.5,
  monthIncome: 3280.0,
  totalIncome: 15680.5,
  balance: 8500.0,
  todayOrders: 15,
  monthOrders: 128,
  totalOrders: 856,
  commissionRate: userStore.userInfo?.commissionRate || 0.12,
  community: '阳光小区',
  customers: 156
})

// 最近订单(仅显示团长自己的订单)
const recentOrders = ref([
  {
    orderNo: 'O202402240001',
    customerName: '王女士',
    amount: 158.5,
    commission: 19.02,
    status: 3,
    createTime: '2024-02-24 10:30:25'
  },
  {
    orderNo: 'O202402240002',
    customerName: '李先生',
    amount: 268.0,
    commission: 32.16,
    status: 3,
    createTime: '2024-02-24 09:15:18'
  },
  {
    orderNo: 'O202402230015',
    customerName: '赵女士',
    amount: 198.5,
    commission: 23.82,
    status: 2,
    createTime: '2024-02-23 16:45:33'
  },
  {
    orderNo: 'O202402230012',
    customerName: '刘阿姨',
    amount: 326.0,
    commission: 39.12,
    status: 2,
    createTime: '2024-02-23 14:20:10'
  },
  {
    orderNo: 'O202402220025',
    customerName: '陈女士',
    amount: 185.0,
    commission: 22.2,
    status: 1,
    createTime: '2024-02-22 11:30:50'
  }
])

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

  await withdrawFormRef.value.validate((valid) => {
    if (valid) {
      ElMessageBox.confirm(
        `确认提现 ¥${withdrawForm.amount.toFixed(2)} 到账户 ${withdrawForm.account} 吗?`,
        '提现确认',
        {
          confirmButtonText: '确认',
          cancelButtonText: '取消',
          type: 'warning'
        }
      )
        .then(() => {
          ElMessage.success('提现申请已提交,请等待审核')
          withdrawDialogVisible.value = false
        })
        .catch(() => {
          ElMessage.info('已取消提现')
        })
    }
  })
}

// 初始化图表
const initChart = () => {
  if (!chartRef.value) return

  const myChart = echarts.init(chartRef.value)
  
  const dates = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
  const orderData = [12, 18, 15, 20, 16, 22, 15]
  const salesData = [1580, 2350, 1980, 2680, 2150, 2980, 1865]

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
  initChart()
})

watch(trendType, () => {
  initChart()
})
</script>

<style scoped>
.leader-center {
  padding: 20px;
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
