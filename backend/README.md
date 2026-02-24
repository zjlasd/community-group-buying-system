# 社区团购团长分销与订单汇总系统 - 后端API

## 技术栈

- **Node.js** 16.x+
- **Express.js** 4.x
- **MySQL** 8.0
- **Sequelize** (ORM)
- **JWT** (身份认证)
- **bcrypt** (密码加密)

## 快速开始

### 1. 安装依赖

```bash
cd backend
npm install
```

### 2. 配置环境变量

复制 `.env.example` 为 `.env` 并修改配置：

```bash
cp .env.example .env
```

修改 `.env` 文件中的数据库配置：

```
DB_HOST=localhost
DB_PORT=3306
DB_NAME=community_group_buying
DB_USER=root
DB_PASSWORD=your_password
```

### 3. 初始化数据库

确保 MySQL 已启动，然后运行：

```bash
# 创建数据库表
npm run init-db

# 填充测试数据
npm run seed
```

### 4. 启动服务

```bash
# 开发模式（自动重启）
npm run dev

# 生产模式
npm start
```

服务器将运行在 `http://localhost:3000`

## 测试账号

### 管理员
- 用户名: `admin`
- 密码: `admin123`

### 团长
- 用户名: `leader1` - `leader10`
- 密码: `leader123`

## API文档

### 认证相关

#### 登录
```
POST /api/auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "admin123"
}
```

响应：
```json
{
  "code": 200,
  "message": "登录成功",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "userInfo": {
      "id": 1,
      "username": "admin",
      "role": "admin",
      "realName": "系统管理员"
    }
  }
}
```

#### 注册（测试用）
```
POST /api/auth/register
Content-Type: application/json

{
  "username": "test",
  "password": "123456",
  "role": "leader",
  "realName": "测试用户",
  "phone": "13800138000"
}
```

#### 获取当前用户信息
```
GET /api/auth/profile
Authorization: Bearer <token>
```

### 其他API（待实现）

- `/api/users` - 用户管理
- `/api/leaders` - 团长管理
- `/api/products` - 商品管理
- `/api/orders` - 订单管理
- `/api/commissions` - 佣金管理
- `/api/withdrawals` - 提现管理

## 数据库结构

### 8张核心表

1. **users** - 用户表
2. **communities** - 社区表
3. **leaders** - 团长表
4. **products** - 商品表
5. **orders** - 订单表
6. **order_items** - 订单明细表
7. **commissions** - 佣金记录表
8. **withdrawals** - 提现申请表

## 项目结构

```
backend/
├── src/
│   ├── config/          # 配置文件
│   ├── models/          # 数据模型
│   ├── controllers/     # 控制器
│   ├── services/        # 业务服务
│   ├── middleware/      # 中间件
│   ├── routes/          # 路由
│   ├── utils/           # 工具函数
│   ├── scripts/         # 脚本
│   └── app.js           # 应用入口
├── logs/                # 日志文件
├── .env                 # 环境变量
├── .env.example         # 环境变量示例
├── package.json
└── README.md
```

## 开发说明

### 安全性

- ✅ 所有密码使用 bcrypt 加密
- ✅ JWT token 认证
- ✅ Sequelize 参数化查询防止 SQL 注入
- ✅ 动态排序字段白名单验证
- ✅ 角色权限控制

### 日志

日志文件位于 `logs/` 目录：
- `combined.log` - 所有日志
- `error.log` - 错误日志

### 调试

开发模式下，控制台会输出：
- SQL 查询语句
- 请求日志
- 错误堆栈

## 常见问题

### 1. 数据库连接失败

检查 `.env` 文件中的数据库配置是否正确，确保 MySQL 服务已启动。

### 2. 端口被占用

修改 `.env` 文件中的 `PORT` 配置。

### 3. JWT token 过期

默认过期时间为 7 天，可在 `.env` 中修改 `JWT_EXPIRES_IN`。

## License

MIT
