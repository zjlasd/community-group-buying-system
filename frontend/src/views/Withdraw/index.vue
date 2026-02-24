<template>
  <div class="withdraw">
    <!-- 账户余额卡片 -->
    <el-card shadow="hover" class="balance-card">
      <div class="balance-info">
        <div class="balance-item">
          <div class="label">账户余额</div>
          <div class="value balance">¥8,500.00</div>
        </div>
        <div class="balance-item">
          <div class="label">可提现金额</div>
          <div class="value available">¥8,500.00</div>
        </div>
        <div class="balance-item">
          <div class="label">提现中</div>
          <div class="value pending">¥0.00</div>
        </div>
        <div class="balance-item">
          <div class="label">累计提现</div>
          <div class="value total">¥7,180.50</div>
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
            <el-option label="待审核" :value="0" />
            <el-option label="已通过" :value="1" />
            <el-option label="已拒绝" :value="2" />
            <el-option label="已打款" :value="3" />
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
        <el-table-column prop="withdrawNo" label="提现单号" width="180" />
        <el-table-column prop="amount" label="提现金额" width="120">
          <template #default="{ row }">
            <span class="amount">¥{{ row.amount.toFixed(2) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="accountType" label="账户类型" width="120" />
        <el-table-column prop="accountNo" label="账户信息" width="180" />
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)">
              {{ getStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="applyTime" label="申请时间" width="180" />
        <el-table-column prop="auditTime" label="处理时间" width="180">
          <template #default="{ row }">
            {{ row.auditTime || '-' }}
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
          <el-input value="¥8,500.00" disabled />
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
        <el-form-item label="账户信息" prop="accountNo">
          <el-input
            v-model="withdrawForm.accountNo"
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
        <el-descriptions-item label="提现单号" :span="2">
          {{ currentWithdraw.withdrawNo }}
        </el-descriptions-item>
        <el-descriptions-item label="提现金额">
          <span class="amount">¥{{ currentWithdraw.amount.toFixed(2) }}</span>
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
          {{ currentWithdraw.accountNo }}
        </el-descriptions-item>
        <el-descriptions-item label="账户姓名">
          {{ currentWithdraw.accountName }}
        </el-descriptions-item>
        <el-descriptions-item label="申请时间">
          {{ currentWithdraw.applyTime }}
        </el-descriptions-item>
        <el-descriptions-item label="处理时间">
          {{ currentWithdraw.auditTime || '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="审核人">
          {{ currentWithdraw.auditor || '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="备注" :span="2">
          {{ currentWithdraw.remark || '无' }}
        </el-descriptions-item>
      </el-descriptions>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'

const loading = ref(false)
const withdrawDialogVisible = ref(false)
const detailDialogVisible = ref(false)
const currentWithdraw = ref<any>(null)
const withdrawFormRef = ref<FormInstance>()

const searchForm = reactive({
  status: undefined as number | undefined,
  dateRange: [] as any[]
})

const pagination = reactive({
  page: 1,
  size: 10,
  total: 8
})

const withdrawForm = reactive({
  amount: undefined as number | undefined,
  accountType: '',
  accountNo: '',
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
  accountNo: [
    { required: true, message: '请输入账户信息', trigger: 'blur' }
  ],
  accountName: [
    { required: true, message: '请输入账户姓名', trigger: 'blur' }
  ]
}

// 模拟提现记录
const withdrawList = ref([
  {
    withdrawNo: 'W202402200001',
    amount: 1500.0,
    accountType: '支付宝',
    accountNo: '138****5678',
    accountName: '张阿姨',
    status: 3,
    applyTime: '2024-02-20 14:30:25',
    auditTime: '2024-02-20 16:20:10',
    auditor: '管理员',
    remark: '正常提现'
  },
  {
    withdrawNo: 'W202402150002',
    amount: 2300.0,
    accountType: '微信',
    accountNo: 'wx_zhang888',
    accountName: '张阿姨',
    status: 3,
    applyTime: '2024-02-15 10:15:30',
    auditTime: '2024-02-15 11:45:22',
    auditor: '管理员',
    remark: ''
  },
  {
    withdrawNo: 'W202402100003',
    amount: 1800.5,
    accountType: '支付宝',
    accountNo: '138****5678',
    accountName: '张阿姨',
    status: 3,
    applyTime: '2024-02-10 09:20:18',
    auditTime: '2024-02-10 14:30:45',
    auditor: '管理员',
    remark: ''
  },
  {
    withdrawNo: 'W202402050004',
    amount: 980.0,
    accountType: '银行卡',
    accountNo: '6222****1234',
    accountName: '张阿姨',
    status: 3,
    applyTime: '2024-02-05 16:40:22',
    auditTime: '2024-02-05 17:15:33',
    auditor: '管理员',
    remark: ''
  },
  {
    withdrawNo: 'W202401280005',
    amount: 600.0,
    accountType: '支付宝',
    accountNo: '138****5678',
    accountName: '张阿姨',
    status: 3,
    applyTime: '2024-01-28 11:25:15',
    auditTime: '2024-01-28 15:30:20',
    auditor: '管理员',
    remark: ''
  }
])

const getStatusText = (status: number) => {
  const texts = ['待审核', '已通过', '已拒绝', '已打款']
  return texts[status]
}

const getStatusType = (status: number) => {
  const types = ['warning', 'success', 'danger', 'success']
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
  handleSearch()
}

const showWithdrawDialog = () => {
  withdrawForm.amount = undefined
  withdrawForm.accountType = ''
  withdrawForm.accountNo = ''
  withdrawForm.accountName = ''
  withdrawForm.remark = ''
  withdrawDialogVisible.value = true
}

const submitWithdraw = () => {
  withdrawFormRef.value?.validate((valid) => {
    if (valid) {
      // 生成新的提现记录
      const newWithdraw = {
        withdrawNo: `W${Date.now()}`,
        amount: withdrawForm.amount!,
        accountType: withdrawForm.accountType,
        accountNo: withdrawForm.accountNo,
        accountName: withdrawForm.accountName,
        status: 0,
        applyTime: new Date().toLocaleString('zh-CN', { 
          year: 'numeric', 
          month: '2-digit', 
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false 
        }).replace(/\//g, '-'),
        auditTime: null,
        auditor: null,
        remark: withdrawForm.remark
      }
      
      withdrawList.value.unshift(newWithdraw)
      pagination.total++
      
      ElMessage.success('提现申请提交成功，等待管理员审核')
      withdrawDialogVisible.value = false
    }
  })
}

const viewDetail = (row: any) => {
  currentWithdraw.value = row
  detailDialogVisible.value = true
}
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
