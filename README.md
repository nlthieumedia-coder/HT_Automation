# HT_Automation 4.0.1

Panel UXP cho Adobe Premiere Pro, tự động ghép media theo số trong tên file và
xếp tuần tự lên timeline.

## Chức năng

- Ảnh + âm thanh: đặt ảnh lên V1, âm thanh lên A1 và khớp thời lượng.
- Video + âm thanh: dùng FFmpeg tạo video khớp audio, bỏ audio gốc, rồi đặt lên
  V1/A1.
- Ghép cặp theo số đầu tên, số cuối tên hoặc nhóm chữ số đầu tiên trong tên.
- Video đầu ra nằm trong `_ffmpeg_synced`, dùng H.264, preset `veryfast`, CRF 18.

## Cài trên máy khác

Yêu cầu: Windows x64, Adobe Creative Cloud Desktop đã đăng nhập và Premiere Pro
26.2 trở lên.

1. Tải `dist/HT_Automation_Setup_Windows.zip`.
2. Giải nén toàn bộ ZIP.
3. Nhấp đúp `CAI_DAT_MOT_CLICK.bat`.
4. Chọn **Install** trong Creative Cloud rồi mở lại Premiere Pro.
5. Mở **Window > UXP Plugins > HT_Automation**.

Trình cài chép FFmpeg Bridge vào `%LOCALAPPDATA%\HT_Automation\Bridge`, chạy ẩn
và đăng ký tự khởi động theo tài khoản Windows. Máy đích không cần Git, Node.js,
UXP Developer Tool hoặc cài FFmpeg riêng.

## Phát triển và đóng gói

`bin/ffmpeg.exe` không được commit. Nếu thiếu, chạy `download_ffmpeg.ps1`.
Máy build cần Node.js LTS, sau đó chạy `TAO_BO_CAI.bat` hoặc:

```powershell
powershell -ExecutionPolicy Bypass -File .\build_release.ps1
```

Kết quả:

- `dist/com.hieuyt.htautomation_premierepro.ccx`
- `dist/HT_Automation_Setup_Windows.zip`

## Thành phần runtime

- `manifest.json`, `index.html`, `index.js`: panel UXP.
- `bin/ffmpeg.exe`: xử lý video.
- `bin/ffmpeg_bridge_server.ps1`: cầu nối localhost tại cổng 19888.
- `installer/install.ps1`: cài và tự khởi động bridge.

## Giới hạn

- Chỉ hỗ trợ Windows x64.
- Video dài hơn audio bị cắt phần đuôi; video ngắn hơn audio được giảm tốc.
- Video được encode lại nên thời gian xử lý phụ thuộc cấu hình máy.
