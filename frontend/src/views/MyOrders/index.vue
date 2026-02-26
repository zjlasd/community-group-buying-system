<template>
  <div class="my-orders">
    <el-card shadow="hover">
      <template #header>
        <div class="card-header">
          <span>我的订单</span>
        </div>
      </template>

      <!-- 搜索栏 -->
      <el-form :inline="true" :model="searchForm" class="search-form">
        <el-form-item label="订单状态">
          <el-select v-model="searchForm.status" placeholder="全部状态" clearable style="width: 150px">
            <el-option label="待确认" :value="0" />
            <el-option label="已确认" :value="1" />
            <el-option label="配送中" :value="2" />
            <el-option label="已完成" :value="3" />
            <el-option label="已取消" :value="4" />
          </el-select>
        </el-form-item>
        <el-form-item label="时间范围">
          <el-date-picker
            v-model="searchForm.dateRange"
            type="daterange"
            range-separator="-"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            style="width: 240px"
          />
        </el-form-item>
        <el-form-item label="关键词">
          <el-input
            v-model="searchForm.keyword"
            placeholder="订单号/客户姓名"
            clearable
            style="width: 200px"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">
            <el-icon><Search /></el-icon>
            搜索
          </el-button>
          <el-button @click="handleReset">
            <el-icon><Refresh /></el-icon>
            重置
          </el-button>
        </el-form-item>
      </el-form>

      <!-- 订单列表 -->
      <el-table :data="orderList" style="width: 100%; margin-top: 20px" v-loading="loading">
        <el-table-column prop="orderNo" label="订单号" width="180" fixed />
        <el-table-column prop="customerName" label="客户姓名" width="120" />
        <el-table-column prop="customerPhone" label="联系电话" width="130" />
        <el-table-column label="订单金额" width="120">
          <template #default="{ row }">
            <span class="amount">¥{{ parseFloat(row.totalAmount).toFixed(2) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="我的佣金" width="120">
          <template #default="{ row }">
            <span class="commission">¥{{ parseFloat(row.commissionAmount).toFixed(2) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="订单状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)">
              {{ getStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="下单时间" width="180">
          <template #default="{ row }">
            {{ new Date(row.createdAt).toLocaleString() }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="250" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="viewDetail(row)">
              <el-icon><View /></el-icon>
              查看详情
            </el-button>
            <el-button
              v-if="row.status === 'delivering'"
              type="success"
              link
              @click="confirmReceived(row)"
            >
              <el-icon><Check /></el-icon>
              确认收货
            </el-button>
            <el-button
              v-if="row.status === 'pickup'"
              type="warning"
              link
              @click="verifyOrder(row)"
            >
              <el-icon><CircleCheck /></el-icon>
              订单核销
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <el-pagination
        v-model:current-page="pagination.page"
        v-model:page-size="pagination.size"
        :total="pagination.total"
        :page-sizes="[10, 20, 50, 100]"
        layout="total, sizes, prev, pager, next, jumper"
        style="margin-top: 20px; justify-content: flex-end"
        @size-change="handleSearch"
        @current-change="handleSearch"
      />
    </el-card>

    <!-- 订单详情对话框 -->
    <el-dialog v-model="detailDialogVisible" title="订单详情" width="700px">
      <el-descriptions :column="2" border v-if="currentOrder">
        <el-descriptions-item label="订单号">{{ currentOrder.orderNo }}</el-descriptions-item>
        <el-descriptions-item label="订单状态">
          <el-tag :type="getStatusType(currentOrder.status)">
            {{ getStatusText(currentOrder.status) }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="客户姓名">{{ currentOrder.customerName }}</el-descriptions-item>
        <el-descriptions-item label="联系电话">{{ currentOrder.customerPhone }}</el-descriptions-item>
        <el-descriptions-item label="订单金额">
          ¥{{ parseFloat(currentOrder.totalAmount).toFixed(2) }}
        </el-descriptions-item>
        <el-descriptions-item label="我的佣金">
          ¥{{ parseFloat(currentOrder.commissionAmount).toFixed(2) }}
        </el-descriptions-item>
        <el-descriptions-item label="下单时间">
          {{ new Date(currentOrder.createdAt).toLocaleString() }}
        </el-descriptions-item>
        <el-descriptions-item label="核销状态">
          <el-tag :type="currentOrder.status === 'completed' ? 'success' : 'info'">
            {{ currentOrder.status === 'completed' ? '已核销' : '待核销' }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="社区" :span="2">
          {{ currentOrder.community?.name || '-' }} {{ currentOrder.community?.address || '' }}
        </el-descriptions-item>
      </el-descriptions>
      
      <el-divider>商品明细</el-divider>
      <el-table :data="currentOrder?.items" style="width: 100%">
        <el-table-column prop="productName" label="商品名称" />
        <el-table-column label="单价" width="100">
          <template #default="{ row }">¥{{ parseFloat(row.productPrice).toFixed(2) }}</template>
        </el-table-column>
        <el-table-column prop="quantity" label="数量" width="80" />
        <el-table-column label="小计" width="100">
          <template #default="{ row }">¥{{ parseFloat(row.subtotal).toFixed(2) }}</template>
        </el-table-column>
      </el-table>
    </el-dialog>

    <!-- 订单核销对话框 -->
    <el-dialog v-model="verifyDialogVisible" title="订单核销" width="500px">
      <el-form :model="verifyForm" label-width="100px">
        <el-form-item label="订单号">
          <el-input v-model="verifyForm.orderNo" disabled />
        </el-form-item>
        <el-form-item label="客户姓名">
          <el-input v-model="verifyForm.customerName" disabled />
        </el-form-item>
        <el-form-item label="订单金额">
          <el-input v-model="verifyForm.amount" disabled>
            <template #prepend>¥</template>
          </el-input>
        </el-form-item>
        <el-form-item label="预计佣金">
          <el-input v-model="verifyForm.commission" disabled>
            <template #prepend>¥</template>
          </el-input>
        </el-form-item>
        <el-form-item label="核销码">
          <el-input
            v-model="verifyForm.code"
            placeholder="请输入6位核销码"
            maxlength="6"
            clearable
          >
            <template #append>
              <el-button @click="scanCode">扫码</el-button>
            </template>
          </el-input>
          <div style="margin-top: 8px; font-size: 12px; color: #909399">
            提示：核销码为订单号后6位，例如：{{ verifyForm.orderNo?.slice(-6) }}
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="verifyDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmVerify">确认核销</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getOrderList, getOrderDetail, updateOrderStatus, type Order } from '@/api/order'

const loading = ref(false)
const detailDialogVisible = ref(false)
const verifyDialogVisible = ref(false)
const currentOrder = ref<Order | null>(null)

const verifyForm = reactive({
  orderNo: '',
  customerName: '',
  amount: '',
  commission: '',
  code: ''
})

const searchForm = reactive({
  status: undefined as number | undefined,
  dateRange: [] as any[],
  keyword: ''
})

const pagination = reactive({
  page: 1,
  size: 10,
  total: 0
})

// 订单列表
const orderList = ref<Order[]>([])

// 状态映射
const STATUS_MAP = {
  'pending': { text: '待成团', type: 'warning', value: 0 },
  'confirmed': { text: '待配送', type: 'primary', value: 1 },
  'delivering': { text: '配送中', type: 'info', value: 2 },
  'pickup': { text: '待自提', type: 'info', value: 3 },
  'completed': { text: '已完成', type: 'success', value: 4 },
  'cancelled': { text: '已取消', type: 'danger', value: 5 }
}

const STATUS_VALUE_MAP: Record<string, string> = {
  '': '',
  '0': 'pending',
  '1': 'confirmed',
  '2': 'delivering',
  '3': 'pickup',
  '4': 'completed'
}

// 获取订单列表
const fetchOrderList = async () => {
  try {
    loading.value = true

    const params: any = {
      page: pagination.page,
      pageSize: pagination.size,
      keyword: searchForm.keyword
    }

    // 状态筛选
    if (searchForm.status !== undefined) {
      params.status = STATUS_VALUE_MAP[searchForm.status.toString()] || ''
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

const getStatusText = (status: string) => {
  return STATUS_MAP[status]?.text || '未知'
}

const getStatusType = (status: string) => {
  return STATUS_MAP[status]?.type || 'info'
}

const handleSearch = () => {
  pagination.page = 1
  fetchOrderList()
}

const handleReset = () => {
  searchForm.status = undefined
  searchForm.dateRange = []
  searchForm.keyword = ''
  pagination.page = 1
  fetchOrderList()
}

const viewDetail = async (row: Order) => {
  try {
    loading.value = true
    // 调用详情接口获取完整订单信息(包括商品明细)
    const res = await getOrderDetail(row.id)
    currentOrder.value = res.data
    detailDialogVisible.value = true
    loading.value = false
  } catch (err: any) {
    loading.value = false
    ElMessage.error(err.message || '获取订单详情失败')
  }
}

const confirmReceived = async (row: Order) => {
  try {
    await ElMessageBox.confirm('确认已收到配送的商品吗?', '确认收货', {
      confirmButtonText: '确认',
      cancelButtonText: '取消',
      type: 'warning'
    })

    await updateOrderStatus(row.id, 'pickup')
    ElMessage.success('确认收货成功，等待客户自提核销')
    fetchOrderList()
  } catch (err: any) {
    if (err !== 'cancel') {
      ElMessage.error(err.message || '确认收货失败')
    }
  }
}

// 订单核销
const verifyOrder = (row: Order) => {
  verifyForm.orderNo = row.orderNo
  verifyForm.customerName = row.customerName
  verifyForm.amount = parseFloat(row.totalAmount).toFixed(2)
  verifyForm.commission = parseFloat(row.commissionAmount).toFixed(2)
  verifyForm.code = ''
  verifyDialogVisible.value = true
}

// 模拟扫码功能
const scanCode = () => {
  ElMessage.info('扫码功能需要调用摄像头，演示环境使用后6位数字')
  verifyForm.code = verifyForm.orderNo.slice(-6)
}

// 确认核销
const confirmVerify = async () => {
  if (!verifyForm.code) {
    ElMessage.warning('请输入核销码')
    return
  }
  
  // 验证核销码（简单验证：订单号后6位）
  const correctCode = verifyForm.orderNo.slice(-6)
  if (verifyForm.code !== correctCode) {
    ElMessage.error('核销码错误，请重新输入')
    return
  }

  try {
    // 查找订单并更新状态为已完成
    const order = orderList.value.find(o => o.orderNo === verifyForm.orderNo)
    if (order) {
      await updateOrderStatus(order.id, 'completed')
      ElMessage({
        message: `核销成功！已获得佣金 ¥${parseFloat(order.commissionAmount).toFixed(2)}`,
        type: 'success',
        duration: 3000
      })
      verifyDialogVisible.value = false
      fetchOrderList()
    }
  } catch (err: any) {
    ElMessage.error(err.message || '核销失败')
  }
}

// 监听分页变化
watch([() => pagination.page, () => pagination.size], () => {
  fetchOrderList()
})

// 初始化
onMounted(() => {
  fetchOrderList()
})
</script>

<style scoped>
.my-orders {
  padding: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.search-form {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.amount {
  color: #67c23a;
  font-weight: bold;
}

.commission {
  color: #409eff;
  font-weight: bold;
}
</style>
