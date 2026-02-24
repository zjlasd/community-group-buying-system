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
        <el-table-column prop="amount" label="订单金额" width="120">
          <template #default="{ row }">
            <span class="amount">¥{{ row.amount.toFixed(2) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="commission" label="我的佣金" width="120">
          <template #default="{ row }">
            <span class="commission">¥{{ row.commission.toFixed(2) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="订单状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)">
              {{ getStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createTime" label="下单时间" width="180" />
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="viewDetail(row)">
              <el-icon><View /></el-icon>
              查看详情
            </el-button>
            <el-button
              v-if="row.status === 2"
              type="success"
              link
              @click="confirmReceived(row)"
            >
              <el-icon><Check /></el-icon>
              确认收货
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
          ¥{{ currentOrder.amount.toFixed(2) }}
        </el-descriptions-item>
        <el-descriptions-item label="我的佣金">
          ¥{{ currentOrder.commission.toFixed(2) }}
        </el-descriptions-item>
        <el-descriptions-item label="下单时间">{{ currentOrder.createTime }}</el-descriptions-item>
        <el-descriptions-item label="配送地址" :span="2">
          {{ currentOrder.address }}
        </el-descriptions-item>
        <el-descriptions-item label="订单备注" :span="2">
          {{ currentOrder.remark || '无' }}
        </el-descriptions-item>
      </el-descriptions>
      
      <el-divider>商品明细</el-divider>
      <el-table :data="currentOrder?.items" style="width: 100%">
        <el-table-column prop="productName" label="商品名称" />
        <el-table-column prop="price" label="单价" width="100">
          <template #default="{ row }">¥{{ row.price.toFixed(2) }}</template>
        </el-table-column>
        <el-table-column prop="quantity" label="数量" width="80" />
        <el-table-column prop="subtotal" label="小计" width="100">
          <template #default="{ row }">¥{{ row.subtotal.toFixed(2) }}</template>
        </el-table-column>
      </el-table>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'

const loading = ref(false)
const detailDialogVisible = ref(false)
const currentOrder = ref<any>(null)

const searchForm = reactive({
  status: undefined as number | undefined,
  dateRange: [] as any[],
  keyword: ''
})

const pagination = reactive({
  page: 1,
  size: 10,
  total: 25
})

// 模拟订单数据(团长自己的订单)
const orderList = ref([
  {
    orderNo: 'O202402240001',
    customerName: '王女士',
    customerPhone: '138****5678',
    amount: 158.5,
    commission: 19.02,
    status: 3,
    createTime: '2024-02-24 10:30:25',
    address: '阳光小区3栋1单元201',
    remark: '尽快配送',
    items: [
      { productName: '新鲜草莓', price: 29.9, quantity: 2, subtotal: 59.8 },
      { productName: '有机蔬菜包', price: 49.9, quantity: 1, subtotal: 49.9 },
      { productName: '鲜牛奶', price: 48.8, quantity: 1, subtotal: 48.8 }
    ]
  },
  {
    orderNo: 'O202402240002',
    customerName: '李先生',
    customerPhone: '139****1234',
    amount: 268.0,
    commission: 32.16,
    status: 3,
    createTime: '2024-02-24 09:15:18',
    address: '阳光小区5栋2单元302',
    remark: '',
    items: [
      { productName: '进口车厘子', price: 89.0, quantity: 2, subtotal: 178.0 },
      { productName: '新鲜蓝莓', price: 45.0, quantity: 2, subtotal: 90.0 }
    ]
  },
  {
    orderNo: 'O202402230015',
    customerName: '赵女士',
    customerPhone: '136****8765',
    amount: 198.5,
    commission: 23.82,
    status: 2,
    createTime: '2024-02-23 16:45:33',
    address: '阳光小区2栋3单元101',
    remark: '请轻拿轻放',
    items: [
      { productName: '有机蔬菜包', price: 49.9, quantity: 2, subtotal: 99.8 },
      { productName: '土鸡蛋', price: 32.9, quantity: 3, subtotal: 98.7 }
    ]
  },
  {
    orderNo: 'O202402230012',
    customerName: '刘阿姨',
    customerPhone: '137****4321',
    amount: 326.0,
    commission: 39.12,
    status: 2,
    createTime: '2024-02-23 14:20:10',
    address: '阳光小区1栋1单元501',
    remark: '',
    items: [
      { productName: '进口车厘子', price: 89.0, quantity: 2, subtotal: 178.0 },
      { productName: '新鲜草莓', price: 29.9, quantity: 3, subtotal: 89.7 },
      { productName: '鲜牛奶', price: 48.8, quantity: 1, subtotal: 48.8 }
    ]
  },
  {
    orderNo: 'O202402220025',
    customerName: '陈女士',
    customerPhone: '135****9876',
    amount: 185.0,
    commission: 22.2,
    status: 1,
    createTime: '2024-02-22 11:30:50',
    address: '阳光小区4栋2单元402',
    remark: '周末配送',
    items: [
      { productName: '有机蔬菜包', price: 49.9, quantity: 2, subtotal: 99.8 },
      { productName: '新鲜蓝莓', price: 45.0, quantity: 1, subtotal: 45.0 },
      { productName: '土鸡蛋', price: 32.9, quantity: 1, subtotal: 32.9 }
    ]
  }
])

const getStatusText = (status: number) => {
  const texts = ['待确认', '已确认', '配送中', '已完成', '已取消']
  return texts[status]
}

const getStatusType = (status: number) => {
  const types = ['warning', 'primary', 'info', 'success', 'danger']
  return types[status] as any
}

const handleSearch = () => {
  loading.value = true
  setTimeout(() => {
    loading.value = false
    ElMessage.success('搜索完成')
  }, 500)
}

const handleReset = () => {
  searchForm.status = undefined
  searchForm.dateRange = []
  searchForm.keyword = ''
  handleSearch()
}

const viewDetail = (row: any) => {
  currentOrder.value = row
  detailDialogVisible.value = true
}

const confirmReceived = (row: any) => {
  ElMessageBox.confirm('确认已收到配送的商品吗?', '确认收货', {
    confirmButtonText: '确认',
    cancelButtonText: '取消',
    type: 'warning'
  })
    .then(() => {
      row.status = 3
      ElMessage.success('确认收货成功')
    })
    .catch(() => {
      ElMessage.info('已取消')
    })
}
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
