<template>
  <div class="leader-container">
    <el-card shadow="hover">
      <!-- 搜索栏 -->
      <el-form :inline="true" :model="searchForm" class="search-form">
        <el-form-item label="团长姓名">
          <el-input v-model="searchForm.name" placeholder="请输入姓名" clearable />
        </el-form-item>

        <el-form-item label="所属社区">
          <el-select v-model="searchForm.communityId" placeholder="全部" clearable>
            <el-option label="全部" value="" />
            <el-option label="阳光小区" value="1" />
            <el-option label="幸福小区" value="2" />
            <el-option label="和谐社区" value="3" />
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
      <el-table :data="leaderList" style="width: 100%; margin-top: 20px" stripe>
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="name" label="姓名" width="100" />
        <el-table-column prop="phone" label="联系电话" width="130" />
        <el-table-column prop="communityName" label="所属社区" width="150" />
        <el-table-column prop="commissionRate" label="佣金比例" width="100">
          <template #default="{ row }">
            <el-tag type="success">{{ row.commissionRate }}%</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="totalOrders" label="累计订单" width="100" sortable />
        <el-table-column prop="totalCommission" label="累计佣金（元）" width="150" sortable>
          <template #default="{ row }">
            <span style="color: #409eff">¥{{ row.totalCommission.toFixed(2) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="balance" label="账户余额（元）" width="150">
          <template #default="{ row }">
            <span style="color: #67c23a">¥{{ row.balance.toFixed(2) }}</span>
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
        <el-form-item label="姓名" prop="name">
          <el-input v-model="form.name" placeholder="请输入团长姓名" />
        </el-form-item>

        <el-form-item label="联系电话" prop="phone">
          <el-input v-model="form.phone" placeholder="请输入联系电话" />
        </el-form-item>

        <el-form-item label="所属社区" prop="communityId">
          <el-select v-model="form.communityId" placeholder="请选择社区" style="width: 100%">
            <el-option label="阳光小区" value="1" />
            <el-option label="幸福小区" value="2" />
            <el-option label="和谐社区" value="3" />
            <el-option label="美好家园" value="4" />
          </el-select>
        </el-form-item>

        <el-form-item label="佣金比例" prop="commissionRate">
          <el-input-number
            v-model="form.commissionRate"
            :min="0"
            :max="100"
            :precision="2"
            :step="0.5"
            style="width: 100%"
          />
          <span style="margin-left: 10px; color: #909399">%</span>
        </el-form-item>

        <el-form-item label="状态" prop="status">
          <el-radio-group v-model="form.status">
            <el-radio :value="1">启用</el-radio>
            <el-radio :value="0">禁用</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'

// 搜索表单
const searchForm = reactive({
  name: '',
  communityId: '',
  status: ''
})

// 分页
const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 50
})

// 团长列表数据
const leaderList = ref([
  {
    id: 1,
    name: '张阿姨',
    phone: '13800138001',
    communityName: '阳光小区',
    commissionRate: 12.0,
    totalOrders: 256,
    totalCommission: 28560.5,
    balance: 5620.0,
    status: 1
  },
  {
    id: 2,
    name: '李叔叔',
    phone: '13800138002',
    communityName: '幸福小区',
    commissionRate: 10.0,
    totalOrders: 198,
    totalCommission: 19800.0,
    balance: 3200.0,
    status: 1
  },
  {
    id: 3,
    name: '王大姐',
    phone: '13800138003',
    communityName: '和谐社区',
    commissionRate: 11.5,
    totalOrders: 178,
    totalCommission: 20470.0,
    balance: 4150.0,
    status: 1
  },
  {
    id: 4,
    name: '赵师傅',
    phone: '13800138004',
    communityName: '美好家园',
    commissionRate: 12.5,
    totalOrders: 145,
    totalCommission: 18125.0,
    balance: 2800.0,
    status: 1
  },
  {
    id: 5,
    name: '刘阿姨',
    phone: '13800138005',
    communityName: '阳光小区',
    commissionRate: 11.0,
    totalOrders: 123,
    totalCommission: 13530.0,
    balance: 1890.0,
    status: 0
  }
])

// 对话框
const dialogVisible = ref(false)
const dialogTitle = ref('新增团长')
const formRef = ref<FormInstance>()

const form = reactive({
  id: '',
  name: '',
  phone: '',
  communityId: '',
  commissionRate: 10.0,
  status: 1
})

const rules: FormRules = {
  name: [{ required: true, message: '请输入团长姓名', trigger: 'blur' }],
  phone: [
    { required: true, message: '请输入联系电话', trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号', trigger: 'blur' }
  ],
  communityId: [{ required: true, message: '请选择所属社区', trigger: 'change' }],
  commissionRate: [{ required: true, message: '请输入佣金比例', trigger: 'blur' }]
}

// 查询
const handleSearch = () => {
  ElMessage.success('查询成功')
}

// 重置
const handleReset = () => {
  searchForm.name = ''
  searchForm.communityId = ''
  searchForm.status = ''
  ElMessage.info('已重置')
}

// 新增
const handleAdd = () => {
  dialogTitle.value = '新增团长'
  dialogVisible.value = true
}

// 查看详情
const handleView = (row: any) => {
  ElMessage.info(`查看团长: ${row.name}`)
}

// 编辑
const handleEdit = (row: any) => {
  dialogTitle.value = '编辑团长'
  Object.assign(form, row)
  dialogVisible.value = true
}

// 切换状态
const handleToggleStatus = (row: any) => {
  const action = row.status === 1 ? '禁用' : '启用'
  ElMessageBox.confirm(`确定要${action}团长 ${row.name} 吗?`, '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    row.status = row.status === 1 ? 0 : 1
    ElMessage.success(`${action}成功`)
  })
}

// 提交表单
const handleSubmit = async () => {
  if (!formRef.value) return

  await formRef.value.validate((valid) => {
    if (valid) {
      ElMessage.success(dialogTitle.value + '成功')
      dialogVisible.value = false
    }
  })
}

// 关闭对话框
const handleDialogClose = () => {
  formRef.value?.resetFields()
  Object.assign(form, {
    id: '',
    name: '',
    phone: '',
    communityId: '',
    commissionRate: 10.0,
    status: 1
  })
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
