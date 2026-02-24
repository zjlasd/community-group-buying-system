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
          <el-input v-model="searchForm.name" placeholder="请输入商品名称" clearable />
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
              :src="row.image"
              fit="cover"
              style="width: 60px; height: 60px; border-radius: 4px"
              :preview-src-list="[row.image]"
            />
          </template>
        </el-table-column>
        <el-table-column prop="name" label="商品名称" min-width="150" />
        <el-table-column prop="category" label="商品分类" width="100" />
        <el-table-column prop="price" label="销售价格" width="100">
          <template #default="{ row }">
            <span style="color: #f56c6c; font-weight: bold">¥{{ row.price.toFixed(2) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="commissionRate" label="佣金比例" width="100">
          <template #default="{ row }">
            <el-tag type="warning">{{ (row.commissionRate * 100).toFixed(0) }}%</el-tag>
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
        <el-form-item label="商品图片" prop="image">
          <el-input v-model="formData.image" placeholder="请输入图片URL">
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
        <el-form-item label="佣金比例" prop="commissionRate">
          <el-slider
            v-model="formData.commissionRate"
            :min="5"
            :max="30"
            :step="1"
            show-input
            :format-tooltip="(val: number) => val + '%'"
          />
          <div style="margin-top: 8px; font-size: 12px; color: #909399">
            团长每售出一件商品可获得：¥{{ (formData.price * formData.commissionRate / 100).toFixed(2) }} 佣金
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
        <el-descriptions-item label="销售价格">¥{{ currentProduct.price.toFixed(2) }}</el-descriptions-item>
        <el-descriptions-item label="佣金比例">{{ (currentProduct.commissionRate * 100).toFixed(0) }}%</el-descriptions-item>
        <el-descriptions-item label="当前库存">{{ currentProduct.stock }}</el-descriptions-item>
        <el-descriptions-item label="累计销量">{{ currentProduct.sales }}</el-descriptions-item>
        <el-descriptions-item label="累计销售额">
          ¥{{ (currentProduct.price * currentProduct.sales).toFixed(2) }}
        </el-descriptions-item>
        <el-descriptions-item label="累计佣金支出">
          ¥{{ (currentProduct.price * currentProduct.sales * currentProduct.commissionRate).toFixed(2) }}
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
import { ref, reactive } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'

const loading = ref(false)
const dialogVisible = ref(false)
const statsDialogVisible = ref(false)
const dialogTitle = ref('添加商品')
const formRef = ref<FormInstance>()
const currentProduct = ref<any>(null)

const searchForm = reactive({
  name: '',
  category: '',
  status: ''
})

const pagination = reactive({
  page: 1,
  size: 10,
  total: 10
})

const formData = reactive({
  id: 0,
  name: '',
  category: '',
  image: '',
  price: 0,
  commissionRate: 12,
  stock: 100,
  description: '',
  status: 1
})

const rules: FormRules = {
  name: [{ required: true, message: '请输入商品名称', trigger: 'blur' }],
  category: [{ required: true, message: '请选择商品分类', trigger: 'change' }],
  image: [{ required: true, message: '请输入商品图片URL', trigger: 'blur' }],
  price: [{ required: true, message: '请输入销售价格', trigger: 'blur' }],
  commissionRate: [{ required: true, message: '请设置佣金比例', trigger: 'blur' }],
  stock: [{ required: true, message: '请输入库存数量', trigger: 'blur' }]
}

// 模拟商品数据
const productList = ref([
  {
    id: 1,
    name: '新鲜草莓',
    category: '水果',
    image: 'https://picsum.photos/200/200?random=1',
    price: 29.9,
    commissionRate: 0.12,
    stock: 150,
    sales: 286,
    status: 1,
    description: '新鲜采摘，香甜可口'
  },
  {
    id: 2,
    name: '有机蔬菜包',
    category: '蔬菜',
    image: 'https://picsum.photos/200/200?random=2',
    price: 49.9,
    commissionRate: 0.15,
    stock: 80,
    sales: 198,
    status: 1,
    description: '5种时令蔬菜组合'
  },
  {
    id: 3,
    name: '进口车厘子',
    category: '水果',
    image: 'https://picsum.photos/200/200?random=3',
    price: 89.0,
    commissionRate: 0.10,
    stock: 45,
    sales: 156,
    status: 1,
    description: '智利进口，颗粒饱满'
  },
  {
    id: 4,
    name: '鲜牛奶',
    category: '乳制品',
    image: 'https://picsum.photos/200/200?random=4',
    price: 48.8,
    commissionRate: 0.12,
    stock: 200,
    sales: 342,
    status: 1,
    description: '每日新鲜配送'
  },
  {
    id: 5,
    name: '土鸡蛋',
    category: '肉蛋禽',
    image: 'https://picsum.photos/200/200?random=5',
    price: 32.9,
    commissionRate: 0.15,
    stock: 120,
    sales: 267,
    status: 1,
    description: '散养土鸡蛋30枚装'
  },
  {
    id: 6,
    name: '新鲜蓝莓',
    category: '水果',
    image: 'https://picsum.photos/200/200?random=6',
    price: 45.0,
    commissionRate: 0.12,
    stock: 60,
    sales: 134,
    status: 1,
    description: '进口蓝莓，果实饱满'
  },
  {
    id: 7,
    name: '五常大米',
    category: '粮油',
    image: 'https://picsum.photos/200/200?random=7',
    price: 68.0,
    commissionRate: 0.10,
    stock: 90,
    sales: 89,
    status: 1,
    description: '东北五常大米5kg装'
  },
  {
    id: 8,
    name: '新鲜猕猴桃',
    category: '水果',
    image: 'https://picsum.photos/200/200?random=8',
    price: 36.9,
    commissionRate: 0.12,
    stock: 85,
    sales: 176,
    status: 1,
    description: '陕西猕猴桃，酸甜适中'
  },
  {
    id: 9,
    name: '有机西红柿',
    category: '蔬菜',
    image: 'https://picsum.photos/200/200?random=9',
    price: 28.5,
    commissionRate: 0.15,
    stock: 30,
    sales: 145,
    status: 0,
    description: '有机种植，无农药残留'
  },
  {
    id: 10,
    name: '精品牛肉',
    category: '肉蛋禽',
    image: 'https://picsum.photos/200/200?random=10',
    price: 118.0,
    commissionRate: 0.08,
    stock: 25,
    sales: 67,
    status: 0,
    description: '精选牛肉，口感鲜嫩'
  }
])

// 模拟销售记录
const mockSalesData = ref([
  { date: '2024-02-24', quantity: 15, amount: 448.5, commission: 53.82 },
  { date: '2024-02-23', quantity: 22, amount: 657.8, commission: 78.94 },
  { date: '2024-02-22', quantity: 18, amount: 538.2, commission: 64.58 },
  { date: '2024-02-21', quantity: 12, amount: 358.8, commission: 43.06 },
  { date: '2024-02-20', quantity: 20, amount: 598.0, commission: 71.76 }
])

const handleSearch = () => {
  loading.value = true
  setTimeout(() => {
    ElMessage.success('搜索完成')
    loading.value = false
  }, 500)
}

const handleReset = () => {
  searchForm.name = ''
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
    image: '',
    price: 0,
    commissionRate: 12,
    stock: 100,
    description: '',
    status: 1
  })
  dialogVisible.value = true
}

const handleEdit = (row: any) => {
  dialogTitle.value = '编辑商品'
  Object.assign(formData, {
    ...row,
    commissionRate: row.commissionRate * 100
  })
  dialogVisible.value = true
}

const handleSubmit = async () => {
  if (!formRef.value) return
  await formRef.value.validate((valid) => {
    if (valid) {
      const isEdit = formData.id > 0
      if (isEdit) {
        // 更新商品
        const product = productList.value.find(p => p.id === formData.id)
        if (product) {
          Object.assign(product, {
            ...formData,
            commissionRate: formData.commissionRate / 100
          })
        }
        ElMessage.success('商品更新成功')
      } else {
        // 添加商品
        const newProduct = {
          ...formData,
          id: productList.value.length + 1,
          sales: 0,
          commissionRate: formData.commissionRate / 100
        }
        productList.value.push(newProduct)
        pagination.total++
        ElMessage.success('商品添加成功')
      }
      dialogVisible.value = false
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
    .then(() => {
      row.status = row.status === 1 ? 0 : 1
      ElMessage.success(`${action}成功`)
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
    .then(() => {
      const index = productList.value.findIndex(p => p.id === row.id)
      if (index > -1) {
        productList.value.splice(index, 1)
        pagination.total--
        ElMessage.success('删除成功')
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
  formData.image = `https://picsum.photos/200/200?random=${Date.now()}`
  ElMessage.success('已设置默认图片')
}
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
