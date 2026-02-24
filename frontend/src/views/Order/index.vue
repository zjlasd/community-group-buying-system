<template>
  <div class="order-container">
    <el-card shadow="hover">
      <!-- 搜索区域 -->
      <el-form :inline="true" :model="searchForm" class="search-form">
        <el-form-item label="日期范围">
          <el-date-picker
            v-model="searchForm.dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            value-format="YYYY-MM-DD"
          />
        </el-form-item>

        <el-form-item label="订单状态">
          <el-select v-model="searchForm.status" placeholder="全部" clearable style="width: 150px">
            <el-option label="全部" value="" />
            <el-option label="待确认" :value="0" />
            <el-option label="已确认" :value="1" />
            <el-option label="配送中" :value="2" />
            <el-option label="已完成" :value="3" />
            <el-option label="已取消" :value="4" />
          </el-select>
        </el-form-item>

        <el-form-item label="团长">
          <el-select
            v-model="searchForm.leaderId"
            placeholder="全部"
            clearable
            style="width: 150px"
          >
            <el-option label="全部" value="" />
            <el-option label="张阿姨" value="1" />
            <el-option label="李叔叔" value="2" />
            <el-option label="王大姐" value="3" />
          </el-select>
        </el-form-item>

        <el-form-item label="关键词">
          <el-input
            v-model="searchForm.keyword"
            placeholder="订单号/用户姓名"
            clearable
            style="width: 200px"
          />
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
        <el-button type="success" @click="handleExport">
          <el-icon><Download /></el-icon>
          导出配送清单
        </el-button>
        <el-button type="primary" @click="handleExportOrders">
          <el-icon><Document /></el-icon>
          导出订单数据
        </el-button>
      </div>

      <!-- 订单列表 -->
      <el-table :data="orderList" style="width: 100%; margin-top: 20px" stripe>
        <el-table-column prop="orderNo" label="订单号" width="180" />
        <el-table-column prop="leaderName" label="团长" width="100" />
        <el-table-column prop="communityName" label="社区" width="120" />
        <el-table-column prop="userName" label="下单用户" width="100" />
        <el-table-column prop="userPhone" label="联系电话" width="120" />
        <el-table-column prop="totalAmount" label="订单金额" width="100">
          <template #default="{ row }">
            <span style="color: #67c23a">¥{{ row.totalAmount.toFixed(2) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="commissionAmount" label="佣金" width="100">
          <template #default="{ row }">
            <span style="color: #409eff">¥{{ row.commissionAmount.toFixed(2) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)">
              {{ getStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="orderDate" label="下单时间" width="120" />
        <el-table-column label="操作" fixed="right" width="150">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="handleView(row)">详情</el-button>
            <el-button link type="success" size="small" @click="handleEdit(row)">编辑</el-button>
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
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { ElMessage } from 'element-plus'

// 搜索表单
const searchForm = reactive({
  dateRange: [],
  status: '',
  leaderId: '',
  keyword: ''
})

// 分页
const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 100
})

// 订单列表数据（模拟）
const orderList = ref([
  {
    id: 1,
    orderNo: 'ORD202602240001',
    leaderName: '张阿姨',
    communityName: '阳光小区',
    userName: '李大爷',
    userPhone: '13800138001',
    totalAmount: 125.5,
    commissionAmount: 15.06,
    status: 3,
    orderDate: '2026-02-24'
  },
  {
    id: 2,
    orderNo: 'ORD202602240002',
    leaderName: '李叔叔',
    communityName: '幸福小区',
    userName: '王女士',
    userPhone: '13800138002',
    totalAmount: 89.0,
    commissionAmount: 8.9,
    status: 2,
    orderDate: '2026-02-24'
  },
  {
    id: 3,
    orderNo: 'ORD202602240003',
    leaderName: '张阿姨',
    communityName: '阳光小区',
    userName: '赵先生',
    userPhone: '13800138003',
    totalAmount: 156.8,
    commissionAmount: 18.82,
    status: 1,
    orderDate: '2026-02-24'
  },
  {
    id: 4,
    orderNo: 'ORD202602240004',
    leaderName: '王大姐',
    communityName: '和谐社区',
    userName: '刘阿姨',
    userPhone: '13800138004',
    totalAmount: 78.5,
    commissionAmount: 9.42,
    status: 3,
    orderDate: '2026-02-24'
  },
  {
    id: 5,
    orderNo: 'ORD202602230001',
    leaderName: '张阿姨',
    communityName: '阳光小区',
    userName: '周大爷',
    userPhone: '13800138005',
    totalAmount: 198.0,
    commissionAmount: 23.76,
    status: 3,
    orderDate: '2026-02-23'
  }
])

// 获取状态类型
const getStatusType = (status: number) => {
  const types = ['warning', 'primary', 'success', 'info', 'danger']
  return types[status] || 'info'
}

// 获取状态文本
const getStatusText = (status: number) => {
  const texts = ['待确认', '已确认', '配送中', '已完成', '已取消']
  return texts[status] || '未知'
}

// 搜索
const handleSearch = () => {
  ElMessage.success('查询成功')
  // 实际项目中这里调用接口
}

// 重置
const handleReset = () => {
  searchForm.dateRange = []
  searchForm.status = ''
  searchForm.leaderId = ''
  searchForm.keyword = ''
  ElMessage.info('已重置')
}

// 导出配送清单
const handleExport = () => {
  ElMessage.success('配送清单导出成功')
  // 实际项目中这里调用导出接口
}

// 导出订单数据
const handleExportOrders = () => {
  ElMessage.success('订单数据导出成功')
}

// 查看详情
const handleView = (row: any) => {
  ElMessage.info(`查看订单: ${row.orderNo}`)
}

// 编辑
const handleEdit = (row: any) => {
  ElMessage.info(`编辑订单: ${row.orderNo}`)
}
</script>

<style scoped>
.order-container {
  width: 100%;
}

.search-form {
  margin-bottom: 20px;
}

.toolbar {
  margin-bottom: 10px;
}
</style>
