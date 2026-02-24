<template>
  <div class="dashboard-container">
    <!-- 统计卡片 -->
    <el-row :gutter="20" class="stat-cards">
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-content">
            <div class="stat-info">
              <div class="stat-title">今日订单</div>
              <div class="stat-value">{{ stats.todayOrders }}</div>
            </div>
            <el-icon class="stat-icon" color="#409eff"><ShoppingCart /></el-icon>
          </div>
        </el-card>
      </el-col>

      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-content">
            <div class="stat-info">
              <div class="stat-title">今日销售额</div>
              <div class="stat-value">¥{{ stats.todaySales.toFixed(2) }}</div>
            </div>
            <el-icon class="stat-icon" color="#67c23a"><Money /></el-icon>
          </div>
        </el-card>
      </el-col>

      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-content">
            <div class="stat-info">
              <div class="stat-title">待审核提现</div>
              <div class="stat-value">{{ stats.pendingWithdrawals }}</div>
            </div>
            <el-icon class="stat-icon" color="#e6a23c"><Wallet /></el-icon>
          </div>
        </el-card>
      </el-col>

      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-content">
            <div class="stat-info">
              <div class="stat-title">活跃团长</div>
              <div class="stat-value">{{ stats.activeLeaders }}</div>
            </div>
            <el-icon class="stat-icon" color="#f56c6c"><User /></el-icon>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 图表区域 -->
    <el-row :gutter="20" style="margin-top: 20px">
      <el-col :span="16">
        <el-card shadow="hover">
          <template #header>
            <div class="card-header">
              <span>订单趋势</span>
              <el-radio-group v-model="trendType" size="small">
                <el-radio-button value="week">近7天</el-radio-button>
                <el-radio-button value="month">近30天</el-radio-button>
              </el-radio-group>
            </div>
          </template>
          <div ref="orderChartRef" style="height: 350px"></div>
        </el-card>
      </el-col>

      <el-col :span="8">
        <el-card shadow="hover">
          <template #header>
            <span>销售额统计</span>
          </template>
          <div ref="salesChartRef" style="height: 350px"></div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 团长业绩排行 -->
    <el-card shadow="hover" style="margin-top: 20px">
      <template #header>
        <span>团长业绩排行榜（本月）</span>
      </template>
      <el-table :data="leaderRanking" style="width: 100%">
        <el-table-column type="index" label="排名" width="80" />
        <el-table-column prop="name" label="团长姓名" width="150" />
        <el-table-column prop="community" label="所属社区" width="150" />
        <el-table-column prop="orders" label="订单数" sortable width="120" />
        <el-table-column prop="sales" label="销售额（元）" sortable width="150">
          <template #default="{ row }">
            <span style="color: #67c23a">¥{{ row.sales.toFixed(2) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="commission" label="佣金收入（元）" sortable>
          <template #default="{ row }">
            <span style="color: #409eff">¥{{ row.commission.toFixed(2) }}</span>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, watch } from 'vue'
import * as echarts from 'echarts'
import type { EChartsOption } from 'echarts'

// 统计数据
const stats = reactive({
  todayOrders: 128,
  todaySales: 15680.5,
  pendingWithdrawals: 12,
  activeLeaders: 48
})

// 趋势类型
const trendType = ref('week')

// 图表引用
const orderChartRef = ref<HTMLDivElement>()
const salesChartRef = ref<HTMLDivElement>()

// 模拟订单趋势数据
const getOrderTrendData = (type: string) => {
  if (type === 'week') {
    return {
      dates: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
      orders: [85, 92, 78, 105, 112, 95, 128],
      sales: [8500, 9200, 7800, 10500, 11200, 9500, 12800]
    }
  } else {
    const dates = Array.from({ length: 30 }, (_, i) => `${i + 1}日`)
    const orders = Array.from({ length: 30 }, () => Math.floor(Math.random() * 50) + 70)
    const sales = orders.map((v) => v * 100 + Math.random() * 2000)
    return { dates, orders, sales }
  }
}

// 团长排行数据
const leaderRanking = ref([
  { name: '张阿姨', community: '阳光小区', orders: 156, sales: 18500, commission: 2220 },
  { name: '李叔叔', community: '幸福小区', orders: 142, sales: 16800, commission: 1680 },
  { name: '王大姐', community: '和谐社区', orders: 128, sales: 15200, commission: 1824 },
  { name: '赵师傅', community: '美好家园', orders: 115, sales: 13800, commission: 1518 },
  { name: '刘阿姨', community: '阳光小区', orders: 98, sales: 11200, commission: 1344 }
])

// 初始化订单趋势图表
const initOrderChart = () => {
  if (!orderChartRef.value) return

  const chart = echarts.init(orderChartRef.value)
  const data = getOrderTrendData(trendType.value)

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
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: data.dates
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
        type: 'line',
        smooth: true,
        data: data.orders,
        itemStyle: { color: '#409eff' },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(64, 158, 255, 0.3)' },
            { offset: 1, color: 'rgba(64, 158, 255, 0.05)' }
          ])
        }
      },
      {
        name: '销售额',
        type: 'line',
        smooth: true,
        yAxisIndex: 1,
        data: data.sales,
        itemStyle: { color: '#67c23a' }
      }
    ]
  }

  chart.setOption(option)
  window.addEventListener('resize', () => chart.resize())
}

// 初始化销售额统计图表
const initSalesChart = () => {
  if (!salesChartRef.value) return

  const chart = echarts.init(salesChartRef.value)

  const option: EChartsOption = {
    tooltip: {
      trigger: 'item',
      formatter: '{b}: ¥{c} ({d}%)'
    },
    legend: {
      orient: 'vertical',
      left: 'left'
    },
    series: [
      {
        name: '销售额',
        type: 'pie',
        radius: ['40%', '70%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 10,
          borderColor: '#fff',
          borderWidth: 2
        },
        label: {
          show: true,
          formatter: '{b}\n¥{c}'
        },
        emphasis: {
          label: {
            show: true,
            fontSize: 16,
            fontWeight: 'bold'
          }
        },
        data: [
          { value: 45600, name: '水果生鲜' },
          { value: 28500, name: '粮油调味' },
          { value: 18200, name: '休闲零食' },
          { value: 15800, name: '日用百货' },
          { value: 12400, name: '其他' }
        ]
      }
    ]
  }

  chart.setOption(option)
  window.addEventListener('resize', () => chart.resize())
}

// 监听趋势类型变化
watch(trendType, () => {
  initOrderChart()
})

onMounted(() => {
  initOrderChart()
  initSalesChart()
})
</script>

<style scoped>
.dashboard-container {
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

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>
