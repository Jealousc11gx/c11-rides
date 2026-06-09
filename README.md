# c11-rides

个人主页，摩托车风格视觉，基于 Vite + React + Three.js 构建。目标部署平台：Vercel。

## Tech Stack

- Vite
- React
- Three.js / React Three Fiber
- GSAP
- Node.js test runner

## Local Development

```bash
npm install
npm run dev
```

默认本地地址：

```text
http://localhost:5173
```

## Test

```bash
npm test
```

## Build

```bash
npm run build
```

构建产物输出到 `dist/`。该目录由构建生成，不提交 Git。

## Vercel Deployment

在 Vercel 导入 GitHub 仓库：

```text
Jealousc11gx/c11-rides
```

推荐配置：

```text
Framework Preset: Vite
Install Command: npm install
Build Command: npm run build
Output Directory: dist
```

项目包含滚动视频帧资源：

```text
public/frames/web_vedio
```

该目录是生产页面需要的静态资源，需要提交。`public/frames_compare` 是本地帧率对比资源，不参与部署。

## Content

页面文案集中在：

```text
src/content.json
```

可运行：

```bash
npm run content
```

打开内容文件后编辑，再运行：

```bash
npm test
npm run build
```
