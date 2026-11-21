# 健康档案小程序 - Health Record Mini Program

AI 驱动的个人健康档案管理工具，支持医疗图片智能识别和自动填表。

## ✨ 功能特性

- 📷 **AI 图片识别**：上传化验单/病历/处方，自动提取关键信息
- 📋 **就诊记录管理**：完整记录医院、科室、医生、诊断信息
- 💊 **用药清单跟踪**：记录用药详情和服用情况
- 🧪 **化验指标追踪**：记录和分析化验检查结果
- 📊 **Notion 集成**：数据自动同步到 Notion 数据库
- 🎨 **响应式设计**：支持手机和桌面浏览器访问

## 🏗️ 项目结构

```
healthapp/
├── backend/              # 后端 API 服务 (端口 3001)
│   ├── server.js        # 主服务器 (AI 识别 + Notion 集成)
│   ├── package.json     # 依赖配置
│   └── uploads/         # 上传文件存储
│
└── frontend/            # 前端 H5 服务 (端口 8888)
    ├── index.html       # 主页面
    ├── server.js        # 静态文件服务器
    └── package.json     # 依赖配置
```

## 🚀 快速开始

### 环境要求
- Node.js 16+
- Notion API Key
- 阿里云 DashScope API Key (Qwen-VL 图片识别，必填)

### 安装步骤

1. **克隆项目**
```bash
git clone <your-repo-url>
cd healthapp
```

2. **安装后端依赖**
```bash
cd backend
npm install
```

3. **安装前端依赖**
```bash
cd ../frontend
npm install
```

4. **配置环境变量**

在启动后端的终端中设置环境变量（也可通过进程管理器注入）：
```bash
export NOTION_API_KEY=your_notion_api_key
export DASHSCOPE_API_KEY=your_dashscope_api_key
```

后端仅从环境变量读取密钥，不会自动加载 `.env` 文件。缺少或留空 `DASHSCOPE_API_KEY` 时，后端会输出明确错误并以非零状态退出。请勿将真实密钥提交到仓库。

5. **启动服务**

启动后端：
```bash
cd backend
node server.js
```

启动前端（新终端）：
```bash
cd frontend
node server.js
```

6. **访问应用**
- 前端：http://localhost:8888
- 后端 API：http://localhost:3001

## 📱 使用说明

1. **添加就诊记录**
   - 点击右下角"+"悬浮按钮
   - 选择"手动输入"或"AI 识别"
   - 填写或上传图片自动填充

2. **AI 图片识别**
   - 支持化验单、病历、处方等医疗文档
   - 自动提取医院、科室、诊断、化验指标等信息
   - 识别结果可编辑后保存

3. **数据同步**
   - 所有数据自动同步到 Notion 数据库
   - 支持三个数据库：就诊记录、用药清单、化验指标

## 🔑 API 端点

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/upload-and-analyze` | POST | 上传图片并 AI 分析 |
| `/api/visits` | POST | 创建就诊记录 |
| `/api/visits` | GET | 获取就诊记录列表 |
| `/api/medications` | POST | 创建用药记录 |
| `/api/lab-results` | POST | 创建化验记录 |

## 🛠️ 技术栈

**前端**
- HTML5 + CSS3
- Vanilla JavaScript
- Express.js (静态文件服务)

**后端**
- Node.js + Express.js
- 阿里云 Qwen-VL (图片识别)
- Notion API (数据存储)
- Multer (文件上传)

## 📝 数据库配置

在 Notion 中创建三个数据库，字段参考：

### 1. 就诊记录 (Visits)
- Date (日期)
- Hospital (标题)
- Department (文本)
- Doctor (文本)
- Complaint (文本)
- Diagnosis (文本)
- Attachments (文件)

### 2. 用药清单 (Medications)
- Name (标题)
- Dosage (文本)
- Frequency (文本)
- StartDate (日期)
- EndDate (日期)

### 3. 化验指标 (Lab Results)
- TestName (标题)
- Result (文本)
- Unit (文本)
- ReferenceRange (文本)
- Date (日期)
- Abnormal (复选框)

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT License

## 📞 联系

如有问题，请通过 GitHub Issues 联系。

---

**Made with ❤️ by 秦哥 & 小甲**
