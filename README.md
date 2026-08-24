# HT_Automation v4.0 — Premiere Pro UXP Plugin

HT_Automation là panel UXP dành cho Adobe Premiere Pro, hỗ trợ tự động ghép và
xếp tuần tự media lên timeline dựa trên số thứ tự trong tên file.

Plugin hiện hỗ trợ hai quy trình:

- **Ảnh + Âm thanh**: ghép ảnh với audio, đặt ảnh lên V1 và audio lên A1.
- **Video + Âm thanh**: xử lý video bằng FFmpeg để khớp thời lượng audio, loại bỏ
  audio gốc của video, sau đó đặt video lên V1 và audio lên A1.

## Yêu cầu hệ thống

- Windows x64.
- Adobe Premiere Pro 26.0 trở lên.
- UXP Developer Tool để nạp plugin trong quá trình phát triển.
- Một project Premiere Pro đang mở.

Repository đã kèm theo:

- `bin/ffmpeg.exe`.
- Native addon tại `addons/win/x64/ffmpeg-bridge.uxpaddon`.
- HTTP bridge dự phòng tại `bin/ffmpeg_bridge_server.ps1`.

## Quy tắc ghép file

Plugin lấy số từ tên file và dùng số đó làm khóa ghép cặp. Thứ tự ưu tiên là:

1. Số ở đầu tên file, ví dụ `01_video.mp4`.
2. Số ở cuối tên file, ví dụ `scene_01.mp4`.
3. Nhóm chữ số đầu tiên xuất hiện trong tên.

Ví dụ:

```text
01_image.jpg  ↔  01_audio.mp3
scene_02.mp4  ↔  voice_02.wav
```

Các định dạng đang được nhận diện:

- Ảnh: `.jpg`, `.jpeg`, `.png`.
- Video: `.mp4`, `.mov`, `.mkv`, `.avi`, `.m4v`.
- Audio cho tab Video: `.mp3`, `.wav`, `.m4a`.

Nếu nhiều file trong cùng thư mục cho ra cùng một số, file được quét sau sẽ ghi
đè file trước trong danh sách ghép. Vì vậy nên dùng một số thứ tự duy nhất cho
mỗi file.

## Tab Ảnh + Âm thanh

Quy trình hoạt động:

1. Chọn thư mục ảnh và thư mục audio.
2. Quét và ghép các file theo số trong tên.
3. Chọn sequence có sẵn hoặc để plugin tạo sequence mới.
4. Import media vào các Bin của project.
5. Chèn từng cặp nối tiếp lên V1/A1 và điều chỉnh thời lượng ảnh theo audio.

Plugin có các helper để tạo hoặc tái sử dụng Bin, chọn sequence, mở khóa track,
thực thi Premiere Action qua `executeTransaction` và chờ media import hoàn tất.

## Tab Video + Âm thanh

Quy trình hoạt động:

1. Chọn thư mục video và thư mục audio.
2. Kiểm tra kết nối FFmpeg.
3. Quét và ghép các file theo số trong tên.
4. Đọc thời lượng video và audio bằng FFmpeg.
5. Tạo video mới trong thư mục `_ffmpeg_synced` nằm bên trong thư mục video.
6. Import video đã xử lý và audio vào Premiere, sau đó chèn nối tiếp lên V1/A1.

Cách khớp thời lượng hiện tại:

- **Video dài hơn audio**: cắt phần đuôi video theo thời lượng audio.
- **Video ngắn hơn audio**: giảm tốc video bằng bộ lọc `setpts` để kéo dài video.
- **Thời lượng bằng nhau**: encode lại với thời lượng tương ứng.
- Audio gốc của video luôn bị loại bỏ bằng tùy chọn FFmpeg `-an`.

Video đầu ra dùng H.264 với thiết lập:

```text
libx264, preset veryfast, CRF 18
```

## Cơ chế chạy FFmpeg

UXP JavaScript không trực tiếp spawn tiến trình ngoài, nên `index.js` sử dụng hai
cơ chế theo thứ tự:

1. **Native addon C++**: thử nạp `ffmpeg-bridge.uxpaddon` và gọi `runProcess()`.
2. **HTTP bridge dự phòng**: nếu addon không hoạt động, gửi `POST` tới
   `http://127.0.0.1:19888/run`.

Để dùng HTTP bridge, chạy:

```text
CHAY_FFMPEG_BRIDGE.bat
```

Bridge sử dụng FFmpeg tại `bin/ffmpeg.exe`. Nút kiểm tra FFmpeg trong panel sẽ
gọi `ffmpeg -version` và hiển thị phiên bản khi kết nối thành công.

## Cấu trúc chính

```text
HT_Automation/
├── manifest.json
├── index.html
├── index.js
├── CHAY_FFMPEG_BRIDGE.bat
├── download_ffmpeg.ps1
├── ffmpeg-bridge.uxpaddon
├── bin/
│   ├── ffmpeg.exe
│   └── ffmpeg_bridge_server.ps1
├── addons/
│   └── win/x64/
│       └── ffmpeg-bridge.uxpaddon
└── addon-src/
    ├── ffmpeg_bridge.cpp
    ├── README_BUILD.md
    ├── download_and_build.ps1
    ├── w64devkit.exe
    └── w64devkit/
```

## Khai báo UXP hiện tại

`manifest.json` hiện khai báo:

- Plugin ID: `com.hieuyt.htautomation`.
- Version: `4.0.0`.
- `manifestVersion`: `5`.
- Host: `premierepro`, phiên bản tối thiểu `26.0.0`.
- Quyền truy cập filesystem: `fullAccess`.
- Cho phép network và native addon qua `enableAddon`.

## Cách chạy

1. Mở một project trong Adobe Premiere Pro 26.0 trở lên.
2. Mở UXP Developer Tool và thêm thư mục `HT_Automation`.
3. Load plugin, sau đó mở panel **HT_Automation** trong Premiere Pro.
4. Chọn tab và các thư mục media tương ứng.
5. Chọn sequence đích hoặc tùy chọn tạo sequence mới.
6. Quét file, kiểm tra trạng thái đủ/thiếu rồi bấm dựng project. Khi thiếu media,
   bật tùy chọn **Vẫn dựng timeline khi thiếu file** nếu muốn giữ khoảng trống.
7. Với tab Video, nếu native addon không chạy, khởi động
   `CHAY_FFMPEG_BRIDGE.bat` rồi kiểm tra FFmpeg lại.

Khi thay đổi `manifest.json` hoặc native addon, nên Unload rồi Load lại plugin
hoàn toàn trong UXP Developer Tool.

## Build native addon

Source addon nằm tại `addon-src/ffmpeg_bridge.cpp`. Hướng dẫn và script build nằm
trong:

- `addon-src/README_BUILD.md`.
- `addon-src/download_and_build.ps1`.

Output cần được đặt tại:

```text
addons/win/x64/ffmpeg-bridge.uxpaddon
```

## Giới hạn hiện tại

- Chỉ hỗ trợ Windows x64.
- Lệnh native addon hiện chạy đồng bộ; FFmpeg có thể làm panel tạm ngừng phản hồi
  khi xử lý clip dài.
- Video dài hơn audio hiện bị cắt phần đuôi, không được tăng tốc để giữ toàn bộ
  nội dung.
- Mỗi video đều được encode lại bằng H.264, vì vậy thời gian xử lý và dung lượng
  phụ thuộc độ dài, độ phân giải và cấu hình máy.
- Chưa có target build cho macOS.

## Hướng cải thiện

- Chuyển native addon sang xử lý bất đồng bộ để không khóa giao diện.
- Cho phép chọn giữa cắt video và thay đổi tốc độ khi video dài hơn audio.
- Cho phép cấu hình codec, preset và CRF từ giao diện.
- Cảnh báo rõ khi phát hiện nhiều file có cùng số ghép cặp.
- Tách `index.js` thành các module UI, Premiere và FFmpeg để dễ bảo trì.
