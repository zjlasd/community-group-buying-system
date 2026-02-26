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
            <el-option label="待成团" value="pending" />
            <el-option label="待配送" value="confirmed" />
            <el-option label="配送中" value="delivering" />
            <el-option label="待自提" value="pickup" />
            <el-option label="已完成" value="completed" />
            <el-option label="已取消" value="cancelled" />
          </el-select>
        </el-form-item>

        <el-form-item label="团长">
          <el-select
            v-model="searchForm.leaderId"
            placeholder="全部"
            clearable
            filterable
            style="width: 150px"
          >
            <el-option label="全部" value="" />
            <el-option
              v-for="leader in leaderList"
              :key="leader.id"
              :label="leader.name"
              :value="leader.id"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="关键词">
          <el-input
            v-model="searchForm.keyword"
            placeholder="订单号/客户姓名/手机号"
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
        <el-table-column prop="customerName" label="客户姓名" width="100" />
        <el-table-column prop="customerPhone" label="联系电话" width="120" />
        <el-table-column label="订单金额" width="100">
          <template #default="{ row }">
            <span style="color: #67c23a; font-weight: bold">¥{{ parseFloat(row.totalAmount).toFixed(2) }}</span>
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
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" fixed="right" width="180">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="handleView(row)">详情</el-button>
            <el-button 
              link 
              type="success" 
              size="small" 
              @click="handleUpdateStatus(row)"
              v-if="row.status !== 'completed' && row.status !== 'cancelled'"
            >
              更新状态
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

    <!-- 订单详情弹窗 -->
    <el-dialog
      v-model="detailDialogVisible"
      title="订单详情"
      width="800px"
      :close-on-click-modal="false"
    >
      <div v-if="currentOrder" class="order-detail">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="订单号">{{ currentOrder.orderNo }}</el-descriptions-item>
          <el-descriptions-item label="订单状态">
            <el-tag :type="getStatusType(currentOrder.status)">
              {{ getStatusText(currentOrder.status) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="团长">{{ currentOrder.leader?.name || '-' }}</el-descriptions-item>
          <el-descriptions-item label="社区">{{ currentOrder.community?.name || '-' }}</el-descriptions-item>
          <el-descriptions-item label="客户姓名">{{ currentOrder.customerName }}</el-descriptions-item>
          <el-descriptions-item label="联系电话">{{ currentOrder.customerPhone }}</el-descriptions-item>
          <el-descriptions-item label="订单金额">
            <span style="color: #67c23a; font-weight: bold">¥{{ parseFloat(String(currentOrder.totalAmount)).toFixed(2) }}</span>
          </el-descriptions-item>
          <el-descriptions-item label="佣金金额">
            <span style="color: #409eff">¥{{ parseFloat(String(currentOrder.commissionAmount)).toFixed(2) }}</span>
          </el-descriptions-item>
          <el-descriptions-item label="下单时间">{{ formatDate(currentOrder.createdAt) }}</el-descriptions-item>
          <el-descriptions-item label="确认时间">
            {{ currentOrder.confirmedAt ? formatDate(currentOrder.confirmedAt) : '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="完成时间">
            {{ currentOrder.completedAt ? formatDate(currentOrder.completedAt) : '-' }}
          </el-descriptions-item>
        </el-descriptions>

        <el-divider content-position="left">商品清单</el-divider>
        <el-table :data="currentOrder.items" border style="width: 100%">
          <el-table-column type="index" label="序号" width="60" />
          <el-table-column prop="productName" label="商品名称" />
          <el-table-column label="单价" width="100">
            <template #default="{ row }">
              ¥{{ parseFloat(row.productPrice).toFixed(2) }}
            </template>
          </el-table-column>
          <el-table-column prop="quantity" label="数量" width="80" />
          <el-table-column label="小计" width="120">
            <template #default="{ row }">
              <span style="color: #67c23a">¥{{ parseFloat(row.subtotal).toFixed(2) }}</span>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <template #footer>
        <el-button @click="detailDialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>

    <!-- 更新状态弹窗 -->
    <el-dialog
      v-model="statusDialogVisible"
      title="更新订单状态"
      width="400px"
      :close-on-click-modal="false"
    >
      <el-form :model="statusForm" label-width="100px">
        <el-form-item label="当前状态">
          <el-tag :type="getStatusType(statusForm.currentStatus)">
            {{ getStatusText(statusForm.currentStatus) }}
          </el-tag>
        </el-form-item>
        <el-form-item label="新状态">
          <el-select v-model="statusForm.newStatus" placeholder="请选择新状态" style="width: 100%">
            <el-option label="待成团" value="pending" />
            <el-option label="待配送" value="confirmed" />
            <el-option label="配送中" value="delivering" />
            <el-option label="待自提" value="pickup" />
            <el-option label="已完成" value="completed" />
            <el-option label="已取消" value="cancelled" />
          </el-select>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="statusDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmUpdateStatus">确定</el-button>
      </template>
    </el-dialog>

    <!-- 导出配送清单弹窗 -->
    <el-dialog
      v-model="exportDialogVisible"
      title="导出配送清单"
      width="500px"
      :close-on-click-modal="false"
    >
      <el-form :model="exportForm" label-width="100px">
        <el-form-item label="配送日期">
          <el-date-picker
            v-model="exportForm.deliveryDate"
            type="date"
            placeholder="选择配送日期"
            value-format="YYYY-MM-DD"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="汇总方式">
          <el-radio-group v-model="exportForm.groupBy">
            <el-radio value="leader">按团长</el-radio>
            <el-radio value="community">按社区</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="exportDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmExport" :loading="exportLoading">导出</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Search, Refresh, Download, Document } from '@element-plus/icons-vue'
import { 
  getOrderList, 
  getOrderDetail,
  updateOrderStatus,
  exportDeliveryList, 
  type Order, 
  type OrderListParams 
} from '@/api/order'
import { getLeaderList, type Leader } from '@/api/leader'

// 搜索表单
const searchForm = reactive<{
  dateRange: string[]
  status: string
  leaderId: string | number
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

// 团长列表
const leaderList = ref<Leader[]>([])

// 详情弹窗
const detailDialogVisible = ref(false)
const currentOrder = ref<Order | null>(null)

// 状态更新弹窗
const statusDialogVisible = ref(false)
const statusForm = reactive({
  orderId: 0,
  currentStatus: '',
  newStatus: ''
})

// 导出弹窗
const exportDialogVisible = ref(false)
const exportLoading = ref(false)
const exportForm = reactive({
  deliveryDate: new Date().toISOString().split('T')[0],
  groupBy: 'leader' as 'leader' | 'community'
})

// 状态映射
const STATUS_MAP = {
  'pending': { text: '待成团', type: 'warning' },
  'confirmed': { text: '待配送', type: 'primary' },
  'delivering': { text: '配送中', type: '' },
  'pickup': { text: '待自提', type: 'info' },
  'completed': { text: '已完成', type: 'success' },
  'cancelled': { text: '已取消', type: 'danger' }
}

// 获取团长列表
const fetchLeaderList = async () => {
  try {
    const res = await getLeaderList({ page: 1, pageSize: 1000 })
    leaderList.value = res.data.list
  } catch (err) {
    console.error('获取团长列表失败:', err)
  }
}

// 获取订单列表
const fetchOrderList = async () => {
  try {
    loading.value = true
    
    const params: OrderListParams = {
      page: pagination.page,
      pageSize: pagination.pageSize,
      keyword: searchForm.keyword,
      status: searchForm.status,
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
  } catch (err) {
    loading.value = false
    const error = err as { message?: string }
    ElMessage.error(error.message || '获取订单列表失败')
  }
}

// 格式化日期
const formatDate = (date: string) => {
  if (!date) return '-'
  return new Date(date).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

// 获取状态类型
const getStatusType = (status: string) => {
  return STATUS_MAP[status as keyof typeof STATUS_MAP]?.type || 'info'
}

// 获取状态文本
const getStatusText = (status: string) => {
  return STATUS_MAP[status as keyof typeof STATUS_MAP]?.text || '未知'
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

// 查看详情
const handleView = async (row: Order) => {
  try {
    const res = await getOrderDetail(row.id)
    currentOrder.value = res.data
    detailDialogVisible.value = true
  } catch (err) {
    const error = err as { message?: string }
    ElMessage.error(error.message || '获取订单详情失败')
  }
}

// 更新状态
const handleUpdateStatus = (row: Order) => {
  statusForm.orderId = row.id
  statusForm.currentStatus = row.status
  statusForm.newStatus = ''
  statusDialogVisible.value = true
}

// 确认更新状态
const confirmUpdateStatus = async () => {
  if (!statusForm.newStatus) {
    ElMessage.warning('请选择新状态')
    return
  }

  if (statusForm.newStatus === statusForm.currentStatus) {
    ElMessage.warning('新状态与当前状态相同')
    return
  }

  try {
    await updateOrderStatus(statusForm.orderId, statusForm.newStatus as Order['status'])
    ElMessage.success('状态更新成功')
    statusDialogVisible.value = false
    fetchOrderList()
  } catch (err) {
    const error = err as { message?: string }
    ElMessage.error(error.message || '状态更新失败')
  }
}

// 导出配送清单
const handleExport = () => {
  exportForm.deliveryDate = new Date().toISOString().split('T')[0]
  exportForm.groupBy = 'leader'
  exportDialogVisible.value = true
}

// 确认导出
const confirmExport = async () => {
  if (!exportForm.deliveryDate) {
    ElMessage.warning('请选择配送日期')
    return
  }

  try {
    exportLoading.value = true
    await exportDeliveryList({
      deliveryDate: exportForm.deliveryDate,
      groupBy: exportForm.groupBy
    })
    ElMessage.success('配送清单导出成功')
    exportDialogVisible.value = false
  } catch (err) {
    const error = err as { message?: string }
    ElMessage.error(error.message || '导出失败')
  } finally {
    exportLoading.value = false
  }
}

// 导出订单数据
const handleExportOrders = async () => {
  try {
    // 使用当前筛选条件导出订单
    const params: OrderListParams = {
      page: 1,
      pageSize: 10000, // 导出所有数据
      keyword: searchForm.keyword,
      status: searchForm.status,
      leaderId: searchForm.leaderId
    }

    if (searchForm.dateRange && searchForm.dateRange.length === 2) {
      params.startDate = searchForm.dateRange[0]
      params.endDate = searchForm.dateRange[1]
    }

    const res = await getOrderList(params)
    const data = res.data.list

    if (data.length === 0) {
      ElMessage.warning('没有数据可导出')
      return
    }

    // 使用xlsx库导出Excel
    const XLSX = await import('xlsx')
    
    const exportData = data.map(order => ({
      '订单号': order.orderNo,
      '团长': order.leader?.name || '-',
      '社区': order.community?.name || '-',
      '客户姓名': order.customerName,
      '联系电话': order.customerPhone,
      '订单金额': `¥${parseFloat(String(order.totalAmount)).toFixed(2)}`,
      '佣金金额': `¥${parseFloat(String(order.commissionAmount)).toFixed(2)}`,
      '订单状态': getStatusText(order.status),
      '下单时间': formatDate(order.createdAt),
      '确认时间': order.confirmedAt ? formatDate(order.confirmedAt) : '-',
      '完成时间': order.completedAt ? formatDate(order.completedAt) : '-'
    }))
    
    const ws = XLSX.utils.json_to_sheet(exportData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '订单数据')
    
    const fileName = `订单数据_${new Date().toISOString().split('T')[0]}.xlsx`
    XLSX.writeFile(wb, fileName)

    ElMessage.success('订单数据导出成功')
  } catch (err) {
    const error = err as { message?: string }
    ElMessage.error(error.message || '导出失败')
  }
}

// 监听分页变化
watch([() => pagination.page, () => pagination.pageSize], () => {
  fetchOrderList()
})

// 初始化
onMounted(() => {
  fetchLeaderList()
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
