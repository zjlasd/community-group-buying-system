<template>
  <div class="community-container">
    <el-card shadow="hover">
      <!-- 搜索栏 -->
      <el-form :inline="true" :model="searchForm" class="search-form">
        <el-form-item label="社区名称">
          <el-input v-model="searchForm.keyword" placeholder="请输入社区名称" clearable />
        </el-form-item>

        <el-form-item label="所属区域">
          <el-select v-model="searchForm.district" placeholder="全部区域" clearable>
            <el-option label="全部" value="" />
            <el-option label="小店区" value="小店区" />
            <el-option label="迎泽区" value="迎泽区" />
            <el-option label="杏花岭区" value="杏花岭区" />
            <el-option label="尖草坪区" value="尖草坪区" />
            <el-option label="万柏林区" value="万柏林区" />
            <el-option label="晋源区" value="晋源区" />
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
          新增社区
        </el-button>
        <el-button type="success" @click="fetchAreas">
          <el-icon><Location /></el-icon>
          区域列表
        </el-button>
      </div>

      <!-- 社区列表 -->
      <el-table :data="communityList" v-loading="loading" style="width: 100%; margin-top: 20px" stripe>
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="name" label="社区名称" width="200" />
        <el-table-column prop="district" label="所属区域" width="150">
          <template #default="{ row }">
            <el-tag>{{ row.district || '-' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="address" label="详细地址" min-width="250" show-overflow-tooltip />
        <el-table-column prop="leaderCount" label="团长数量" width="120">
          <template #default="{ row }">
            <el-link type="primary" @click="handleViewLeaders(row)">
              {{ row.leaderCount || 0 }} 人
            </el-link>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" fixed="right" width="200">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="handleEdit(row)">编辑</el-button>
            <el-button link type="danger" size="small" @click="handleDelete(row)">删除</el-button>
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
        @current-change="fetchCommunities"
        @size-change="fetchCommunities"
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
        <el-form-item label="社区名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入社区名称" />
        </el-form-item>

        <el-form-item label="所属区域" prop="district">
          <el-select v-model="form.district" placeholder="请选择区域" style="width: 100%">
            <el-option label="小店区" value="小店区" />
            <el-option label="迎泽区" value="迎泽区" />
            <el-option label="杏花岭区" value="杏花岭区" />
            <el-option label="尖草坪区" value="尖草坪区" />
            <el-option label="万柏林区" value="万柏林区" />
            <el-option label="晋源区" value="晋源区" />
          </el-select>
        </el-form-item>

        <el-form-item label="详细地址" prop="address">
          <el-input
            v-model="form.address"
            type="textarea"
            :rows="3"
            placeholder="请输入详细地址"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit" :loading="submitLoading">确定</el-button>
      </template>
    </el-dialog>

    <!-- 区域列表对话框 -->
    <el-dialog v-model="areaDialogVisible" title="区域统计" width="500px">
      <el-table :data="areaList" v-loading="areaLoading">
        <el-table-column prop="area" label="区域" />
        <el-table-column prop="count" label="社区数量">
          <template #default="{ row }">
            <el-tag type="success">{{ row.count }} 个</el-tag>
          </template>
        </el-table-column>
      </el-table>
    </el-dialog>

    <!-- 团长列表对话框 -->
    <el-dialog v-model="leaderDialogVisible" :title="`${currentCommunity?.name} - 团长列表`" width="800px">
      <el-table :data="leaderList" v-loading="leaderLoading">
        <el-table-column prop="name" label="姓名" />
        <el-table-column prop="phone" label="联系电话" />
        <el-table-column prop="totalOrders" label="累计订单" />
        <el-table-column label="累计佣金">
          <template #default="{ row }">
            ¥{{ parseFloat(row.totalCommission || 0).toFixed(2) }}
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态">
          <template #default="{ row }">
            <el-tag :type="row.status === 1 ? 'success' : 'danger'">
              {{ row.status === 1 ? '启用' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
      </el-table>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import {
  getCommunityList,
  createCommunity,
  updateCommunity,
  deleteCommunity,
  getCommunityAreas,
  getCommunityLeaders,
  type Community
} from '@/api/community'

// 搜索表单
const searchForm = reactive({
  keyword: '',
  district: ''
})

// 分页
const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0
})

// 加载状态
const loading = ref(false)
const submitLoading = ref(false)
const areaLoading = ref(false)
const leaderLoading = ref(false)

// 社区列表数据
const communityList = ref<Community[]>([])
const areaList = ref<any[]>([])
const leaderList = ref<any[]>([])
const currentCommunity = ref<Community | null>(null)

// 获取社区列表
const fetchCommunities = async () => {
  try {
    loading.value = true
    const res = await getCommunityList({
      page: pagination.page,
      pageSize: pagination.pageSize,
      keyword: searchForm.keyword,
      district: searchForm.district
    })
    communityList.value = res.data.list
    pagination.total = res.data.total
  } catch (error: any) {
    ElMessage.error(error.message || '获取社区列表失败')
  } finally {
    loading.value = false
  }
}

// 获取区域列表
const fetchAreas = async () => {
  try {
    areaLoading.value = true
    areaDialogVisible.value = true
    const res = await getCommunityAreas()
    areaList.value = res.data
  } catch (error: any) {
    ElMessage.error(error.message || '获取区域列表失败')
  } finally {
    areaLoading.value = false
  }
}

// 查看社区团长
const handleViewLeaders = async (row: Community) => {
  try {
    leaderLoading.value = true
    currentCommunity.value = row
    leaderDialogVisible.value = true
    const res = await getCommunityLeaders(row.id)
    leaderList.value = res.data
  } catch (error: any) {
    ElMessage.error(error.message || '获取团长列表失败')
  } finally {
    leaderLoading.value = false
  }
}

// 页面加载时获取数据
onMounted(() => {
  fetchCommunities()
})

// 对话框
const dialogVisible = ref(false)
const areaDialogVisible = ref(false)
const leaderDialogVisible = ref(false)
const dialogTitle = ref('新增社区')
const formRef = ref<FormInstance>()

const form = reactive({
  id: 0,
  name: '',
  district: '',
  address: ''
})

const rules: FormRules = {
  name: [{ required: true, message: '请输入社区名称', trigger: 'blur' }],
  district: [{ required: true, message: '请选择所属区域', trigger: 'change' }],
  address: [{ required: true, message: '请输入详细地址', trigger: 'blur' }]
}

// 查询
const handleSearch = () => {
  pagination.page = 1
  fetchCommunities()
}

// 重置
const handleReset = () => {
  searchForm.keyword = ''
  searchForm.district = ''
  pagination.page = 1
  fetchCommunities()
}

// 新增
const handleAdd = () => {
  dialogTitle.value = '新增社区'
  dialogVisible.value = true
}

// 编辑
const handleEdit = (row: Community) => {
  dialogTitle.value = '编辑社区'
  Object.assign(form, row)
  dialogVisible.value = true
}

// 删除
const handleDelete = async (row: Community) => {
  try {
    await ElMessageBox.confirm(`确定要删除社区 ${row.name} 吗?`, '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })

    await deleteCommunity(row.id)
    ElMessage.success('删除成功')
    fetchCommunities()
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '删除失败')
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
        if (form.id) {
          await updateCommunity(form.id, form)
          ElMessage.success('编辑成功')
        } else {
          await createCommunity(form)
          ElMessage.success('新增成功')
        }
        dialogVisible.value = false
        fetchCommunities()
      } catch (error: any) {
        ElMessage.error(error.message || '操作失败')
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
    name: '',
    district: '',
    address: ''
  })
}

// 格式化日期
const formatDate = (date: string) => {
  if (!date) return '-'
  return new Date(date).toLocaleString('zh-CN')
}
</script>

<style scoped>
.community-container {
  width: 100%;
}

.search-form {
  margin-bottom: 20px;
}

.toolbar {
  margin-bottom: 10px;
}
</style>
