<template>
  <div class="product-manage-container">
    <el-card class="header-card">
      <div class="header-content">
        <div>
          <h2 style="margin: 0 0 8px 0">商品管理</h2>
          <span style="color: #909399; font-size: 14px">管理商品信息、设置佣金比例、控制上下架状态</span>
        </div>
        <el-button type="primary" @click="handleAdd">
          <el-icon><Plus /></el-icon>
          添加商品
        </el-button>
      </div>
    </el-card>

    <!-- 搜索筛选 -->
    <el-card class="search-card">
      <el-form :inline="true" :model="searchForm">
        <el-form-item label="商品名称">
          <el-input v-model="searchForm.keyword" placeholder="请输入商品名称" clearable />
        </el-form-item>
        <el-form-item label="商品分类">
          <el-select v-model="searchForm.category" placeholder="请选择分类" clearable>
            <el-option label="全部分类" value="" />
            <el-option label="水果" value="水果" />
            <el-option label="蔬菜" value="蔬菜" />
            <el-option label="肉蛋禽" value="肉蛋禽" />
            <el-option label="乳制品" value="乳制品" />
            <el-option label="粮油" value="粮油" />
          </el-select>
        </el-form-item>
        <el-form-item label="商品状态">
          <el-select v-model="searchForm.status" placeholder="请选择状态" clearable>
            <el-option label="全部状态" value="" />
            <el-option label="已上架" value="1" />
            <el-option label="已下架" value="0" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">
            <el-icon><Search /></el-icon>
            搜索
          </el-button>
          <el-button @click="handleReset">
            <el-icon><RefreshLeft /></el-icon>
            重置
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 商品列表 -->
    <el-card class="table-card">
      <el-table :data="productList" v-loading="loading" stripe>
        <el-table-column prop="id" label="商品ID" width="80" />
        <el-table-column label="商品图片" width="100">
          <template #default="{ row }">
            <el-image
              :src="row.image_url || 'https://picsum.photos/200/200'"
              fit="cover"
              style="width: 60px; height: 60px; border-radius: 4px"
              :preview-src-list="[row.image_url || 'https://picsum.photos/200/200']"
            />
          </template>
        </el-table-column>
        <el-table-column prop="name" label="商品名称" min-width="150" />
        <el-table-column prop="category" label="商品分类" width="100" />
        <el-table-column prop="price" label="销售价格" width="100">
          <template #default="{ row }">
            <span style="color: #f56c6c; font-weight: bold">¥{{ Number(row.price).toFixed(2) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="commission_rate" label="佣金比例" width="100">
          <template #default="{ row }">
            <el-tag type="warning">{{ Number(row.commission_rate).toFixed(0) }}%</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="stock" label="库存" width="80">
          <template #default="{ row }">
            <span :style="{ color: row.stock < 50 ? '#f56c6c' : '#67c23a' }">
              {{ row.stock }}
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="sales" label="累计销量" width="100" />
        <el-table-column prop="status" label="商品状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 1 ? 'success' : 'info'">
              {{ row.status === 1 ? '已上架' : '已下架' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="280" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="handleEdit(row)">
              <el-icon><Edit /></el-icon>
              编辑
            </el-button>
            <el-button
              :type="row.status === 1 ? 'warning' : 'success'"
              link
              @click="handleToggleStatus(row)"
            >
              <el-icon><SwitchButton /></el-icon>
              {{ row.status === 1 ? '下架' : '上架' }}
            </el-button>
            <el-button type="danger" link @click="handleDelete(row)">
              <el-icon><Delete /></el-icon>
              删除
            </el-button>
            <el-button type="info" link @click="handleViewStats(row)">
              <el-icon><DataLine /></el-icon>
              统计
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        v-model:current-page="pagination.page"
        v-model:page-size="pagination.size"
        :total="pagination.total"
        :page-sizes="[10, 20, 50, 100]"
        layout="total, sizes, prev, pager, next, jumper"
        style="margin-top: 20px; justify-content: flex-end"
        @current-change="fetchProducts"
        @size-change="fetchProducts"
      />
    </el-card>

    <!-- 添加/编辑商品对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="600px"
      :close-on-click-modal="false"
    >
      <el-form :model="formData" :rules="rules" ref="formRef" label-width="100px">
        <el-form-item label="商品名称" prop="name">
          <el-input v-model="formData.name" placeholder="请输入商品名称" />
        </el-form-item>
        <el-form-item label="商品分类" prop="category">
          <el-select v-model="formData.category" placeholder="请选择分类">
            <el-option label="水果" value="水果" />
            <el-option label="蔬菜" value="蔬菜" />
            <el-option label="肉蛋禽" value="肉蛋禽" />
            <el-option label="乳制品" value="乳制品" />
            <el-option label="粮油" value="粮油" />
          </el-select>
        </el-form-item>
        <el-form-item label="商品图片" prop="image_url">
          <el-input v-model="formData.image_url" placeholder="请输入图片URL">
            <template #append>
              <el-button @click="useDefaultImage">使用默认</el-button>
            </template>
          </el-input>
        </el-form-item>
        <el-form-item label="销售价格" prop="price">
          <el-input-number
            v-model="formData.price"
            :min="0.01"
            :max="9999"
            :precision="2"
            :step="1"
            placeholder="请输入价格"
          />
        </el-form-item>
        <el-form-item label="佣金比例" prop="commission_rate">
          <el-slider
            v-model="formData.commission_rate"
            :min="5"
            :max="30"
            :step="1"
            show-input
            :format-tooltip="(val: number) => val + '%'"
          />
          <div style="margin-top: 8px; font-size: 12px; color: #909399">
            团长每售出一件商品可获得：¥{{ (formData.price * formData.commission_rate / 100).toFixed(2) }} 佣金
          </div>
        </el-form-item>
        <el-form-item label="库存数量" prop="stock">
          <el-input-number
            v-model="formData.stock"
            :min="0"
            :max="99999"
            :step="10"
            placeholder="请输入库存"
          />
        </el-form-item>
        <el-form-item label="商品描述" prop="description">
          <el-input
            v-model="formData.description"
            type="textarea"
            :rows="3"
            placeholder="请输入商品描述"
          />
        </el-form-item>
        <el-form-item label="商品状态" prop="status">
          <el-radio-group v-model="formData.status">
            <el-radio :label="1">上架</el-radio>
            <el-radio :label="0">下架</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>

    <!-- 商品统计对话框 -->
    <el-dialog v-model="statsDialogVisible" title="商品销售统计" width="800px">
      <el-descriptions :column="2" border v-if="currentProduct">
        <el-descriptions-item label="商品名称">{{ currentProduct.name }}</el-descriptions-item>
        <el-descriptions-item label="商品分类">{{ currentProduct.category }}</el-descriptions-item>
        <el-descriptions-item label="销售价格">¥{{ Number(currentProduct.price).toFixed(2) }}</el-descriptions-item>
        <el-descriptions-item label="佣金比例">{{ Number(currentProduct.commission_rate).toFixed(0) }}%</el-descriptions-item>
        <el-descriptions-item label="当前库存">{{ currentProduct.stock }}</el-descriptions-item>
        <el-descriptions-item label="累计销量">{{ currentProduct.sales }}</el-descriptions-item>
        <el-descriptions-item label="累计销售额">
          ¥{{ (Number(currentProduct.price) * currentProduct.sales).toFixed(2) }}
        </el-descriptions-item>
        <el-descriptions-item label="累计佣金支出">
          ¥{{ (Number(currentProduct.price) * currentProduct.sales * Number(currentProduct.commission_rate) / 100).toFixed(2) }}
        </el-descriptions-item>
      </el-descriptions>

      <el-divider>最近销售记录（模拟数据）</el-divider>
      <el-table :data="mockSalesData" style="width: 100%">
        <el-table-column prop="date" label="日期" width="120" />
        <el-table-column prop="quantity" label="销量" width="80" />
        <el-table-column prop="amount" label="销售额" width="100">
          <template #default="{ row }">¥{{ row.amount.toFixed(2) }}</template>
        </el-table-column>
        <el-table-column prop="commission" label="佣金支出" width="100">
          <template #default="{ row }">¥{{ row.commission.toFixed(2) }}</template>
        </el-table-column>
      </el-table>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import * as productApi from '@/api/product'

const loading = ref(false)
const dialogVisible = ref(false)
const statsDialogVisible = ref(false)
const dialogTitle = ref('添加商品')
const formRef = ref<FormInstance>()
const currentProduct = ref<any>(null)

const searchForm = reactive({
  keyword: '',
  category: '',
  status: ''
})

const pagination = reactive({
  page: 1,
  size: 10,
  total: 0
})

const formData = reactive({
  id: 0,
  name: '',
  category: '',
  image_url: '',
  price: 0,
  commission_rate: 12,
  stock: 100,
  description: '',
  status: 1
})

const rules: FormRules = {
  name: [{ required: true, message: '请输入商品名称', trigger: 'blur' }],
  category: [{ required: true, message: '请选择商品分类', trigger: 'change' }],
  image_url: [{ required: true, message: '请输入商品图片URL', trigger: 'blur' }],
  price: [{ required: true, message: '请输入销售价格', trigger: 'blur' }],
  commission_rate: [{ required: true, message: '请设置佣金比例', trigger: 'blur' }],
  stock: [{ required: true, message: '请输入库存数量', trigger: 'blur' }]
}

// 商品列表
const productList = ref<any[]>([])

// 模拟销售记录
const mockSalesData = ref([
  { date: '2024-02-24', quantity: 15, amount: 448.5, commission: 53.82 },
  { date: '2024-02-23', quantity: 22, amount: 657.8, commission: 78.94 },
  { date: '2024-02-22', quantity: 18, amount: 538.2, commission: 64.58 },
  { date: '2024-02-21', quantity: 12, amount: 358.8, commission: 43.06 },
  { date: '2024-02-20', quantity: 20, amount: 598.0, commission: 71.76 }
])

// 获取商品列表
const fetchProducts = async () => {
  loading.value = true
  try {
    const res = await productApi.getProducts({
      page: pagination.page,
      pageSize: pagination.size,
      keyword: searchForm.keyword,
      category: searchForm.category,
      status: searchForm.status
    })
    productList.value = res.data.list
    pagination.total = res.data.total
  } catch (error: any) {
    ElMessage.error(error.message || '获取商品列表失败')
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  pagination.page = 1
  fetchProducts()
}

const handleReset = () => {
  searchForm.keyword = ''
  searchForm.category = ''
  searchForm.status = ''
  handleSearch()
}

const handleAdd = () => {
  dialogTitle.value = '添加商品'
  Object.assign(formData, {
    id: 0,
    name: '',
    category: '',
    image_url: '',
    price: 0,
    commission_rate: 12,
    stock: 100,
    description: '',
    status: 1
  })
  dialogVisible.value = true
}

const handleEdit = (row: any) => {
  dialogTitle.value = '编辑商品'
  Object.assign(formData, {
    id: row.id,
    name: row.name,
    category: row.category,
    image_url: row.image_url,
    price: Number(row.price),
    commission_rate: Number(row.commission_rate),
    stock: Number(row.stock),
    description: row.description,
    status: row.status
  })
  dialogVisible.value = true
}

const handleSubmit = async () => {
  if (!formRef.value) return
  await formRef.value.validate(async (valid) => {
    if (valid) {
      try {
        const isEdit = formData.id > 0
        const submitData = {
          name: formData.name,
          category: formData.category,
          image_url: formData.image_url,
          price: formData.price,
          commission_rate: formData.commission_rate,
          stock: formData.stock,
          description: formData.description
        }

        if (isEdit) {
          await productApi.updateProduct(formData.id, submitData)
          ElMessage.success('商品更新成功')
        } else {
          await productApi.createProduct({
            ...submitData,
            status: formData.status
          } as any)
          ElMessage.success('商品添加成功')
        }

        dialogVisible.value = false
        fetchProducts()
      } catch (error: any) {
        ElMessage.error(error.message || '操作失败')
      }
    }
  })
}

const handleToggleStatus = (row: any) => {
  const action = row.status === 1 ? '下架' : '上架'
  ElMessageBox.confirm(`确认${action}该商品吗？`, `${action}商品`, {
    confirmButtonText: '确认',
    cancelButtonText: '取消',
    type: 'warning'
  })
    .then(async () => {
      try {
        const newStatus = row.status === 1 ? 0 : 1
        await productApi.updateProductStatus(row.id, newStatus)
        ElMessage.success(`${action}成功`)
        fetchProducts()
      } catch (error: any) {
        ElMessage.error(error.message || `${action}失败`)
      }
    })
    .catch(() => {
      ElMessage.info('已取消')
    })
}

const handleDelete = (row: any) => {
  ElMessageBox.confirm('删除后将无法恢复，确认删除该商品吗？', '删除商品', {
    confirmButtonText: '确认',
    cancelButtonText: '取消',
    type: 'error'
  })
    .then(async () => {
      try {
        await productApi.deleteProduct(row.id)
        ElMessage.success('删除成功')
        fetchProducts()
      } catch (error: any) {
        ElMessage.error(error.message || '删除失败')
      }
    })
    .catch(() => {
      ElMessage.info('已取消')
    })
}

const handleViewStats = (row: any) => {
  currentProduct.value = row
  statsDialogVisible.value = true
}

const useDefaultImage = () => {
  formData.image_url = `https://picsum.photos/200/200?random=${Date.now()}`
  ElMessage.success('已设置默认图片')
}

// 页面加载时获取商品列表
onMounted(() => {
  fetchProducts()
})
</script>

<style scoped>
.product-manage-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.header-card {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.header-card :deep(.el-card__body) {
  padding: 20px;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-content h2 {
  color: white;
}

.search-card,
.table-card {
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

:deep(.el-table .cell) {
  display: flex;
  align-items: center;
}

:deep(.el-pagination) {
  display: flex;
}
</style>
