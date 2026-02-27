<template>
  <div class="customers">
    <el-card shadow="hover">
      <template #header>
        <div class="card-header">
          <span>客户管理</span>
          <el-button type="primary" @click="showAddDialog">
            <el-icon><Plus /></el-icon>
            添加客户
          </el-button>
        </div>
      </template>

      <!-- 统计卡片 -->
      <div class="stats-container">
        <div class="stat-card">
          <div class="stat-value">{{ stats.total }}</div>
          <div class="stat-label">总客户数</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ stats.active }}</div>
          <div class="stat-label">活跃客户</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ stats.sleeping }}</div>
          <div class="stat-label">沉睡客户</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ stats.vip }}</div>
          <div class="stat-label">VIP客户</div>
        </div>
      </div>

      <!-- 搜索栏 -->
      <el-form :inline="true" :model="searchForm" class="search-form">
        <el-form-item label="客户标签">
          <el-select v-model="searchForm.tag" placeholder="全部标签" clearable style="width: 150px">
            <el-option label="活跃客户" value="活跃客户" />
            <el-option label="沉睡客户" value="沉睡客户" />
            <el-option label="VIP客户" value="VIP客户" />
          </el-select>
        </el-form-item>
        <el-form-item label="关键词">
          <el-input
            v-model="searchForm.keyword"
            placeholder="姓名/电话/地址"
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

      <!-- 客户列表 -->
      <el-table :data="customerList" style="width: 100%; margin-top: 20px" v-loading="loading">
        <el-table-column prop="name" label="客户姓名" width="120" />
        <el-table-column prop="phone" label="联系电话" width="130" />
        <el-table-column prop="address" label="详细地址" min-width="200" show-overflow-tooltip />
        <el-table-column prop="tag" label="客户标签" width="120">
          <template #default="{ row }">
            <el-tag :type="getTagType(row.tag)">{{ row.tag }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="orderCount" label="订单数" width="100">
          <template #default="{ row }">
            <span style="color: #409eff; font-weight: bold">{{ row.orderCount }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="totalAmount" label="消费总额" width="120">
          <template #default="{ row }">
            <span style="color: #67c23a; font-weight: bold">¥{{ Number(row.totalAmount || 0).toFixed(2) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="lastOrderTime" label="最近下单" width="180" />
        <el-table-column prop="remark" label="备注" min-width="150" show-overflow-tooltip />
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="viewDetail(row)">
              <el-icon><View /></el-icon>
              查看详情
            </el-button>
            <el-button type="warning" link @click="editCustomer(row)">
              <el-icon><Edit /></el-icon>
              编辑
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

    <!-- 添加/编辑客户对话框 -->
    <el-dialog
      v-model="formDialogVisible"
      :title="isEdit ? '编辑客户' : '添加客户'"
      width="600px"
    >
      <el-form :model="customerForm" :rules="customerRules" ref="customerFormRef" label-width="100px">
        <el-form-item label="客户姓名" prop="name">
          <el-input v-model="customerForm.name" placeholder="请输入客户姓名" />
        </el-form-item>
        <el-form-item label="联系电话" prop="phone">
          <el-input v-model="customerForm.phone" placeholder="请输入联系电话" />
        </el-form-item>
        <el-form-item label="详细地址" prop="address">
          <el-input v-model="customerForm.address" placeholder="请输入详细地址" />
        </el-form-item>
        <el-form-item label="客户标签" prop="tag">
          <el-select v-model="customerForm.tag" placeholder="请选择" style="width: 100%">
            <el-option label="活跃客户" value="活跃客户" />
            <el-option label="沉睡客户" value="沉睡客户" />
            <el-option label="VIP客户" value="VIP客户" />
          </el-select>
        </el-form-item>
        <el-form-item label="备注">
          <el-input
            v-model="customerForm.remark"
            type="textarea"
            :rows="3"
            placeholder="选填，例如：电梯坏了、喜欢车厘子"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="formDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitCustomer">确定</el-button>
      </template>
    </el-dialog>

    <!-- 客户详情对话框 -->
    <el-dialog v-model="detailDialogVisible" title="客户详情" width="800px">
      <el-descriptions :column="2" border v-if="currentCustomer">
        <el-descriptions-item label="客户姓名">{{ currentCustomer.name }}</el-descriptions-item>
        <el-descriptions-item label="联系电话">{{ currentCustomer.phone }}</el-descriptions-item>
        <el-descriptions-item label="客户标签">
          <el-tag :type="getTagType(currentCustomer.tag)">{{ currentCustomer.tag }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="订单数量">{{ currentCustomer.orderCount }}</el-descriptions-item>
        <el-descriptions-item label="消费总额">
          ¥{{ Number(currentCustomer.totalAmount || 0).toFixed(2) }}
        </el-descriptions-item>
        <el-descriptions-item label="最近下单">{{ currentCustomer.lastOrderTime }}</el-descriptions-item>
        <el-descriptions-item label="详细地址" :span="2">
          {{ currentCustomer.address }}
        </el-descriptions-item>
        <el-descriptions-item label="备注" :span="2">
          {{ currentCustomer.remark || '无' }}
        </el-descriptions-item>
      </el-descriptions>
      
      <el-divider>购买记录（最近5笔）</el-divider>
      <el-table :data="currentCustomer?.orders" style="width: 100%">
        <el-table-column prop="orderNo" label="订单号" width="180" />
        <el-table-column prop="amount" label="订单金额" width="120">
          <template #default="{ row }">¥{{ Number(row.amount || 0).toFixed(2) }}</template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === '已完成' ? 'success' : 'warning'">
              {{ row.status }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createTime" label="下单时间" width="180" />
      </el-table>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { getCustomerList, getCustomerDetail, type Customer, type CustomerStats } from '@/api/customer'

const loading = ref(false)
const formDialogVisible = ref(false)
const detailDialogVisible = ref(false)
const isEdit = ref(false)
const currentCustomer = ref<any>(null)
const customerFormRef = ref<FormInstance>()

const searchForm = reactive({
  tag: '',
  keyword: ''
})

const pagination = reactive({
  page: 1,
  size: 10,
  total: 0
})

const customerForm = reactive({
  id: undefined as number | undefined,
  name: '',
  phone: '',
  address: '',
  tag: '',
  remark: ''
})

const customerRules: FormRules = {
  name: [
    { required: true, message: '请输入客户姓名', trigger: 'blur' }
  ],
  phone: [
    { required: true, message: '请输入联系电话', trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号', trigger: 'blur' }
  ],
  address: [
    { required: true, message: '请输入详细地址', trigger: 'blur' }
  ],
  tag: [
    { required: true, message: '请选择客户标签', trigger: 'change' }
  ]
}

// 客户列表和统计数据
const customerList = ref<Customer[]>([])
const stats = reactive<CustomerStats>({
  total: 0,
  active: 0,
  sleeping: 0,
  vip: 0
})

// 获取客户列表
const fetchCustomers = async () => {
  try {
    loading.value = true
    const res = await getCustomerList({
      page: pagination.page,
      pageSize: pagination.size,
      keyword: searchForm.keyword,
      tag: searchForm.tag
    })
    
    if (res.code === 200 && res.data) {
      customerList.value = res.data.list
      pagination.total = res.data.total
      
      // 更新统计数据
      if (res.data.stats) {
        stats.total = res.data.stats.total
        stats.active = res.data.stats.active
        stats.sleeping = res.data.stats.sleeping
        stats.vip = res.data.stats.vip
      }
    }
  } catch (error) {
    console.error('获取客户列表失败:', error)
    ElMessage.error('获取客户列表失败')
  } finally {
    loading.value = false
  }
}

const getTagType = (tag: string) => {
  const types: Record<string, any> = {
    'VIP客户': 'danger',
    '活跃客户': 'success',
    '沉睡客户': 'info',
    '普通客户': 'primary'
  }
  return types[tag] || 'primary'
}

const handleSearch = () => {
  pagination.page = 1
  fetchCustomers()
}

const handleReset = () => {
  searchForm.tag = ''
  searchForm.keyword = ''
  pagination.page = 1
  fetchCustomers()
}

// 页面加载时获取数据
onMounted(() => {
  fetchCustomers()
})

const showAddDialog = () => {
  ElMessage.info('添加客户功能暂未实现（客户通过下单自动添加）')
  // isEdit.value = false
  // customerForm.id = undefined
  // customerForm.name = ''
  // customerForm.phone = ''
  // customerForm.address = ''
  // customerForm.tag = ''
  // customerForm.remark = ''
  // formDialogVisible.value = true
}

const editCustomer = (row: any) => {
  ElMessage.info('编辑客户功能暂未实现')
}

const submitCustomer = () => {
  ElMessage.info('提交客户功能暂未实现')
}

const viewDetail = async (row: Customer) => {
  try {
    loading.value = true
    const res = await getCustomerDetail(row.phone)
    if (res.code === 200 && res.data) {
      currentCustomer.value = res.data
      detailDialogVisible.value = true
    }
  } catch (error) {
    console.error('获取客户详情失败:', error)
    ElMessage.error('获取客户详情失败')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.customers {
  padding: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.stats-container {
  display: flex;
  gap: 20px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.stat-card {
  flex: 1;
  min-width: 150px;
  padding: 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 8px;
  text-align: center;
  color: white;
}

.stat-card:nth-child(2) {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}

.stat-card:nth-child(3) {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
}

.stat-card:nth-child(4) {
  background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
}

.stat-value {
  font-size: 32px;
  font-weight: bold;
  margin-bottom: 5px;
}

.stat-label {
  font-size: 14px;
  opacity: 0.9;
}

.search-form {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}
</style>
