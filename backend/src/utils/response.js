/**
 * 统一响应格式
 */

const success = (data = null, message = '操作成功') => {
  return {
    code: 200,
    message,
    data
  }
}

const error = (message = '操作失败', code = 500, data = null) => {
  return {
    code,
    message,
    data
  }
}

const paginate = (data, total, page, pageSize) => {
  return {
    code: 200,
    message: '查询成功',
    data: {
      list: data,
      pagination: {
        total,
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        totalPages: Math.ceil(total / pageSize)
      }
    }
  }
}

module.exports = {
  success,
  error,
  paginate
}
