# AmeTool

一个基于 React + Vite + TypeScript 的在线工具箱，集合了多种日常实用小工具。

## 功能列表

- JSON 格式化
- 二维码生成
- 密码生成
- 颜色选取
- 图片处理（分割/九宫格裁切/Base64转换）
- 单位换算
- 计算器 / 复利计算器
- 个税计算器
- QQ 头像获取
- 地区简称查询
- ASCII 表
- GIF 处理
- 反应速度测试
- 键盘测试
- 身份证信息查询
- CURL 请求工具（变量自动注入）

## 技术栈

- **前端框架**: React 18
- **构建工具**: Vite 6
- **语言**: TypeScript
- **路由**: React Router v6
- **图表**: Chart.js + react-chartjs-2
- **图标**: Lucide React
- **其他**: jszip, gifuct-js, qrcode

## 开发

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建
npm run build

# 预览构建产物
npm run preview
```

## Docker 部署

```bash
# 一键启动（构建 + 运行）
docker compose up -d

# 访问 http://localhost:3000

# 重新构建（代码更新后）
docker compose up -d --build
```

也可单独构建镜像：

```bash
docker build -t ame-tool .
docker run -d -p 3000:80 --name ame-tool ame-tool
```

## License

MIT
