# UTAU OTO Template Generator v0.08

by itsukiMNE

**推荐使用最新版网页版：** https://itsukimne.github.io/oto-template-generator/

可以直接在浏览器中使用，不必下载安装。需要离线使用时，可下载源码 ZIP，解压后将全部文件保留在同一文件夹，打开 `index.html`。所有文件均在浏览器本地处理。

## 工具简介

根据 UTAU Reclist Generator 的录音表 TXT 与 OREMO BGM TXT 生成 `oto.ini` 初始模板；也可以导入已有的 `oto.ini`，在保留先行线绝对位置的情况下重新整理部分参数。本工具不会分析实际录音波形，导出的模板仍需使用 SetParam 等工具校对。

支持 CV（単独音）、連単風、連単術、VCV（連続音）和 CVVC。Extra 特殊音素暂未支持。

## 使用方法

### Generate Template（生成模板）

1. 导入 Reclist TXT 和 BGM TXT。优先使用带 Metadata 的录音表；缺少 Metadata 时，可从部分文件名识别录音形式，也可手动选择。
2. 检查识别到的录音类型、BPM 与时间信息。
3. 根据录音形式选择 VC 音素、VCV 拨音、语尾及 Overlap 等选项，点击「生成预览」。
4. 查看 Alias、WAV 来源及警告，确认后复制或下载 `oto.ini`。

VC 音素每种 Alias 只切出一个，未录制的音素不会凭空生成。連単術与 VCV 可自行选择 VC 音素；CVVC 的高、中优先度 VC 固定生成（以实际存在的录音为前提），低优先度可按需勾选。普通音素的重复候选可选择保留 1 个、最多 2 个或不限。

### Adjust Existing OTO（整理已有 OTO）

1. 导入已有 `oto.ini`，选择录音形式并输入 BPM。
2. 选择要重算的参数以及 Overlap 处理方式。
3. 预览后复制或下载结果。原先行线在 WAV 中的绝对位置保持不变，未选中的参数保留原值。

## 注意事项

- BGM TXT 支持 `sec` 和 `msec`；可以识别常用的 OREMO 事件编号及部分文件名中的 BPM。无法识别时可手动输入。
- 初始模板只提供估计位置，不读取 WAV 实际长度；请检查录音末尾及特别音素的切线。
- 无法识别的音素会显示警告，不会自动猜测；`bX` 需在完成 `- X` 原音设定后另行生成。
- 下载不会主动覆盖本机文件；使用前建议备份既有的 `oto.ini`。
- 支持 UTF-8 和 CP932（日文 ANSI）输出；包含不支持 CP932 的字符时，请改用 UTF-8。

## v0.08 修订

- CVVC 的高、中优先度 VC 音素改为固定生成，仅低优先度可选。
- 网页「VC 子音」改为「VC 音素」。
- README 优先推荐网页版；开发时间预设不再放在公开说明中。
