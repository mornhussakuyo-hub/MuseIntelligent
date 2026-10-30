# MuseIntelligent

以二维平面地图为中心的博物馆智能导览。一层、三个主题展厅、36 件真实藏品、21 个位置机位。点击展柜可查看文物，选择机位后可规划路线，也可以向 Muse 提问或上传照片识别。

开发环境需要 Node.js 22.12 或更新版本，以及 pnpm。

```sh
pnpm install
pnpm dev
```

打开 http://localhost:5173 。开发命令同时启动前端和导览服务。

把 `.env.example` 复制成 `.env`，填写 DeepSeek 的 `AI_API_KEY`。密钥只供服务端读取。留空时，地图、寻路和本地馆藏问答仍可使用。

构建并运行正式版本时，先停止开发服务。

```sh
pnpm build
pnpm start
```

正式服务默认位于 http://127.0.0.1:8787 ，同时提供页面、图片和 API。

实现使用 React、TypeScript 和 SVG。地图显示与 A* 寻路共用 `data/floorplan.mjs` 中的墙体、门、展柜和庭院，路线会绕开障碍并在展柜旁停下。支持平移、缩放、展厅聚焦、连续参观和行走引导。

Node.js 后端负责 DeepSeek 调用。Agent 可以检索馆藏、读取档案、计算到达路线、规划参观和推荐下一件藏品。知识库由馆方记录与中文讲解组成，按名称、别名、年代、材质等字段加权检索；当前规模使用本地结构化检索，没有向量数据库。回答引用的藏品可直接打开查看来源。

36 件原作均收藏于纽约大都会艺术博物馆。每件档案附馆藏编号和馆方链接；图片来自馆方 Public Domain 开放资源。`data/met-records.json` 保留馆方元数据，`data/image-manifest.json` 记录图像来源、授权和文件校验值。建筑与展位为本项目设计。参观记录、收藏和笔记保存在当前浏览器，可导出为文本。

```sh
pnpm test
pnpm build
node scripts/verify-live.mjs
```

最后一条命令需要开发服务及有效的模型配置，会实际调用 DeepSeek，验证多轮问答、路线工具和两张馆方图片的识别结果。运行记录写入 `docs/validation/live-api.json`。语音讲解使用设备的中文语音服务，语音输入取决于浏览器支持。
