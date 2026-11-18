# UESTC 众包定位案例查看器

包含 1,651 例完整案例、原始输入、真值、定位结果、路网底图，以及带完整横向附表的 Word 报告。

## 上传并发布

1. 解压发布包，将解压后的全部内容上传或推送到新建 GitHub 仓库的 main 分支根目录。index.html 必须直接位于仓库根目录；不要只上传 ZIP 文件。
2. 在仓库 Settings → Pages → Build and deployment 中，Source 选择 Deploy from a branch，Branch 选择 main，目录选择 /(root)，保存。
3. 等待发布完成，打开 Pages 显示的网站地址。将这个地址与 Word 报告一同提交即可。地址末尾加 #InfoCollect_TestCaseN 可直接打开指定案例。

文件数量较多，建议使用 GitHub Desktop 一次提交。也可在解压目录中依次运行下面的命令，将 YOUR_REPOSITORY_URL 替换为自己的仓库地址：

```powershell
git init -b main
git add .
git commit -m "Publish 1651 localization cases"
git remote add origin YOUR_REPOSITORY_URL
git push -u origin main
```

## 页面内容

- index.html：案例查看器。
- report.html：报告与全部逐例结果。
- downloads/report.docx：含全部 1,651 例横向附表的 Word 报告。
- downloads/cases.csv：原始逐例统计表。
- raw：逐例原始输入、真值和结果。

网页不需要后端服务。统计范围及结论适用条件见报告。使用 GitHub Pages 发布后，网页中的位置和观测数据将可通过在线链接访问。

底图 © OpenStreetMap contributors，ODbL 1.0；Leaflet 许可文件随 assets/leaflet 提供。

发布步骤依据 GitHub 官方文档：
https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site
