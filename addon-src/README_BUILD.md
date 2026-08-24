# Hướng dẫn build `ffmpeg-bridge.uxpaddon` (Windows x64)

Addon này là "cầu nối" duy nhất giữa panel JS và FFmpeg — nó chỉ làm 1 việc:
chạy 1 tiến trình ngoài kèm tham số, đợi xong, trả về `exitCode` / `stdout` / `stderr`
cho JavaScript. Không cần link FFmpeg SDK, không cần code encode/decode gì cả.

## 1. Tải UXP Hybrid Plugin SDK

- Vào **Adobe Developer Console** → tìm mục UXP Hybrid Plugin SDK → tải về.
- (Nếu gặp lỗi "Access Denied": đăng nhập lại bằng tài khoản Adobe cá nhân
  thay vì tài khoản tổ chức — đây là lỗi thường gặp theo FAQ chính thức.)
- Giải nén, bên trong có:
  - `src/api/UxpAddonShared.h` — toàn bộ API thật (đối chiếu tên hàm ở đây).
  - `src/utilities/UxpAddon.h` — macro `UXP_ADDON_INIT` / `UXP_ADDON_TERMINATE`.
  - `template/template-dev` — project mẫu Visual Studio đã cấu hình sẵn.

## 2. Tạo project từ template

Cách nhanh và an toàn nhất: **copy nguyên `template/template-dev`** thành
project mới, đổi tên, rồi:

1. Xoá code mẫu trong file `.cpp` chính của template.
2. Dán nội dung `ffmpeg_bridge.cpp` (file đi kèm) vào, giữ nguyên PHẦN 1
   (Win32 process runner) — phần này build được ngay không cần sửa.
3. Với PHẦN 2 (binding `addon_*`): mở file mẫu gốc trong template để xem cách
   họ khai báo hàm export thật (namespace, chữ ký tham số chính xác), rồi
   chỉnh lại các dòng `addon_create_function`, `addon_get_cb_info`,
   `addon_get_value_string_utf8`, `addon_create_object`,
   `addon_set_named_property`, `addon_create_int32`, `addon_create_string_utf8`
   cho khớp 100% với `UxpAddonShared.h`. Về mặt khái niệm các hàm này đã đúng
   (API "closely mirrors Node-API" theo tài liệu Adobe), chỉ cần đối chiếu
   chữ ký tham số cụ thể.

## 3. Cấu hình project Visual Studio

- Loại project: **Dynamic Library (.dll)**.
- Cấu hình: **Release, x64** (KHÔNG dùng Debug — bản Debug phụ thuộc
  Visual C++ runtime debug không có sẵn trên máy người dùng cuối, sẽ báo lỗi
  "Failed to load Addon" khi cài cho người khác).
- Thêm include path: trỏ tới `src/api` và `src/utilities` của SDK.
- Link thêm thư viện Windows: không cần gì thêm ngoài mặc định
  (`kernel32.lib` đã có sẵn trong mọi project Windows).

## 4. Build và đổi tên

1. Build ở chế độ Release x64 → ra file `.dll`.
2. Đổi đuôi file thành `.uxpaddon` → đặt tên đúng theo `manifest.json`:
   **`ffmpeg-bridge.uxpaddon`**.

## 5. Đặt file vào đúng vị trí trong plugin

```
HT_Automation/
├── manifest.json
├── index.html
├── index.js
└── addons/
    └── win/
        └── x64/
            └── ffmpeg-bridge.uxpaddon   ← đặt file build ra vào đây
```

`manifest.json` đã được cấu hình sẵn với:
```json
"addon": { "name": "ffmpeg-bridge.uxpaddon" },
"requiredPermissions": { "enableAddon": true }
```

## 6. Test

- Mở UXP Developer Tool (UDT) → Load lại plugin (Unload rồi Load, vì thay đổi
  manifest cần load lại hoàn toàn, watch mode không tự áp dụng).
- Trên macOS bản build không ký cần vào Privacy & Security để cho phép chạy —
  **nhưng vì bạn chỉ target Windows nên bỏ qua bước này.**
- Trên Windows, chỉ cần build Release đúng cách là chạy được ngay, không bắt
  buộc ký code để test nội bộ / phân phối độc lập (không qua Marketplace).
- Vào tab "🎞️ Video + Âm thanh" → bấm "🧪 Kiểm tra" ở khung FFmpeg. Nếu addon
  load đúng và `ffmpeg` có trong PATH (hoặc bạn nhập đường dẫn đầy đủ tới
  `ffmpeg.exe`), log sẽ hiện được số phiên bản FFmpeg.

## Debug nếu addon không load được

- Lỗi "Failed to load Addon: The specified module could not be found" →
  thường do build nhầm chế độ Debug, hoặc thiếu Visual C++ Redistributable
  trên máy test → rebuild Release, hoặc cài VC++ Redistributable mới nhất.
- Lỗi require() không tìm thấy module → kiểm tra lại đúng tên file
  `ffmpeg-bridge.uxpaddon` và đúng đường dẫn `win/x64/`.
- Muốn debug bằng breakpoint C++: build Debug tạm thời, attach Visual Studio
  vào tiến trình Premiere Pro đang chạy (theo hướng dẫn "Attach to Process"
  trong tài liệu Hybrid Plugins của Adobe) — nhớ đổi lại Release trước khi
  đóng gói phát hành.
