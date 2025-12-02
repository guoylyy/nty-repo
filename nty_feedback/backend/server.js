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

    // 如果没有提供 prompt，从多种风格中随机选择
    let finalPrompt;
    if (prompt) {
      finalPrompt = prompt;
    } else {
      // 8种不同风格的提示词，避免生成过于一致的评论
      const promptStyles = [
        // 风格1: 热情洋溢风格
        `请生成一段关于牛踏云黄牛肉火锅店的热情洋溢的好评，字数在120-180字。要求：
1. 使用感叹句和生动的形容词表达兴奋之情
2. 强调用餐体验的愉悦感和惊喜感
3. 具体描述2-3个特色菜品的独特之处
4. 表达强烈推荐给朋友的意愿
5. 语言充满活力和感染力`,

        // 风格2: 详细描述风格
        `请生成一段关于牛踏云黄牛肉火锅店的详细点评，字数在150-200字。要求：
1. 从环境、服务、菜品、性价比等多个维度详细评价
2. 具体描述店内装修、座位舒适度、音乐氛围等细节
3. 对食材的新鲜度、切工、摆盘进行专业评价
4. 提到服务员的具体服务细节（如主动加汤、介绍吃法等）
5. 语言客观、细致，有参考价值`,

        // 风格3: 简洁精炼风格
        `请生成一段关于牛踏云黄牛肉火锅店的简洁好评，字数在80-120字。要求：
1. 语言精炼，直击要点
2. 用最简洁的话表达核心优势
3. 重点突出1-2个最推荐的菜品
4. 表达会再次光顾的明确意愿
5. 避免冗长描述，干净利落`,

        // 风格4: 专业点评风格
        `请以美食博主的角度生成一段关于牛踏云黄牛肉火锅店的专业点评，字数在130-170字。要求：
1. 使用专业的美食评价术语（如口感层次、风味平衡等）
2. 对比同类火锅店的独特优势
3. 分析汤底的熬制工艺和风味特点
4. 对肉质等级和新鲜度进行专业判断
5. 给出改进建议和总体评分`,

        // 风格5: 朋友推荐风格
        `请以向朋友推荐的口吻生成一段关于牛踏云黄牛肉火锅店的点评，字数在110-160字。要求：
1. 使用亲切、自然的对话式语言
2. 像是私下分享美食发现一样真实
3. 强调"你一定要试试"的推荐感
4. 分享个人最喜欢的菜品和吃法
5. 提醒最佳用餐时间或预订建议`,

        // 风格6: 家庭用餐风格
        `请生成一段关于带家人到牛踏云黄牛肉火锅店用餐的点评，字数在140-190字。要求：
1. 强调餐厅对家庭用餐的友好度
2. 描述儿童餐椅、家庭套餐等家庭相关服务
3. 提到菜品适合不同年龄段家庭成员
4. 表达家庭聚会的温馨感受
5. 推荐适合家庭的座位区域或时段`

        
      ];

      // 随机选择一个风格
      const randomIndex = Math.floor(Math.random() * promptStyles.length);
      finalPrompt = promptStyles[randomIndex];
      console.log(`使用风格 ${randomIndex + 1} 生成评论`);
    }

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
    // 去除markdown标记
    const cleanReview = removeMarkdown(review);
    res.json({ review: cleanReview });

  } catch (error) {
    console.error('生成评论时出错:', error.message);
    res.status(500).json({ 
      error: '生成评论失败',
      details: error.message 
    });
  }
}

// 去除markdown标记的函数
function removeMarkdown(text) {
  if (!text) return text;
  
  let cleaned = text;
  
  // 移除加粗和斜体标记：**text** 或 *text* -> text
  cleaned = cleaned.replace(/\*\*(.*?)\*\*/g, '$1');
  cleaned = cleaned.replace(/\*(.*?)\*/g, '$1');
  
  // 移除行内代码标记：`text` -> text
  cleaned = cleaned.replace(/`(.*?)`/g, '$1');
  
  // 移除标题标记：### text -> text
  cleaned = cleaned.replace(/^#+\s+/gm, '');
  
  // 移除链接标记：[text](url) -> text
  cleaned = cleaned.replace(/\[(.*?)\]\(.*?\)/g, '$1');
  
  // 移除多余的空行
  cleaned = cleaned.replace(/\n\s*\n\s*\n/g, '\n\n');
  
  // 移除首尾空白
  cleaned = cleaned.trim();
  
  return cleaned;
}

// 启动服务器
app.listen(port, () => {
  console.log(`服务器运行在 http://localhost:${port}`);
  console.log(`API 文档:
  GET  /api/health          健康检查
  POST /api/generate-review 生成火锅店好评`);
});
