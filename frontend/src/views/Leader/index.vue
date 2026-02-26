<template>
  <div class="leader-container">
    <el-card shadow="hover">
      <!-- 搜索栏 -->
      <el-form :inline="true" :model="searchForm" class="search-form">
        <el-form-item label="团长姓名">
          <el-input v-model="searchForm.keyword" placeholder="请输入姓名" clearable />
        </el-form-item>

        <el-form-item label="所属社区">
          <el-select v-model="searchForm.communityId" placeholder="全部" clearable>
            <el-option
              v-for="community in communityList"
              :key="community.id"
              :label="community.name"
              :value="community.id"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="状态">
          <el-select v-model="searchForm.status" placeholder="全部" clearable>
            <el-option label="全部" value="" />
            <el-option label="启用" :value="1" />
            <el-option label="禁用" :value="0" />
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

      <!-- 操作按钮 -->
      <div class="toolbar">
        <el-button type="primary" @click="handleAdd">
          <el-icon><Plus /></el-icon>
          新增团长
        </el-button>
      </div>

      <!-- 团长列表 -->
      <el-table :data="leaderList" v-loading="loading" style="width: 100%; margin-top: 20px" stripe>
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="name" label="姓名" width="100" />
        <el-table-column prop="phone" label="联系电话" width="130" />
        <el-table-column label="所属社区" width="150">
          <template #default="{ row }">
            {{ row.community?.name || '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="commissionRate" label="佣金比例" width="100">
          <template #default="{ row }">
            <el-tag type="success">{{ parseFloat(row.commissionRate).toFixed(1) }}%</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="totalOrders" label="累计订单" width="100" sortable />
        <el-table-column label="累计佣金（元）" width="150" sortable>
          <template #default="{ row }">
            <span style="color: #409eff">¥{{ parseFloat(row.totalCommission || 0).toFixed(2) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="账户余额（元）" width="150">
          <template #default="{ row }">
            <span style="color: #67c23a">¥{{ parseFloat(row.balance || 0).toFixed(2) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 1 ? 'success' : 'danger'">
              {{ row.status === 1 ? '启用' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" fixed="right" width="250">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="handleView(row)">详情</el-button>
            <el-button link type="success" size="small" @click="handleEdit(row)">编辑</el-button>
            <el-button
              link
              :type="row.status === 1 ? 'warning' : 'success'"
              size="small"
              @click="handleToggleStatus(row)"
            >
              {{ row.status === 1 ? '禁用' : '启用' }}
            </el-button>
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
      />
    </el-card>

    <!-- 新增/编辑对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="600px"
      @close="handleDialogClose"
    >
      <el-form :model="form" :rules="rules" ref="formRef" label-width="100px">
        <!-- 新增时需要用户名和密码 -->
        <template v-if="!form.id">
          <el-form-item label="用户名" prop="username">
            <el-input v-model="form.username" placeholder="请输入登录用户名" />
          </el-form-item>

          <el-form-item label="登录密码" prop="password">
            <el-input v-model="form.password" type="password" placeholder="请输入登录密码" show-password />
          </el-form-item>
        </template>

        <el-form-item label="姓名" prop="name">
          <el-input v-model="form.name" placeholder="请输入团长姓名" />
        </el-form-item>

        <el-form-item label="联系电话" prop="phone">
          <el-input v-model="form.phone" placeholder="请输入联系电话" />
        </el-form-item>

        <el-form-item label="所属社区" prop="communityId">
          <el-select v-model="form.communityId" placeholder="请选择社区" style="width: 100%" clearable>
            <el-option
              v-for="community in communityList"
              :key="community.id"
              :label="community.name"
              :value="community.id"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="佣金比例" prop="commissionRate">
          <el-input-number
            v-model="form.commissionRate"
            :min="0"
            :max="100"
            :precision="2"
            :step="0.5"
            style="width: 200px"
          />
          <span style="margin-left: 10px; color: #909399">%</span>
        </el-form-item>

        <el-form-item label="状态" prop="status" v-if="form.id">
          <el-radio-group v-model="form.status">
            <el-radio :value="1">启用</el-radio>
            <el-radio :value="0">禁用</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit" :loading="submitLoading">确定</el-button>
      </template>
    </el-dialog>

    <!-- 详情对话框 -->
    <el-dialog v-model="detailDialogVisible" title="团长详情" width="800px">
      <el-descriptions :column="2" border v-if="currentLeader">
        <el-descriptions-item label="姓名">{{ currentLeader.name }}</el-descriptions-item>
        <el-descriptions-item label="联系电话">{{ currentLeader.phone }}</el-descriptions-item>
        <el-descriptions-item label="所属社区">
          {{ currentLeader.community?.name || '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="佣金比例">
          {{ parseFloat(currentLeader.commissionRate.toString()).toFixed(1) }}%
        </el-descriptions-item>
        <el-descriptions-item label="累计订单">{{ currentLeader.totalOrders }}</el-descriptions-item>
        <el-descriptions-item label="累计佣金">
          ¥{{ parseFloat((currentLeader.totalCommission || 0).toString()).toFixed(2) }}
        </el-descriptions-item>
        <el-descriptions-item label="账户余额">
          ¥{{ parseFloat((currentLeader.balance || 0).toString()).toFixed(2) }}
        </el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag :type="currentLeader.status === 1 ? 'success' : 'danger'">
            {{ currentLeader.status === 1 ? '启用' : '禁用' }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="登录账号">
          {{ currentLeader.user?.username || '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="注册时间">
          {{ currentLeader.createdAt ? new Date(currentLeader.createdAt).toLocaleString() : '-' }}
        </el-descriptions-item>
      </el-descriptions>

      <el-divider>近30天订单趋势</el-divider>
      <div v-if="leaderStats" style="height: 300px">
        <div ref="chartRef" style="width: 100%; height: 100%"></div>
      </div>
      <el-empty v-else description="暂无统计数据" />
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, watch, nextTick } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { 
  getLeaderList, 
  createLeader, 
  updateLeader, 
  getLeaderById,
  getLeaderStats,
  type Leader,
  type LeaderStats
} from '@/api/leader'
import { getCommunityList } from '@/api/community'
import * as echarts from 'echarts'

// 搜索表单
const searchForm = reactive({
  keyword: '',
  communityId: '',
  status: ''
})

// 分页
const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0
})

// 加载状态
const loading = ref(false)

// 团长列表数据
const leaderList = ref<Leader[]>([])

// 获取团长列表
const fetchLeaders = async () => {
  try {
    loading.value = true
    const res = await getLeaderList({
      page: pagination.page,
      pageSize: pagination.pageSize,
      keyword: searchForm.keyword,
      communityId: searchForm.communityId,
      status: searchForm.status
    })
    leaderList.value = res.data.list
    pagination.total = res.data.total
  } catch (error: any) {
    ElMessage.error(error.message || '获取团长列表失败')
  } finally {
    loading.value = false
  }
}

// 监听分页变化
watch([() => pagination.page, () => pagination.pageSize], () => {
  fetchLeaders()
})

// 页面加载时获取数据
onMounted(() => {
  fetchLeaders()
  fetchCommunities()
})

// 社区列表
const communityList = ref<any[]>([])

// 获取社区列表
const fetchCommunities = async () => {
  try {
    const res = await getCommunityList({ page: 1, pageSize: 100 })
    communityList.value = res.data.list
  } catch (error: any) {
    console.error('获取社区列表失败:', error)
  }
}

// 对话框
const dialogVisible = ref(false)
const dialogTitle = ref('新增团长')
const formRef = ref<FormInstance>()
const submitLoading = ref(false)

const form = reactive({
  id: 0,
  username: '',
  password: '',
  name: '',
  phone: '',
  communityId: null as number | null,
  commissionRate: 12.0,
  status: 1
})

const rules: FormRules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码长度不能少于6位', trigger: 'blur' }
  ],
  name: [{ required: true, message: '请输入团长姓名', trigger: 'blur' }],
  phone: [
    { required: true, message: '请输入联系电话', trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号', trigger: 'blur' }
  ],
  commissionRate: [{ required: true, message: '请输入佣金比例', trigger: 'blur' }]
}

// 详情对话框
const detailDialogVisible = ref(false)
const currentLeader = ref<Leader | null>(null)
const leaderStats = ref<LeaderStats | null>(null)
const chartRef = ref<HTMLElement>()
let chartInstance: echarts.ECharts | null = null

// 查询
const handleSearch = () => {
  pagination.page = 1
  fetchLeaders()
}

// 重置
const handleReset = () => {
  searchForm.keyword = ''
  searchForm.communityId = ''
  searchForm.status = ''
  pagination.page = 1
  fetchLeaders()
}

// 新增
const handleAdd = () => {
  dialogTitle.value = '新增团长'
  Object.assign(form, {
    id: 0,
    username: '',
    password: '',
    name: '',
    phone: '',
    communityId: null,
    commissionRate: 12.0,
    status: 1
  })
  dialogVisible.value = true
}

// 查看详情
const handleView = async (row: Leader) => {
  try {
    currentLeader.value = null
    leaderStats.value = null
    detailDialogVisible.value = true

    // 获取详情
    const detailRes = await getLeaderById(row.id)
    currentLeader.value = detailRes.data

    // 获取统计数据
    const statsRes = await getLeaderStats(row.id)
    leaderStats.value = statsRes.data

    // 渲染图表
    await nextTick()
    renderChart()
  } catch (error: any) {
    ElMessage.error(error.message || '获取团长详情失败')
  }
}

// 编辑
const handleEdit = (row: Leader) => {
  dialogTitle.value = '编辑团长'
  Object.assign(form, {
    id: row.id,
    username: '',
    password: '',
    name: row.name,
    phone: row.phone,
    communityId: row.communityId,
    commissionRate: parseFloat(row.commissionRate.toString()),
    status: row.status
  })
  dialogVisible.value = true
}

// 切换状态
const handleToggleStatus = async (row: Leader) => {
  const action = row.status === 1 ? '禁用' : '启用'
  try {
    await ElMessageBox.confirm(`确定要${action}团长 ${row.name} 吗?`, '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    
    await updateLeader(row.id, {
      status: row.status === 1 ? 0 : 1
    })
    
    ElMessage.success(`${action}成功`)
    fetchLeaders()
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || `${action}失败`)
    }
  }
}

// 提交表单
const handleSubmit = async () => {
  if (!formRef.value) return

  await formRef.value.validate(async (valid) => {
    if (valid) {
      try {
        submitLoading.value = true
        const isEdit = form.id > 0

        if (isEdit) {
          // 编辑团长
          await updateLeader(form.id, {
            name: form.name,
            phone: form.phone,
            communityId: form.communityId,
            commissionRate: form.commissionRate,
            status: form.status
          })
        } else {
          // 新增团长
          await createLeader({
            username: form.username,
            password: form.password,
            name: form.name,
            phone: form.phone,
            communityId: form.communityId || undefined,
            commissionRate: form.commissionRate
          })
        }

        ElMessage.success(dialogTitle.value + '成功')
        dialogVisible.value = false
        fetchLeaders()
      } catch (error: any) {
        ElMessage.error(error.message || (form.id ? '编辑' : '新增') + '失败')
      } finally {
        submitLoading.value = false
      }
    }
  })
}

// 关闭对话框
const handleDialogClose = () => {
  formRef.value?.resetFields()
  Object.assign(form, {
    id: 0,
    username: '',
    password: '',
    name: '',
    phone: '',
    communityId: null,
    commissionRate: 12.0,
    status: 1
  })
}

// 渲染图表
const renderChart = () => {
  if (!chartRef.value || !leaderStats.value) return

  if (!chartInstance) {
    chartInstance = echarts.init(chartRef.value)
  }

  const dates = leaderStats.value.recentOrders.map(item => item.date)
  const counts = leaderStats.value.recentOrders.map(item => item.count)
  const amounts = leaderStats.value.recentOrders.map(item => parseFloat(item.amount.toString()))

  const option = {
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
      data: dates,
      axisLabel: {
        rotate: 45
      }
    },
    yAxis: [
      {
        type: 'value',
        name: '订单数',
        position: 'left'
      },
      {
        type: 'value',
        name: '销售额(元)',
        position: 'right'
      }
    ],
    series: [
      {
        name: '订单数',
        type: 'line',
        data: counts,
        smooth: true,
        itemStyle: {
          color: '#409EFF'
        }
      },
      {
        name: '销售额',
        type: 'bar',
        yAxisIndex: 1,
        data: amounts,
        itemStyle: {
          color: '#67C23A'
        }
      }
    ]
  }

  chartInstance.setOption(option)
}
</script>

<style scoped>
.leader-container {
  width: 100%;
}

.search-form {
  margin-bottom: 20px;
}

.toolbar {
  margin-bottom: 10px;
}
</style>
