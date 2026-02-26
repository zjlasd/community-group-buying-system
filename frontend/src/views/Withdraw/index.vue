<template>
  <div class="withdraw">
    <!-- 账户余额卡片 -->
    <el-card shadow="hover" class="balance-card" v-loading="statsLoading">
      <div class="balance-info">
        <div class="balance-item">
          <div class="label">账户余额</div>
          <div class="value balance">¥{{ Number(stats.balance || 0).toFixed(2) }}</div>
        </div>
        <div class="balance-item">
          <div class="label">可提现金额</div>
          <div class="value available">¥{{ Number(stats.available || 0).toFixed(2) }}</div>
        </div>
        <div class="balance-item">
          <div class="label">提现中</div>
          <div class="value pending">¥{{ Number(stats.pending || 0).toFixed(2) }}</div>
        </div>
        <div class="balance-item">
          <div class="label">累计提现</div>
          <div class="value total">¥{{ Number(stats.total || 0).toFixed(2) }}</div>
        </div>
      </div>
      <el-button type="primary" size="large" @click="showWithdrawDialog" style="margin-top: 20px">
        <el-icon><Wallet /></el-icon>
        申请提现
      </el-button>
    </el-card>

    <!-- 提现记录 -->
    <el-card shadow="hover" style="margin-top: 20px">
      <template #header>
        <div class="card-header">
          <span>提现记录</span>
        </div>
      </template>

      <!-- 搜索栏 -->
      <el-form :inline="true" :model="searchForm" class="search-form">
        <el-form-item label="提现状态">
          <el-select v-model="searchForm.status" placeholder="全部状态" clearable style="width: 150px">
            <el-option label="待审核" value="pending" />
            <el-option label="已通过" value="approved" />
            <el-option label="已拒绝" value="rejected" />
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

      <!-- 提现列表 -->
      <el-table :data="withdrawList" style="width: 100%; margin-top: 20px" v-loading="loading">
        <el-table-column prop="id" label="申请ID" width="100" />
        <el-table-column label="提现金额" width="150">
          <template #default="{ row }">
            <span class="amount">¥{{ parseFloat(row.amount).toFixed(2) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="accountType" label="账户类型" width="120" />
        <el-table-column prop="accountNumber" label="账户信息" width="180" show-overflow-tooltip />
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)">
              {{ getStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="申请时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="处理时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.auditedAt) }}
          </template>
        </el-table-column>
        <el-table-column prop="remark" label="备注" min-width="150" show-overflow-tooltip />
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="viewDetail(row)">
              <el-icon><View /></el-icon>
              查看详情
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

    <!-- 申请提现对话框 -->
    <el-dialog v-model="withdrawDialogVisible" title="申请提现" width="500px">
      <el-form :model="withdrawForm" :rules="withdrawRules" ref="withdrawFormRef" label-width="100px">
        <el-form-item label="可提现金额">
          <el-input :value="`¥${Number(stats.available || 0).toFixed(2)}`" disabled />
        </el-form-item>
        <el-form-item label="提现金额" prop="amount">
          <el-input
            v-model.number="withdrawForm.amount"
            placeholder="请输入提现金额"
            type="number"
          >
            <template #prepend>¥</template>
          </el-input>
          <div style="margin-top: 8px; font-size: 12px; color: #909399">
            最低提现金额¥100，最高¥10,000
          </div>
        </el-form-item>
        <el-form-item label="账户类型" prop="accountType">
          <el-select v-model="withdrawForm.accountType" placeholder="请选择" style="width: 100%">
            <el-option label="支付宝" value="支付宝" />
            <el-option label="微信" value="微信" />
            <el-option label="银行卡" value="银行卡" />
          </el-select>
        </el-form-item>
        <el-form-item label="账户信息" prop="accountNumber">
          <el-input
            v-model="withdrawForm.accountNumber"
            placeholder="请输入账号/卡号"
          />
        </el-form-item>
        <el-form-item label="账户姓名" prop="accountName">
          <el-input
            v-model="withdrawForm.accountName"
            placeholder="请输入账户姓名"
          />
        </el-form-item>
        <el-form-item label="备注">
          <el-input
            v-model="withdrawForm.remark"
            type="textarea"
            :rows="3"
            placeholder="选填"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="withdrawDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitWithdraw">确认提现</el-button>
      </template>
    </el-dialog>

    <!-- 提现详情对话框 -->
    <el-dialog v-model="detailDialogVisible" title="提现详情" width="600px">
      <el-descriptions :column="2" border v-if="currentWithdraw">
        <el-descriptions-item label="申请ID" :span="2">
          {{ currentWithdraw.id }}
        </el-descriptions-item>
        <el-descriptions-item label="提现金额">
          <span class="amount">¥{{ parseFloat(currentWithdraw.amount).toFixed(2) }}</span>
        </el-descriptions-item>
        <el-descriptions-item label="提现状态">
          <el-tag :type="getStatusType(currentWithdraw.status)">
            {{ getStatusText(currentWithdraw.status) }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="账户类型">
          {{ currentWithdraw.accountType }}
        </el-descriptions-item>
        <el-descriptions-item label="账户信息">
          {{ currentWithdraw.accountNumber }}
        </el-descriptions-item>
        <el-descriptions-item label="账户姓名">
          {{ currentWithdraw.accountName }}
        </el-descriptions-item>
        <el-descriptions-item label="申请时间">
          {{ formatDate(currentWithdraw.createdAt) }}
        </el-descriptions-item>
        <el-descriptions-item label="处理时间">
          {{ formatDate(currentWithdraw.auditedAt) }}
        </el-descriptions-item>
        <el-descriptions-item label="备注" :span="2">
          {{ currentWithdraw.remark || '无' }}
        </el-descriptions-item>
      </el-descriptions>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import {
  getWithdrawalList,
  createWithdrawal,
  getWithdrawalStats,
  type Withdrawal
} from '@/api/withdrawal'
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()
const loading = ref(false)
const statsLoading = ref(false)
const withdrawDialogVisible = ref(false)
const detailDialogVisible = ref(false)
const currentWithdraw = ref<Withdrawal | null>(null)
const withdrawFormRef = ref<FormInstance>()

// 统计数据
const stats = reactive({
  balance: 0,
  available: 0,
  pending: 0,
  total: 0
})

const searchForm = reactive({
  status: undefined as string | undefined,
  dateRange: [] as any[]
})

const pagination = reactive({
  page: 1,
  size: 10,
  total: 0
})

const withdrawForm = reactive({
  amount: undefined as number | undefined,
  accountType: '支付宝',
  accountNumber: '',
  accountName: '',
  remark: ''
})

const withdrawRules: FormRules = {
  amount: [
    { required: true, message: '请输入提现金额', trigger: 'blur' },
    { type: 'number', min: 100, max: 10000, message: '提现金额应在100-10000之间', trigger: 'blur' }
  ],
  accountType: [
    { required: true, message: '请选择账户类型', trigger: 'change' }
  ],
  accountNumber: [
    { required: true, message: '请输入账户信息', trigger: 'blur' }
  ],
  accountName: [
    { required: true, message: '请输入账户姓名', trigger: 'blur' }
  ]
}

// 提现记录
const withdrawList = ref<Withdrawal[]>([])

// 获取统计数据
const fetchStats = async () => {
  try {
    statsLoading.value = true
    const res = await getWithdrawalStats()
    Object.assign(stats, res.data)
  } catch (error: any) {
    ElMessage.error(error.message || '获取统计数据失败')
  } finally {
    statsLoading.value = false
  }
}

// 获取提现列表
const fetchWithdrawals = async () => {
  try {
    loading.value = true
    const params: any = {
      page: pagination.page,
      pageSize: pagination.size
    }
    
    // 团长只能看到自己的提现记录
    if (userStore.userInfo?.role === 'leader') {
      params.leaderId = userStore.userInfo.leader_id
    }
    
    if (searchForm.status !== undefined) {
      params.status = searchForm.status
    }
    
    if (searchForm.dateRange && searchForm.dateRange.length === 2) {
      params.startDate = searchForm.dateRange[0]
      params.endDate = searchForm.dateRange[1]
    }
    
    const res = await getWithdrawalList(params)
    withdrawList.value = res.data.list
    pagination.total = res.data.total
  } catch (error: any) {
    ElMessage.error(error.message || '获取提现列表失败')
  } finally {
    loading.value = false
  }
}

const getStatusText = (status: string) => {
  const statusMap: Record<string, string> = {
    'pending': '待审核',
    'approved': '已通过',
    'rejected': '已拒绝'
  }
  return statusMap[status] || '未知'
}

const getStatusType = (status: string) => {
  const typeMap: Record<string, string> = {
    'pending': 'warning',
    'approved': 'success',
    'rejected': 'danger'
  }
  return typeMap[status] as any || 'info'
}

const handleSearch = () => {
  pagination.page = 1
  fetchWithdrawals()
}

const handleReset = () => {
  searchForm.status = undefined
  searchForm.dateRange = []
  handleSearch()
}

const showWithdrawDialog = () => {
  withdrawForm.amount = undefined
  withdrawForm.accountType = '支付宝'
  withdrawForm.accountNumber = ''
  withdrawForm.accountName = ''
  withdrawForm.remark = ''
  withdrawDialogVisible.value = true
}

const submitWithdraw = async () => {
  if (!withdrawFormRef.value) return
  
  await withdrawFormRef.value.validate(async (valid) => {
    if (valid) {
      try {
        await createWithdrawal({
          amount: withdrawForm.amount!,
          accountType: withdrawForm.accountType,
          accountNumber: withdrawForm.accountNumber,
          accountName: withdrawForm.accountName,
          remark: withdrawForm.remark
        })
        
        ElMessage.success('提现申请提交成功，等待管理员审核')
        withdrawDialogVisible.value = false
        fetchWithdrawals()
        fetchStats()
      } catch (error: any) {
        ElMessage.error(error.message || '提交失败')
      }
    }
  })
}

const viewDetail = (row: Withdrawal) => {
  currentWithdraw.value = row
  detailDialogVisible.value = true
}

// 格式化日期
const formatDate = (date: string) => {
  if (!date) return '-'
  return new Date(date).toLocaleString('zh-CN')
}

onMounted(() => {
  fetchStats()
  fetchWithdrawals()
})
</script>

<style scoped>
.withdraw {
  padding: 20px;
}

.balance-card {
  text-align: center;
}

.balance-info {
  display: flex;
  justify-content: space-around;
  flex-wrap: wrap;
  gap: 20px;
}

.balance-item {
  text-align: center;
}

.balance-item .label {
  font-size: 14px;
  color: #909399;
  margin-bottom: 10px;
}

.balance-item .value {
  font-size: 24px;
  font-weight: bold;
}

.balance-item .balance {
  color: #67c23a;
}

.balance-item .available {
  color: #409eff;
}

.balance-item .pending {
  color: #e6a23c;
}

.balance-item .total {
  color: #909399;
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
</style>
