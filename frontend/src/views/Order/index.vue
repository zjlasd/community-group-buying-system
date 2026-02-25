<template>
  <div class="order-container">
    <el-card shadow="hover">
      <!-- 搜索区域 -->
      <el-form :inline="true" :model="searchForm" class="search-form">
        <el-form-item label="日期范围">
          <el-date-picker
            v-model="searchForm.dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            value-format="YYYY-MM-DD"
          />
        </el-form-item>

        <el-form-item label="订单状态">
          <el-select v-model="searchForm.status" placeholder="全部" clearable style="width: 150px">
            <el-option label="全部" value="" />
            <el-option label="待确认" :value="0" />
            <el-option label="已确认" :value="1" />
            <el-option label="配送中" :value="2" />
            <el-option label="已完成" :value="3" />
            <el-option label="已取消" :value="4" />
          </el-select>
        </el-form-item>

        <el-form-item label="团长">
          <el-select
            v-model="searchForm.leaderId"
            placeholder="全部"
            clearable
            style="width: 150px"
          >
            <el-option label="全部" value="" />
            <el-option label="张阿姨" value="1" />
            <el-option label="李叔叔" value="2" />
            <el-option label="王大姐" value="3" />
          </el-select>
        </el-form-item>

        <el-form-item label="关键词">
          <el-input
            v-model="searchForm.keyword"
            placeholder="订单号/用户姓名"
            clearable
            style="width: 200px"
          />
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
        <el-button type="success" @click="handleExport">
          <el-icon><Download /></el-icon>
          导出配送清单
        </el-button>
        <el-button type="primary" @click="handleExportOrders">
          <el-icon><Document /></el-icon>
          导出订单数据
        </el-button>
      </div>

      <!-- 订单列表 -->
      <el-table 
        :data="orderList" 
        v-loading="loading"
        style="width: 100%; margin-top: 20px" 
        stripe
      >
        <el-table-column prop="orderNo" label="订单号" width="180" />
        <el-table-column label="团长" width="100">
          <template #default="{ row }">
            {{ row.leader?.name || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="社区" width="120">
          <template #default="{ row }">
            {{ row.community?.name || '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="customerName" label="下单用户" width="100" />
        <el-table-column prop="customerPhone" label="联系电话" width="120" />
        <el-table-column label="订单金额" width="100">
          <template #default="{ row }">
            <span style="color: #67c23a">¥{{ parseFloat(row.totalAmount).toFixed(2) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="佣金" width="100">
          <template #default="{ row }">
            <span style="color: #409eff">¥{{ parseFloat(row.commissionAmount).toFixed(2) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)">
              {{ getStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="下单时间" width="170">
          <template #default="{ row }">
            {{ new Date(row.createdAt).toLocaleString() }}
          </template>
        </el-table-column>
        <el-table-column label="操作" fixed="right" width="150">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="handleView(row)">详情</el-button>
            <el-button link type="success" size="small" @click="handleEdit(row)">编辑</el-button>
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
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getOrderList, exportDeliveryList, type Order, type OrderListParams } from '@/api/order'

// 搜索表单
const searchForm = reactive<{
  dateRange: string[]
  status: string
  leaderId: string
  keyword: string
}>({
  dateRange: [],
  status: '',
  leaderId: '',
  keyword: ''
})

// 分页
const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0
})

// 加载状态
const loading = ref(false)

// 订单列表数据
const orderList = ref<Order[]>([])

// 状态映射
const STATUS_MAP = {
  'pending': { text: '待成团', type: 'warning', value: 0 },
  'confirmed': { text: '待配送', type: 'primary', value: 1 },
  'delivering': { text: '配送中', type: 'success', value: 2 },
  'pickup': { text: '待自提', type: 'info', value: 3 },
  'completed': { text: '已完成', type: 'success', value: 4 },
  'cancelled': { text: '已取消', type: 'danger', value: 5 }
}

const STATUS_VALUE_MAP: Record<string, string> = {
  '': '',
  '0': 'pending',
  '1': 'confirmed',
  '2': 'delivering',
  '3': 'completed',
  '4': 'cancelled'
}

// 获取订单列表
const fetchOrderList = async () => {
  try {
    loading.value = true
    
    const params: OrderListParams = {
      page: pagination.page,
      pageSize: pagination.pageSize,
      keyword: searchForm.keyword,
      status: STATUS_VALUE_MAP[searchForm.status] || '',
      leaderId: searchForm.leaderId
    }

    // 添加日期范围
    if (searchForm.dateRange && searchForm.dateRange.length === 2) {
      params.startDate = searchForm.dateRange[0]
      params.endDate = searchForm.dateRange[1]
    }

    const res = await getOrderList(params)
    orderList.value = res.data.list
    pagination.total = res.data.total

    loading.value = false
  } catch (err: any) {
    loading.value = false
    ElMessage.error(err.message || '获取订单列表失败')
  }
}

// 获取状态类型
const getStatusType = (status: string) => {
  return STATUS_MAP[status]?.type || 'info'
}

// 获取状态文本
const getStatusText = (status: string) => {
  return STATUS_MAP[status]?.text || '未知'
}

// 搜索
const handleSearch = () => {
  pagination.page = 1
  fetchOrderList()
}

// 重置
const handleReset = () => {
  searchForm.dateRange = []
  searchForm.status = ''
  searchForm.leaderId = ''
  searchForm.keyword = ''
  pagination.page = 1
  fetchOrderList()
}

// 导出配送清单
const handleExport = async () => {
  try {
    const { value: deliveryDate } = await ElMessageBox.prompt('请选择配送日期', '导出配送清单', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      inputType: 'date',
      inputValue: new Date().toISOString().split('T')[0]
    })

    if (!deliveryDate) {
      return
    }

    await exportDeliveryList({
      deliveryDate: deliveryDate as string,
      groupBy: 'leader'
    })

    ElMessage.success('配送清单导出成功')
  } catch (err: any) {
    if (err !== 'cancel') {
      ElMessage.error(err.message || '导出失败')
    }
  }
}

// 导出订单数据
const handleExportOrders = () => {
  ElMessage.warning('订单数据导出功能开发中...')
}

// 查看详情
const handleView = (row: Order) => {
  ElMessage.info(`查看订单: ${row.orderNo}`)
  // TODO: 打开详情弹窗
}

// 编辑
const handleEdit = (row: Order) => {
  ElMessage.info(`编辑订单: ${row.orderNo}`)
  // TODO: 打开编辑弹窗
}

// 监听分页变化
watch([() => pagination.page, () => pagination.pageSize], () => {
  fetchOrderList()
})

// 初始化
onMounted(() => {
  fetchOrderList()
})
</script>

<style scoped>
.order-container {
  width: 100%;
}

.search-form {
  margin-bottom: 20px;
}

.toolbar {
  margin-bottom: 10px;
}
</style>
