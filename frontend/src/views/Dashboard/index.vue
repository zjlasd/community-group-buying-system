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
import { ElMessage } from 'element-plus'
import * as echarts from 'echarts'
import type { EChartsOption } from 'echarts'
import { getAdminDashboard } from '@/api/dashboard'

// 统计数据
const stats = reactive({
  todayOrders: 0,
  todaySales: 0,
  pendingWithdrawals: 0,
  activeLeaders: 0
})

// 趋势类型
const trendType = ref('week')

// 图表引用
const orderChartRef = ref<HTMLDivElement>()
const salesChartRef = ref<HTMLDivElement>()

// 趋势数据
const trendsData = ref<{
  week: { dates: string[]; orders: number[]; sales: number[] }
  month: { dates: string[]; orders: number[]; sales: number[] }
}>({
  week: { dates: [], orders: [], sales: [] },
  month: { dates: [], orders: [], sales: [] }
})

// 销售额分类数据
const salesByCategory = ref<Array<{ name: string; value: number }>>([])

// 团长排行数据
const leaderRanking = ref<any[]>([])

// 加载看板数据
const loadDashboardData = async () => {
  try {
    const res = await getAdminDashboard()
    
    // 更新统计数据
    Object.assign(stats, res.data.stats)
    
    // 更新趋势数据
    trendsData.value = res.data.trends
    
    // 更新团长排行
    leaderRanking.value = res.data.leaderRanking
    
    // 更新销售额分类数据
    salesByCategory.value = res.data.salesByCategory || []
    
    // 初始化图表
    initOrderChart()
    initSalesChart()
  } catch (error: any) {
    ElMessage.error(error.message || '加载看板数据失败')
  }
}

// 初始化订单趋势图表
const initOrderChart = () => {
  if (!orderChartRef.value) return

  const chart = echarts.init(orderChartRef.value)
  const data = trendsData.value[trendType.value as 'week' | 'month']

  const option: EChartsOption = {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'cross'
      },
      formatter: (params: any) => {
        if (!params || !params.length) return ''
        const date = params[0].axisValue
        let result = `<div style="margin-bottom:4px">${date}</div>`
        params.forEach((item: any) => {
          if (item.seriesName === '订单数') {
            result += `<div>${item.marker}${item.seriesName}: ${item.value}笔</div>`
          } else {
            result += `<div>${item.marker}${item.seriesName}: ¥${(item.value / 10000).toFixed(2)}万</div>`
          }
        })
        return result
      }
    },
    legend: {
      data: ['订单数', '销售额'],
      top: 10
    },
    grid: {
      left: 60,
      right: 80,
      bottom: 60,
      top: 50,
      containLabel: false
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: data.dates,
      axisLabel: {
        rotate: 45,
        interval: 'auto',
        fontSize: 10,
        margin: 10
      }
    },
    yAxis: [
      {
        type: 'value',
        name: '订单数',
        position: 'left',
        nameTextStyle: {
          padding: [0, 0, 0, 0]
        },
        axisLabel: {
          formatter: '{value}'
        }
      },
      {
        type: 'value',
        name: '销售额(万元)',
        position: 'right',
        nameTextStyle: {
          padding: [0, 0, 0, 0]
        },
        axisLabel: {
          formatter: (value: number) => (value / 10000).toFixed(1)
        }
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
      left: '5%',
      top: 'middle',
      icon: 'circle',
      itemGap: 12,
      textStyle: {
        fontSize: 12
      }
    },
    series: [
      {
        name: '销售额',
        type: 'pie',
        radius: ['35%', '60%'],
        center: ['65%', '50%'],
        avoidLabelOverlap: true,
        itemStyle: {
          borderRadius: 8,
          borderColor: '#fff',
          borderWidth: 2
        },
        label: {
          show: false  // 默认不显示标签
        },
        labelLine: {
          show: false  // 默认不显示引导线
        },
        emphasis: {
          label: {
            show: true,
            fontSize: 14,
            fontWeight: 'bold'
          },
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)'
          }
        },
        data: salesByCategory.value.length > 0 
          ? salesByCategory.value 
          : [{ value: 0, name: '暂无数据' }]
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
  loadDashboardData()
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
