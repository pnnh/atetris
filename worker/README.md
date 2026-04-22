
将该目录下的文件拷贝到 build/web-desktop 导出目录下，并执行 npx wrangler deploy来部署到Cloudflare Workers。

如果有较大的资源文件建议先手动执行brotli命令进行br压缩，然后借助_worker.js文件进行路由拦截返回压缩后的版本。