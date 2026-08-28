# HT_Finder 2.0.3

Panel UXP cho Adobe Premiere Pro 26.2+, dùng để tìm và thêm B-roll vào Project.

## Luồng nghiệp vụ được giữ nguyên

1. Tìm video hoặc ảnh từ Pexels, Pixabay, YouTube và Wikimedia.
2. Lọc theo loại media và độ phân giải.
3. Xem chi tiết, chọn chất lượng và Bin đích.
4. Tải media về `Stock/<Nguồn>`.
5. Tự tạo Bin nếu chưa có và thêm B-roll vào Premiere.
6. Ghi nhớ media đã tải để xử lý trùng lặp.

## Kiến trúc

- `manifest.json`: UXP Manifest v6, cùng chuẩn với HT_Automation và HT_BinBuilder.
- `src/providers`, `src/search`, `src/ui`: giữ cấu trúc tìm kiếm cũ.
- `src/premiere`: dùng `premierepro`, `lockedAccess()` và `executeTransaction()`.
- `bin/ht_finder_bridge.ps1`: chạy `yt-dlp` và ghi media thay cho Node/CEP.
- `cong_cu/phat_trien/CHAY_BRIDGE.bat`: chạy Bridge khi phát triển.

Trước khi tìm YouTube hoặc tải B-roll, chạy `cong_cu\phat_trien\CHAY_BRIDGE.bat`. Pexels và Pixabay cần API key trong trang Cài đặt; YouTube và Wikimedia không cần API key.

## Cài đặt một-click

1. Giải nén `dist/HT_Finder_Setup_Windows.zip`.
2. Đóng hoàn toàn Premiere Pro.
3. Chạy `cong_cu/cai_dat/CAI_DAT_MOT_CLICK.bat` trong thư mục đã giải nén.
4. Mở Premiere Pro > Window > UXP Plugins > HT_Finder.

Bộ cài tự xin quyền Administrator, cài UXP vào thư mục Adobe External, cài `yt-dlp`/Bridge và đăng ký Bridge tự khởi động cùng Windows. Dùng `SUA_CHUA.bat` để cài lại hoặc `GO_CAI_DAT.bat` để gỡ.

Trên máy phát triển, chạy `powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\build_release.ps1` để tạo lại CCX và ZIP.

Mỗi lần build version mới, script tự xóa toàn bộ CCX, ZIP và thư mục setup đã giải nén của version cũ trong `dist`. Khi cài đặt, plugin và runtime Bridge cũ cũng được thay thế; API key, cấu hình và thư mục B-roll của người dùng không bị xóa.
