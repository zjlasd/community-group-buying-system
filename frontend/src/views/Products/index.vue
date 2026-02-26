<template>
  <div class="products">
    <el-card shadow="hover">
      <template #header>
        <div class="card-header">
          <span>可推广商品</span>
          <el-tag type="success">推广赚佣金</el-tag>
        </div>
      </template>

      <!-- 搜索栏 -->
      <el-form :inline="true" :model="searchForm" class="search-form">
        <el-form-item label="商品分类">
          <el-select v-model="searchForm.category" placeholder="全部分类" clearable style="width: 150px">
            <el-option label="水果" value="水果" />
            <el-option label="蔬菜" value="蔬菜" />
            <el-option label="肉禽蛋" value="肉禽蛋" />
            <el-option label="乳制品" value="乳制品" />
          </el-select>
        </el-form-item>
        <el-form-item label="关键词">
          <el-input
            v-model="searchForm.keyword"
            placeholder="商品名称"
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

      <!-- 商品列表 -->
      <el-table :data="productList" style="width: 100%; margin-top: 20px" v-loading="loading">
        <el-table-column label="商品图片" width="100">
          <template #default="{ row }">
            <el-image
              v-if="row.imageUrl"
              :src="row.imageUrl"
              :preview-src-list="[row.imageUrl]"
              fit="cover"
              style="width: 60px; height: 60px; border-radius: 4px"
            />
            <span v-else style="color: #ccc; font-size: 12px">暂无图片</span>
          </template>
        </el-table-column>
        <el-table-column prop="name" label="商品名称" width="180" />
        <el-table-column prop="category" label="分类" width="100" />
        <el-table-column prop="price" label="售价" width="120">
          <template #default="{ row }">
            <span class="price">¥{{ row.price.toFixed(2) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="您的佣金" width="180">
          <template #default="{ row }">
            <div style="display: flex; flex-direction: column; gap: 6px">
              <!-- 实际佣金 -->
              <div style="display: flex; align-items: center; gap: 8px">
                <span style="font-weight: bold; color: #e6a23c; font-size: 16px">
                  ¥{{ calculateActualCommission(row).toFixed(2) }}
                </span>
                <el-tag v-if="userStore.userInfo?.bonusRate && userStore.userInfo.bonusRate > 0" type="success" size="small">
                  +{{ userStore.userInfo.bonusRate.toFixed(0) }}%
                </el-tag>
              </div>
              <!-- 基础佣金 -->
              <span style="font-size: 12px; color: #909399">
                基础: ¥{{ (row.commissionAmount || 0).toFixed(2) }}
              </span>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="stock" label="库存" width="100">
          <template #default="{ row }">
            <el-tag :type="row.stock > 50 ? 'success' : row.stock > 0 ? 'warning' : 'danger'">
              {{ row.stock }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 1 ? 'success' : 'info'">
              {{ row.status === 1 ? '销售中' : '已下架' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="description" label="商品描述" min-width="150" show-overflow-tooltip />
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="viewDetail(row)">
              <el-icon><View /></el-icon>
              查看详情
            </el-button>
            <el-button
              v-if="row.status === 1"
              type="success"
              link
              @click="shareProduct(row)"
            >
              <el-icon><Share /></el-icon>
              推广分享
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

    <!-- 商品详情对话框 -->
    <el-dialog v-model="detailDialogVisible" title="商品详情" width="600px">
      <el-descriptions :column="2" border v-if="currentProduct">
        <el-descriptions-item label="商品名称" :span="2">{{ currentProduct.name }}</el-descriptions-item>
        <el-descriptions-item label="商品分类">{{ currentProduct.category }}</el-descriptions-item>
        <el-descriptions-item label="销售状态">
          <el-tag :type="currentProduct.status === 1 ? 'success' : 'info'">
            {{ currentProduct.status === 1 ? '销售中' : '已下架' }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="售价">
          ¥{{ currentProduct.price.toFixed(2) }}
        </el-descriptions-item>
        <el-descriptions-item label="库存">{{ currentProduct.stock }}</el-descriptions-item>
        <el-descriptions-item label="佣金比例">
          {{ (currentProduct.commissionRate * 100).toFixed(0) }}%
        </el-descriptions-item>
        <el-descriptions-item label="预估佣金">
          <span class="commission">
            ¥{{ (currentProduct.price * currentProduct.commissionRate).toFixed(2) }}
          </span>
        </el-descriptions-item>
        <el-descriptions-item label="商品描述" :span="2">
          {{ currentProduct.description }}
        </el-descriptions-item>
      </el-descriptions>
      
      <el-divider>推广信息</el-divider>
      <div class="share-info">
        <div class="share-item">
          <span class="label">推广链接：</span>
          <el-input
            v-model="shareLink"
            readonly
            style="width: 400px"
          >
            <template #append>
              <el-button @click="copyLink">复制</el-button>
            </template>
          </el-input>
        </div>
        <div class="share-tips">
          <el-icon><InfoFilled /></el-icon>
          将此链接分享给客户，客户通过该链接下单后，您将获得{{ (currentProduct.commissionRate * 100).toFixed(0) }}%的佣金
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()
const loading = ref(false)
const detailDialogVisible = ref(false)
const currentProduct = ref<any>(null)

const searchForm = reactive({
  category: '',
  keyword: ''
})

const pagination = reactive({
  page: 1,
  size: 10,
  total: 20
})

// 模拟商品数据
const productList = ref([
  {
    id: 1,
    name: '新鲜草莓',
    category: '水果',
    price: 29.9,
    commissionRate: 0.12,
    stock: 150,
    status: 1,
    description: '新鲜采摘，香甜多汁，单果重量15-20g'
  },
  {
    id: 2,
    name: '进口车厘子',
    category: '水果',
    price: 89.0,
    commissionRate: 0.15,
    stock: 80,
    status: 1,
    description: '智利进口，J级大果，色泽鲜艳，口感脆甜'
  },
  {
    id: 3,
    name: '有机蔬菜包',
    category: '蔬菜',
    price: 49.9,
    commissionRate: 0.10,
    stock: 200,
    status: 1,
    description: '5种时令蔬菜组合，无农药残留，新鲜配送'
  },
  {
    id: 4,
    name: '新鲜蓝莓',
    category: '水果',
    price: 45.0,
    commissionRate: 0.12,
    stock: 120,
    status: 1,
    description: '云南高原蓝莓，果肉饱满，酸甜适中'
  },
  {
    id: 5,
    name: '土鸡蛋',
    category: '肉禽蛋',
    price: 32.9,
    commissionRate: 0.10,
    stock: 300,
    status: 1,
    description: '农家散养土鸡蛋，30枚装，蛋黄金黄营养丰富'
  },
  {
    id: 6,
    name: '鲜牛奶',
    category: '乳制品',
    price: 48.8,
    commissionRate: 0.08,
    stock: 250,
    status: 1,
    description: '本地牧场直供，全程冷链，1L×6盒装'
  },
  {
    id: 7,
    name: '有机西兰花',
    category: '蔬菜',
    price: 18.8,
    commissionRate: 0.10,
    stock: 180,
    status: 1,
    description: '有机种植，花球紧实，营养价值高'
  },
  {
    id: 8,
    name: '三文鱼刺身',
    category: '肉禽蛋',
    price: 128.0,
    commissionRate: 0.15,
    stock: 50,
    status: 1,
    description: '挪威进口三文鱼，新鲜切片，500g装'
  },
  {
    id: 9,
    name: '红心火龙果',
    category: '水果',
    price: 36.8,
    commissionRate: 0.12,
    stock: 160,
    status: 1,
    description: '海南红心火龙果，果肉细腻，甜度高'
  },
  {
    id: 10,
    name: '酸奶',
    category: '乳制品',
    price: 38.8,
    commissionRate: 0.08,
    stock: 220,
    status: 1,
    description: '原味酸奶，益生菌发酵，12杯装'
  }
])

// 生成推广链接
const shareLink = computed(() => {
  if (!currentProduct.value) return ''
  const leaderId = userStore.userInfo?.leaderId || 1
  return `https://shop.example.com/product/${currentProduct.value.id}?leader=${leaderId}`
})

// 计算团长实际佣金: 基础佣金 × (1 + 加成比例 / 100)
const calculateActualCommission = (product: any) => {
  const baseCommission = product.commissionAmount || 0
  const bonusRate = userStore.userInfo?.bonusRate || 0
  return baseCommission * (1 + bonusRate / 100)
}

const handleSearch = () => {
  loading.value = true
  setTimeout(() => {
    loading.value = false
    ElMessage.success('搜索完成')
  }, 500)
}

const handleReset = () => {
  searchForm.category = ''
  searchForm.keyword = ''
  handleSearch()
}

const viewDetail = (row: any) => {
  currentProduct.value = row
  detailDialogVisible.value = true
}

const shareProduct = (row: any) => {
  currentProduct.value = row
  detailDialogVisible.value = true
}

const copyLink = () => {
  navigator.clipboard.writeText(shareLink.value).then(() => {
    ElMessage.success('推广链接已复制到剪贴板')
  })
}
</script>

<style scoped>
.products {
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

.price {
  color: #f56c6c;
  font-weight: bold;
  font-size: 16px;
}

.commission {
  color: #409eff;
  font-weight: bold;
}

.share-info {
  padding: 10px 0;
}

.share-item {
  display: flex;
  align-items: center;
  margin-bottom: 15px;
}

.share-item .label {
  font-weight: bold;
  margin-right: 10px;
  min-width: 80px;
}

.share-tips {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  background-color: #f4f4f5;
  border-radius: 4px;
  color: #606266;
  font-size: 14px;
}
</style>
