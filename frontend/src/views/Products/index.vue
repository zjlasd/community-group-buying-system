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
            <span class="price">¥{{ Number(row.price).toFixed(2) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="您的佣金" width="180">
          <template #default="{ row }">
            <div style="display: flex; flex-direction: column; gap: 6px">
              <!-- 实际佣金 -->
              <div style="display: flex; align-items: center; gap: 8px">
                <span style="font-weight: bold; color: #e6a23c; font-size: 16px">
                  ¥{{ Number(calculateActualCommission(row) || 0).toFixed(2) }}
                </span>
                <el-tag v-if="userStore.userInfo?.bonusRate && Number(userStore.userInfo.bonusRate) > 0" type="success" size="small">
                  +{{ Number(userStore.userInfo.bonusRate).toFixed(0) }}%
                </el-tag>
              </div>
              <!-- 基础佣金 -->
              <span style="font-size: 12px; color: #909399">
                基础: ¥{{ (Number(row.commissionAmount) || 0).toFixed(2) }}
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
          ¥{{ Number(currentProduct.price).toFixed(2) }}
        </el-descriptions-item>
        <el-descriptions-item label="库存">{{ currentProduct.stock }}</el-descriptions-item>
        <el-descriptions-item label="商品基础佣金">
          ¥{{ Number(currentProduct.commissionAmount || 0).toFixed(2) }}
        </el-descriptions-item>
        <el-descriptions-item label="您的佣金">
          <span class="commission">
            ¥{{ Number(calculateActualCommission(currentProduct) || 0).toFixed(2) }}
            <el-tag v-if="userStore.userInfo?.bonusRate && userStore.userInfo.bonusRate > 0" type="success" size="small" style="margin-left: 8px">
              +{{ Number(userStore.userInfo.bonusRate).toFixed(0) }}% 加成
            </el-tag>
          </span>
        </el-descriptions-item>
        <el-descriptions-item label="商品描述" :span="2">
          {{ currentProduct.description }}
        </el-descriptions-item>
      </el-descriptions>
      <template #footer>
        <el-button @click="detailDialogVisible = false">关闭</el-button>
        <el-button type="primary" @click="handleShareFromDetail">立即推广</el-button>
      </template>
    </el-dialog>

    <!-- 推广分享对话框 -->
    <el-dialog v-model="shareDialogVisible" title="推广商品" width="600px">
      <div v-if="currentProduct" class="share-content">
        <!-- 团长ID缺失警告 -->
        <el-alert
          v-if="!userStore.userInfo?.leaderId"
          type="error"
          :closable="false"
          style="margin: 20px 0"
          title="⚠️ 推广链接缺少团长信息"
        >
          <div style="line-height: 1.8">
            <p>推广链接中缺少团长ID，无法追踪订单来源和计算佣金。</p>
            <p style="margin-top: 8px">
              <strong>解决方法：</strong>请点击右上角退出登录，然后重新登录。
            </p>
          </div>
        </el-alert>

        <!-- 商品预览卡片 -->
        <el-card class="product-preview" shadow="never">
          <div class="preview-header">
            <el-image 
              :src="currentProduct.imageUrl" 
              fit="cover"
              style="width: 80px; height: 80px; border-radius: 8px"
            >
              <template #error>
                <div class="image-slot">
                  <el-icon><icon-picture /></el-icon>
                </div>
              </template>
            </el-image>
            <div class="preview-info">
              <div class="product-name">{{ currentProduct.name }}</div>
              <div class="product-price">¥{{ Number(currentProduct.price).toFixed(2) }}</div>
            </div>
          </div>
        </el-card>

        <!-- 佣金信息 -->
        <el-alert
          type="success"
          :closable="false"
          style="margin: 20px 0"
        >
          <template #title>
            <div style="display: flex; align-items: center; justify-content: space-between">
              <span>推广此商品可获得佣金</span>
              <span style="font-size: 24px; font-weight: bold; color: #67c23a">
                ¥{{ Number(calculateActualCommission(currentProduct) || 0).toFixed(2) }}
              </span>
            </div>
            <div style="font-size: 12px; color: #909399; margin-top: 8px">
              基础佣金 ¥{{ Number(currentProduct.commissionAmount || 0).toFixed(2) }}
              <el-tag 
                v-if="userStore.userInfo?.bonusRate && userStore.userInfo.bonusRate > 0" 
                type="success" 
                size="small" 
                style="margin-left: 8px"
              >
                +{{ Number(userStore.userInfo.bonusRate).toFixed(0) }}% 等级加成
              </el-tag>
            </div>
          </template>
        </el-alert>

        <!-- 推广链接 -->
        <div class="share-link-box">
          <div class="link-label">推广链接</div>
          <el-input
            v-model="shareLink"
            readonly
          >
            <template #append>
              <el-button @click="copyLink" type="primary">复制链接</el-button>
            </template>
          </el-input>
          <!-- 调试信息 -->
          <div style="margin-top: 8px; font-size: 12px; color: #909399">
            <span>团长ID: {{ userStore.userInfo?.leaderId || '未找到' }}</span>
            <span style="margin-left: 16px">商品ID: {{ currentProduct.id }}</span>
          </div>
        </div>

        <!-- 推广提示 -->
        <div class="share-tips">
          <el-icon color="#409EFF"><InfoFilled /></el-icon>
          <span>将此链接分享给客户，客户通过该链接下单后，佣金将自动计入您的账户</span>
        </div>
      </div>
      <template #footer>
        <el-button @click="shareDialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Search, Refresh, View, Share, InfoFilled, Picture as IconPicture } from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'
import { getProducts } from '@/api/product'

const userStore = useUserStore()
const loading = ref(false)
const detailDialogVisible = ref(false)
const shareDialogVisible = ref(false)
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
const productList = ref<any[]>([])

// 生成推广链接
const shareLink = computed(() => {
  if (!currentProduct.value) return ''
  // 获取团长ID（优先从leaderInfo.id获取，兼容旧版从leaderId获取）
  const leaderId = userStore.userInfo?.leaderInfo?.id || userStore.userInfo?.leaderId || ''
  if (!leaderId) {
    console.warn('未找到团长ID，推广链接可能无法正确追踪')
  }
  // 生成包含团长ID和商品ID的推广链接
  // 实际项目中应该是C端小程序或H5的地址
  const baseUrl = import.meta.env.VITE_APP_SHOP_URL || 'https://shop.example.com'
  return `${baseUrl}/product/${currentProduct.value.id}?leader=${leaderId}&from=share`
})

// 计算团长实际佣金: 基础佣金 × (1 + 加成比例 / 100)
const calculateActualCommission = (product: any): number => {
  // 更严格的参数校验
  if (!product || typeof product !== 'object') {
    console.warn('calculateActualCommission: 无效的product参数', product)
    return 0
  }
  
  try {
    const baseCommission = Number(product.commissionAmount) || 0
    const bonusRate = Number(userStore.userInfo?.bonusRate) || 0
    const result = baseCommission * (1 + bonusRate / 100)
    
    // 确保返回的是有效数字
    if (isNaN(result) || !isFinite(result)) {
      console.warn('calculateActualCommission: 计算结果无效', { baseCommission, bonusRate, result })
      return 0
    }
    
    return result
  } catch (error) {
    console.error('calculateActualCommission: 计算异常', error)
    return 0
  }
}

// 获取商品列表
const fetchProductList = async () => {
  loading.value = true
  try {
    const res = await getProducts({
      status: '1', // 只显示在售商品
      keyword: searchForm.keyword,
      category: searchForm.category,
      page: 1,
      pageSize: 100
    })
    productList.value = res.data.list || []
  } catch (err) {
    ElMessage.error('获取商品列表失败')
    console.error('获取商品失败:', err)
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  fetchProductList()
}

const handleReset = () => {
  searchForm.category = ''
  searchForm.keyword = ''
  fetchProductList()
}

// 页面加载时获取数据
onMounted(() => {
  fetchProductList()
})

const viewDetail = (row: any) => {
  currentProduct.value = row
  detailDialogVisible.value = true
}

const shareProduct = (row: any) => {
  currentProduct.value = row
  
  // 检查团长ID
  const leaderId = userStore.userInfo?.leaderId
  if (!leaderId) {
    console.warn('=== 推广链接调试信息 ===')
    console.warn('⚠️ 未找到团长ID，推广链接无法正确追踪')
    console.warn('用户信息:', userStore.userInfo)
    console.warn('localStorage:', localStorage.getItem('userInfo'))
    console.warn('解决方法: 请退出并重新登录')
    
    ElMessage.warning({
      message: '推广链接缺少团长信息，请退出并重新登录',
      duration: 5000,
      showClose: true
    })
  }
  
  shareDialogVisible.value = true
}

const copyLink = () => {
  navigator.clipboard.writeText(shareLink.value).then(() => {
    ElMessage.success('推广链接已复制到剪贴板')
  })
}

// 从详情页跳转到推广页
const handleShareFromDetail = () => {
  detailDialogVisible.value = false
  shareDialogVisible.value = true
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

/* 推广分享弹窗样式 */
.share-content {
  padding: 10px 0;
}

.product-preview {
  margin-bottom: 20px;
}

.preview-header {
  display: flex;
  gap: 16px;
  align-items: center;
}

.preview-info {
  flex: 1;
}

.product-name {
  font-size: 16px;
  font-weight: bold;
  color: #303133;
  margin-bottom: 8px;
}

.product-price {
  font-size: 20px;
  font-weight: bold;
  color: #f56c6c;
}

.share-link-box {
  margin: 20px 0;
}

.link-label {
  font-size: 14px;
  font-weight: bold;
  color: #303133;
  margin-bottom: 8px;
}

.image-slot {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 100%;
  background-color: #f5f7fa;
  color: #909399;
  font-size: 30px;
}
</style>
