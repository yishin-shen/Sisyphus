# Privacy Policy / 隐私政策

[English Version](#english-version) | [中文版](#中文版)

---

## English Version

**Last Updated:** April 2026

Sisyphus is a minimalist, entirely local application built on open-source principles. We believe your perception of time and life progress belongs solely to you.

Our privacy policy can be summarized in one absolute promise: We do not collect, store, upload, or share any of your personal information, usage habits, or device data. Your data never leaves your device.

**1. Data Collection & 100% Offline Operation**
Sisyphus operates entirely offline. Every process—from generating heatmap grids and calculating dates to synthesizing images and extracting dynamic color palettes—is executed locally on your device's CPU and GPU.
All your preferences, custom themes, and specific day color markings are saved strictly within your local browser storage (localStorage: sisyphus_settings). Not a single byte of data is transmitted externally.

**2. Zero Telemetry & Third-Party Libraries**
We practice absolute restraint.

*   **Zero Tracking**: Sisyphus does not integrate any telemetry, crash reporting, or analytics SDKs (such as Google Analytics, Firebase, Umeng, or Bugly). There are zero advertising networks.
*   **Open-Source Foundations**: We rely exclusively on standard, transparent open-source libraries: React, Tailwind CSS, Framer Motion, Capacitor, and official Google AndroidX components (WorkManager, Palette, Material 3). No closed-source commercial SDKs are used.

**3. Permissions Explained**
We adhere to the principle of least privilege. Every permission serves a strictly local, core function:

*   **Internet (INTERNET)**: Used exclusively by the Capacitor framework to establish a micro-local HTTP server (localhost) required to render the React frontend UI within a WebView. The app makes zero outbound network requests to the web.
*   **Set Wallpaper (SET_WALLPAPER)**: Core permission required to apply the generated heatmap grid as your system's lock screen or home screen.
*   **Storage (READ/WRITE_EXTERNAL_STORAGE)**: Used solely to export your heatmap to your gallery or select a custom background image. (Note: Restricted to legacy Android versions below 13, adhering to modern privacy standards).
*   **Run at Startup (RECEIVE_BOOT_COMPLETED)**: Allows the local WorkManager to seamlessly awaken and resume your daily background wallpaper updates if you reboot your phone.
*   **Notifications (POST_NOTIFICATIONS)**: Used only for local, silent system notifications to confirm successful daily wallpaper updates (Android 13+).

**4. Design Note: Color Palette Inspiration**
As a tribute to modern industrial aesthetics, the 9 core color palettes available for your daily traces take their inspiration directly from the distinctive paint colors of the Xiaomi SU7.

**6. License & Open Source**
This application is fully open source and distributed under the **GNU General Public License v3.0 (GPLv3)**.
If you have any questions or wish to audit our code, please visit our open-source repository:

*   **GitHub**: https://github.com/yishin/sisyphus
*   **Developer Email**: sxrpro@outlook.com

---

## 中文版

**最后更新日期：** 2026年4月

Sisyphus（西西弗斯）是一款完全本地运行的开源应用。我们坚信，您的时间轨迹和生命刻度是绝对私密的数字领地。

本应用的隐私声明可以概括为一个绝对的承诺：我们不收集、不存储、不上传您的任何个人信息、使用习惯或设备数据。您的数据永远只属于您自己。

**1. 数据处理与 100% 本地运行**
Sisyphus 是一款纯粹的离线应用。热力图的生成、日期的计算、图片的合成、甚至动态配色的提取算法，全都在您的设备 CPU/GPU 上本地完成。
您的自定义主题、特殊日期颜色标记以及所有界面设置，全部分毫不差地保存在本地缓存（localStorage: sisyphus_settings）内部。没有任何一个字节的数据会离开您的手机。

**2. 绝对零遥测与第三方库**
我们保持着极致的代码克制：

*   **零追踪 (Zero Telemetry)**： 应用没有引入任何诸如 Google Analytics、Firebase、友盟或 Bugly 等常见的数据埋点、统计收集或崩溃上报 SDK。这里没有广告，也没有监视。
*   **纯粹的开源生态**： 我们的底层仅依赖透明的主流开源方案，包括 React、Tailwind CSS、Framer Motion、Capacitor 以及官方的 AndroidX 基础架构库（WorkManager, Palette, Material 3）。不包含任何商业闭源 SDK。

**3. 核心权限详尽说明**
本应用声明的所有权限均严格服务于本地核心功能，不涉及任何后台数据窃取：

*   **网络权限 (INTERNET)**： 仅用于 Capacitor 框架在设备本地建立微型 HTTP 服务器（localhost），以渲染呈现前端 UI 界面。本应用没有任何向外网发送的数据请求。
*   **设置壁纸 (SET_WALLPAPER)**： 应用的核心权限，用于将生成的像素热力图应用为手机桌面或锁屏。
*   **存储读写 (READ/WRITE_EXTERNAL_STORAGE)**： 用于实现“导出壁纸（保存到相册）”以及“从相册选择图片作为底图”的功能。(注：代码中限制了仅在 Android 13 之前的旧版系统声明这些敏感权限，符合最新隐私规范)。
*   **开机自启 (RECEIVE_BOOT_COMPLETED)**： 用于维持“后台自动更新”功能。设备重启后，系统会唤醒本地的定时任务，确保每日的壁纸刷新不会中断。
*   **发送通知 (POST_NOTIFICATIONS)**： 用于在后台定时更新壁纸完毕后，向您发送“更新成功”或错误提示的本地系统通知。

**4. 设计彩蛋：关于色彩**
作为对现代工业设计美学的致敬，Sisyphus 热力图内置的 9 款核心主题色彩，其灵感均提取自小米 SU7 的 9 款经典车漆配色。

**6. 开源协议与联系方式**
本应用代码完全开源，且遵循 **GNU General Public License v3.0 (GPLv3)** 开源许可协议。
我们欢迎任何形式的代码审查与监督。如果您遇到问题，请通过开源渠道联系：

*   **GitHub 仓库**: https://github.com/yishin/sisyphus
*   **开发者邮箱**: sxrpro@outlook.com