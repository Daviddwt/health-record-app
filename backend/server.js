const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
const FormData = require('form-data');

const app = express();
const PORT = process.env.PORT || process.env.UPLOAD_PORT || 3001;

// 配置
const UPLOAD_BASE_DIR = '/home/ubuntu/healthapp/uploads';
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

// 阿里云 DashScope API Key (Qwen-VL 视觉模型)
const DASHSCOPE_API_KEY = process.env.DASHSCOPE_API_KEY;

if (!DASHSCOPE_API_KEY || !DASHSCOPE_API_KEY.trim()) {
  console.error('Error: DASHSCOPE_API_KEY environment variable is required. Set it before starting the backend.');
  process.exit(1);
}

// 允许的文件类型
const ALLOWED_TYPES = {
  images: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  audio: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4', 'audio/m4a'],
  documents: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'text/csv', 'application/json']
};

// 中间件
app.use(cors());
app.use(express.json());

// 存储配置
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const category = req.params.category || 'documents';
    const uploadDir = path.join(UPLOAD_BASE_DIR, category);
    
    // 确保目录存在
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // 生成唯一文件名
    const ext = path.extname(file.originalname);
    const filename = `${uuidv4()}${ext}`;
    cb(null, filename);
  }
});

// 文件过滤
const fileFilter = (req, file, cb) => {
  const category = req.params.category || 'documents';
  const allowedTypes = ALLOWED_TYPES[category] || ALLOWED_TYPES.documents;
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`不允许的文件类型：${file.mimetype}`), false);
  }
};

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter
});

// ========== AI 医疗图片识别功能 (Qwen-VL) ==========

/**
 * 调用阿里云 Qwen-VL 视觉大模型分析医疗图片
 * @param {string} imageUrl - 图片的公网 URL
 * @returns {Promise<Object>} - 结构化的医疗数据
 */
async function analyzeMedicalImage(imageUrl) {
  const prompt = `你是一位专业的医疗文书识别助手。请仔细分析这张医疗图片（可能是化验单、病历、诊断证明等），并提取以下关键信息。
  
请严格按照 JSON 格式返回，不要包含任何 Markdown 或其他文字。如果某个字段无法识别，请返回 null。

{
  "documentType": "文档类型（如：化验单/病历/诊断证明/处方/检查报告/其他）",
  "hospital": "医院名称",
  "date": "就诊日期（格式：YYYY-MM-DD）",
  "department": "科室",
  "patientName": "患者姓名",
  "patientGender": "性别",
  "patientAge": "年龄",
  "chiefComplaint": "主诉（患者主要症状）",
  "diagnosis": "诊断结果",
  "testItems": [
    {
      "itemName": "检查/化验项目名称",
      "result": "结果值",
      "unit": "单位",
      "referenceRange": "参考范围",
      "abnormal": true/false（是否异常）
    }
  ],
  "medications": [
    {
      "drugName": "药品名称",
      "dosage": "剂量",
      "frequency": "用法用量"
    }
  ],
  "doctorAdvice": "医嘱/建议",
  "doctorName": "医生姓名",
  "rawText": "图片中的完整文字内容（OCR 原文）"
}

注意：
1. 如果是化验单，请重点提取 testItems 数组
2. 如果是病历，请重点提取 chiefComplaint 和 diagnosis
3. 如果是处方，请重点提取 medications 数组
4. 所有字段如果无法识别请返回 null，不要编造`;

  try {
    const response = await axios.post(
      'https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation',
      {
        model: 'qwen-vl-max-latest',
        input: {
          messages: [
            {
              role: 'user',
              content: [
                { image: imageUrl },
                { text: prompt }
              ]
            }
          ]
        },
        parameters: {
          temperature: 0.1,
          max_tokens: 2048
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${DASHSCOPE_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    if (response.data && response.data.output && response.data.output.text) {
      // 尝试解析返回的 JSON
      let resultText = response.data.output.text.trim();
      
      // 移除可能的 Markdown 代码块标记
      resultText = resultText.replace(/^```json\s*/i, '').replace(/\s*```$/i, '');
      resultText = resultText.replace(/^```\s*/i, '').replace(/\s*```$/i, '');
      
      try {
        const parsed = JSON.parse(resultText);
        return { success: true, data: parsed };
      } catch (parseError) {
        console.error('JSON 解析失败:', parseError, '原始返回:', resultText);
        return { 
          success: false, 
          error: 'AI 返回格式解析失败', 
          rawResponse: resultText 
        };
      }
    } else {
      return { success: false, error: 'AI 服务返回异常', rawResponse: response.data };
    }
  } catch (error) {
    console.error('Qwen-VL API 调用失败:', error.message);
    if (error.response) {
      console.error('API 响应状态:', error.response.status);
      console.error('API 响应内容:', JSON.stringify(error.response.data));
    }
    return { 
      success: false, 
      error: `AI 服务调用失败：${error.message}`,
      statusCode: error.response?.status
    };
  }
}

// ========== 路由接口 ==========

// 上传接口
app.post('/upload/:category?', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '没有文件上传' });
    }
    
    const category = req.params.category || 'documents';
    const fileUrl = `/files/${category}/${req.file.filename}`;
    const publicUrl = `${'http://141.148.169.133:3001'}${fileUrl}`;
    
    // 记录上传日志
    const logEntry = {
      timestamp: new Date().toISOString(),
      originalName: req.file.originalname,
      filename: req.file.filename,
      category,
      size: req.file.size,
      mimetype: req.file.mimetype,
      url: publicUrl
    };
    
    console.log('Upload:', JSON.stringify(logEntry));
    
    res.json({
      success: true,
      data: {
        url: publicUrl,
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        category,
        uploadTime: logEntry.timestamp
      }
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 【新增】AI 医疗图片识别接口
app.post('/api/analyze-medical-image', async (req, res) => {
  try {
    const { imageUrl } = req.body;
    
    if (!imageUrl) {
      return res.status(400).json({ error: '缺少 imageUrl 参数' });
    }
    
    console.log('🔍 开始分析医疗图片:', imageUrl);
    
    // 调用 Qwen-VL 进行分析
    const result = await analyzeMedicalImage(imageUrl);
    
    if (result.success) {
      console.log('✅ 图片分析成功:', JSON.stringify(result.data, null, 2));
      res.json({
        success: true,
        message: '图片识别成功',
        data: result.data
      });
    } else {
      console.error('❌ 图片分析失败:', result.error);
      res.status(500).json({
        success: false,
        error: result.error,
        rawResponse: result.rawResponse
      });
    }
  } catch (error) {
    console.error('分析接口异常:', error);
    res.status(500).json({ error: error.message });
  }
});

// 【新增】上传并分析一体化接口（前端一步调用）
app.post('/api/upload-and-analyze', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '没有文件上传' });
    }
    
    const category = req.params.category || 'documents';
    const fileUrl = `/files/${category}/${req.file.filename}`;
    const publicUrl = `${'http://141.148.169.133:3001'}${fileUrl}`;
    
    console.log('📤 文件上传成功，开始 AI 分析...');
    
    // 如果是图片，自动调用 AI 分析
    if (ALLOWED_TYPES.images.includes(req.file.mimetype)) {
      const analysisResult = await analyzeMedicalImage(publicUrl);
      
      if (analysisResult.success) {
        console.log('✅ 上传 + 分析完成');
        res.json({
          success: true,
          message: '上传并分析成功',
          upload: {
            url: publicUrl,
            filename: req.file.filename,
            originalName: req.file.originalname,
            size: req.file.size,
            category: 'images',
            uploadTime: new Date().toISOString()
          },
          analysis: analysisResult.data
        });
        return;
      } else {
        // 分析失败但上传成功
        console.warn('⚠️ 上传成功但 AI 分析失败:', analysisResult.error);
        res.json({
          success: true,
          message: '上传成功但 AI 分析失败',
          upload: {
            url: publicUrl,
            filename: req.file.filename,
            originalName: req.file.originalname,
            size: req.file.size,
            category: 'images',
            uploadTime: new Date().toISOString()
          },
          analysis: {
            error: analysisResult.error,
            rawResponse: analysisResult.rawResponse
          }
        });
        return;
      }
    }
    
    // 非图片文件，只返回上传结果
    res.json({
      success: true,
      message: '上传成功（非图片文件，跳过 AI 分析）',
      upload: {
        url: publicUrl,
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        category,
        uploadTime: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Upload+Analyze error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 静态文件服务
app.use('/files', express.static(path.join(UPLOAD_BASE_DIR)));

// 获取文件列表
app.get('/files/:category?', (req, res) => {
  try {
    const category = req.params.category || '';
    const searchDir = category ? path.join(UPLOAD_BASE_DIR, category) : UPLOAD_BASE_DIR;
    
    if (!fs.existsSync(searchDir)) {
      return res.json({ files: [] });
    }
    
    const files = [];
    
    const scanDir = (dir, prefix = '') => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          scanDir(path.join(dir, entry.name), path.join(prefix, entry.name));
        } else if (entry.isFile()) {
          const stat = fs.statSync(path.join(dir, entry.name));
          files.push({
            name: entry.name,
            path: path.join(prefix, entry.name),
            size: stat.size,
            modified: stat.mtime.toISOString()
          });
        }
      }
    };
    
    scanDir(searchDir);
    
    res.json({ files });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 删除文件
app.delete('/files/:category/:filename', (req, res) => {
  try {
    const { category, filename } = req.params;
    const filePath = path.join(UPLOAD_BASE_DIR, category, filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: '文件不存在' });
    }
    
    fs.unlinkSync(filePath);
    res.json({ success: true, message: '文件已删除' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// Notion Integration
const { Client } = require('@notionhq/client');
const notion = new Client({ auth: process.env.NOTION_API_KEY });
const VISITS_DB_ID = '31069dad-3bde-8045-bee6-d0540d483e51';

app.post('/api/visits', async (req, res) => {
  try {
    const { hospital, date, department, complaint, diagnosis, attachmentUrl } = req.body;
    
    const response = await notion.pages.create({
      parent: { database_id: VISITS_DB_ID },
      properties: {
        '医院': { rich_text: [{ text: { content: hospital || '' } }] },
        '日期': { date: date ? { start: date } : null },
        '科室': { rich_text: [{ text: { content: department || '' } }] },
        '主诉': { rich_text: [{ text: { content: complaint || '' } }] },
        '诊断': { rich_text: [{ text: { content: diagnosis || '' } }] },
        '附件链接': attachmentUrl ? { url: attachmentUrl } : { url: null }
      }
    });
    
    res.json({ success: true, data: response });
  } catch (error) {
    console.error('Notion Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 错误处理
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: `文件太大，最大允许 ${MAX_FILE_SIZE / 1024 / 1024}MB` });
    }
    return res.status(400).json({ error: err.message });
  }
  console.error('Server error:', err);
  res.status(500).json({ error: error.message || '服务器错误' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Upload server running on port ${PORT}`);
  console.log(`📁 Upload directory: ${UPLOAD_BASE_DIR}`);
  console.log(`🌐 Public URL: http://141.148.169.133:3001`);
  console.log(`🤖 AI 医疗图片识别：已启用 (Qwen-VL-Max)`);
});
