# HT_BinBuilder 1.4.0

Panel UXP cho Adobe Premiere Pro, giúp lưu preset và tạo toàn bộ cấu trúc Bin lồng nhau trong một thao tác. Plugin có thể đọc cấu trúc Bin của project hiện tại, tránh tạo trùng và lưu mẫu để tái sử dụng.

## Chức năng

- Tạo Bin cha và Bin con từ danh sách đường dẫn.
- Giữ nguyên Bin đã tồn tại.
- Ba preset dựng phim mặc định.
- Lưu và xóa preset cá nhân bằng UXP `localStorage`.
- Lấy toàn bộ cấu trúc Bin từ project hiện tại.
- Hiển thị project, số Bin, tiến trình, kết quả và nhật ký.
- Transaction của Premiere cho các thao tác tạo Bin.

## Yêu cầu hệ thống

- Windows x64.
- Adobe Premiere Pro 26.2 trở lên.
- Không cần Creative Cloud Desktop, Node.js hoặc UXP Developer Tool trên máy sử dụng.

## Cài đặt trên máy khác

1. Tải và giải nén `dist/HT_BinBuilder_Setup_Windows.zip`.
2. Đóng Adobe Premiere Pro.
3. Chạy `cong_cu\cai_dat\CAI_DAT_MOT_CLICK.bat`.
4. Mở Premiere Pro.
5. Chọn **Window > UXP Plugins > HT_BinBuilder**.

Bộ cài tự yêu cầu quyền Administrator, chép plugin vào `%ProgramFiles%\Common Files\Adobe\UXP\Plugins\External\com.hieuyt.htbinbuilder` và tự phục hồi bản cũ nếu cài đặt thất bại.

Sau khi cài, bộ cài tạo `CAP_NHAT_HT_BINBUILDER.bat` trên Desktop. Chạy file này để tự kiểm tra GitHub Releases, tải đúng `HT_BinBuilder_Setup_Windows.zip`, xác minh tên sản phẩm và phiên bản rồi cập nhật plugin. Premiere Pro cần được đóng trước khi cập nhật.

## Cách sử dụng

1. Mở trang **Tạo Bin**.
2. Chọn preset hoặc bấm **Lấy từ project**.
3. Chỉnh các đường dẫn trong editor.
4. Bấm **Tạo cấu trúc Bin**.
5. Xem kết quả và nhật ký ở cuối panel.

## Cú pháp cấu trúc Bin

Mỗi dòng là một đường dẫn. Dấu `/` biểu thị Bin con:

```text
01_FOOTAGE
01_FOOTAGE/RAW
01_FOOTAGE/BROLL
02_AUDIO
02_AUDIO/VOICE_OVER
02_AUDIO/MUSIC
03_SEQUENCE
```

Plugin tự loại dòng trống, chuẩn hóa dấu `\` thành `/`, loại đường dẫn trùng và tạo Bin cha trước.

## Preset

- Preset mặc định không thể xóa.
- Nhập tên ở trang **Preset** để lưu cấu trúc đang chỉnh.
- Lưu lại cùng một tên sẽ cập nhật preset hiện có.
- Preset cá nhân thuộc dữ liệu của plugin trên máy hiện tại.

## Cấu trúc dự án

```text
HT_BinBuilder/
├── cong_cu/
│   ├── cai_dat/
│   └── phat_trien/
├── installer/
├── icons/
├── dist/
├── index.html
├── index.js
├── styles.css
├── manifest.json
├── build_ccx.js
└── build_release.ps1
```

## Phát triển và đóng gói

Máy build cần Node.js LTS. Chạy:

```powershell
powershell -ExecutionPolicy Bypass -File .\build_release.ps1
```

Hoặc chạy `cong_cu\phat_trien\TAO_BO_CAI.bat`.

Kết quả:

- `dist/HT_BinBuilder_PremierePro.ccx`
- `dist/HT_BinBuilder_Setup_Windows.zip`

## Thành phần runtime

Plugin chỉ gồm HTML, CSS, JavaScript UXP và icon SVG. Không dùng bridge localhost, FFmpeg, Whisper hoặc quyền network/filesystem.

## Giới hạn

- Chỉ hỗ trợ Premiere Pro 26.2 trở lên.
- Preset cá nhân chưa đồng bộ giữa các máy.
- Chưa hỗ trợ label color, sequence preset hoặc import asset tự động.
