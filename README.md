# Nalan Img2Img

中文图生图与人像工作台，部署于 Cloudflare Workers，并使用 Cloudflare Workers AI。

## 功能

- 中文提示词输入与 AI 优化/英文翻译
- 人像风格预设：自然写真、标准证件照、专业影棚、轻微美颜、户外自然光、电影感、商务肖像、日系动漫
- 自动生成/编辑 negative prompt（反向提示词）
- 本地上传输入图片和局部重绘遮罩图
- 图像尺寸、采样步数、随机种子等生成参数（依模型能力而定）
- 访问密码由 Cloudflare Worker Secret `APP_PASSWORD` 管理，不应提交到 Git 仓库

## 部署

Worker 名称：`nalan-img2img`

- 入口：`worker.js`
- 页面：`index.html`
- Workers AI binding：`AI`
- Secret：`APP_PASSWORD`
- 访问地址： https://nalan-img2img.17634458891.workers.dev

## 模型说明

图生图/局部重绘目前使用 Workers AI 提供的 Stable Diffusion v1.5 对应模型；其余列表中的部分模型是文生图模型，不会保留上传原图。请在生成前检查所选模型是否需要输入图像。不同模型支持的参数不同，实际效果取决于模型能力和服务可用性。

## 中文提示词优化

点击“中文优化/翻译”后，Worker 使用 Workers AI 文本模型将中文描述整理为英文正向提示词和反向提示词。优化结果可手动修改后再生成。提示词优化依赖 Workers AI 模型可用性及账户配额。
