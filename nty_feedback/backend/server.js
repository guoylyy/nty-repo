const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const axios = require('axios');

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('../public'));

// 健康检查端点
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Hotpot review generator API is running' });
});

// 生成好评文案的端点
app.post('/api/generate-review', async (req, res) => {
  try {
    const { prompt, temperature = 0.7, max_tokens = 300 } = req.body;

    // 如果没有提供 prompt，使用默认提示
    const defaultPrompt = `请生成一段关于牛踏云黄牛肉火锅店的好评，字数在100到150字之间。要求：
1. 描述火锅店的环境干净、服务态度好、食材新鲜度。
2. 提到具体的菜品推荐（如吊龙、牛腱、黑虎虾滑等）。
3. 表达出会再次光顾的意愿。
4. 语言生动，有感染力，符合大众点评的风格。`;

    const finalPrompt = prompt || defaultPrompt;

    // 检查是否有 API 密钥
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ 
        error: '服务器未配置 Deepseek API 密钥，请管理员在 .env 文件中设置 DEEPSEEK_API_KEY' 
      });
    }

    // 调用 Deepseek API
    const response = await axios.post(
      'https://api.deepseek.com/v1/chat/completions',
      {
        model: 'deepseek-chat',
        messages: [
          {
            role: 'user',
            content: finalPrompt
          }
        ],
        temperature: temperature,
        max_tokens: max_tokens,
        stream: false
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        }
      }
    );

    const review = response.data.choices[0].message.content.trim();
    res.json({ review });

  } catch (error) {
    console.error('生成评论时出错:', error.message);
    res.status(500).json({ 
      error: '生成评论失败',
      details: error.message 
    });
  }
});

// 启动服务器
app.listen(port, () => {
  console.log(`服务器运行在 http://localhost:${port}`);
  console.log(`API 文档:
  GET  /api/health          健康检查
  POST /api/generate-review 生成火锅店好评`);
});
