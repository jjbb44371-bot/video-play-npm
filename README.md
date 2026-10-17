# video-play-npm

Ứng dụng xem video full-stack (kiểu YouTube), kiến trúc **server-authoritative**: mọi quyền
xử lý và dữ liệu nằm ở máy chủ, máy khách (trình duyệt) chỉ hiển thị những gì server trả về.

## Kiến trúc

- **server/** — backend [Fastify](https://fastify.dev/)
  - Nhận upload video (multipart), xác thực MIME, lưu file trên máy chủ.
  - Quản lý metadata (tiêu đề, mô tả, lượt xem, thời gian) trong `server/data/videos.json`.
  - Streaming hỗ trợ HTTP Range (tua video, phát mượt).
  - Tự sinh ID, tự tăng lượt xem, tự kiểm soát danh sách video → server giữ toàn quyền.
- **client/** — frontend React + Vite
  - Trang chủ (lưới video), trang xem video, trang upload.
  - Không có quyền quyết định dữ liệu; chỉ gọi API của server.

## Yêu cầu

- Node.js 20+ (đã kiểm thử với Node 24)

## Cài đặt

```sh
npm install
```

## Chạy chế độ phát triển

```sh
npm run dev
```

- Server: http://localhost:4000
- Client (Vite dev + proxy `/api`): http://localhost:5173

Chạy riêng từng phần:

```sh
npm run dev:server
npm run dev:client
```

## Chạy production

```sh
npm run build      # build client vào client/dist
npm start          # Fastify phục vụ API + client/dist
```

Sau đó mở http://localhost:4000

## API

| Method | Endpoint                  | Mô tả                          |
| ------ | ------------------------- | ------------------------------ |
| GET    | `/api/health`             | Kiểm tra server                |
| GET    | `/api/videos`             | Danh sách video                |
| GET    | `/api/videos/:id`         | Chi tiết video                 |
| GET    | `/api/videos/:id/stream`  | Stream video (hỗ trợ Range)    |
| POST   | `/api/videos/:id/view`    | Tăng lượt xem (server xử lý)   |
| POST   | `/api/videos`             | Upload video (multipart)       |
| PATCH  | `/api/videos/:id`         | Cập nhật tiêu đề/mô tả         |
| DELETE | `/api/videos/:id`         | Xoá video                      |

## Biến môi trường

| Biến              | Mặc định        | Ý nghĩa                     |
| ----------------- | --------------- | --------------------------- |
| `PORT`            | `4000`          | Cổng server                 |
| `HOST`            | `0.0.0.0`       | Địa chỉ bind                |
| `MAX_UPLOAD_BYTES`| `1073741824`    | Giới hạn dung lượng upload  |
| `DATA_DIR`        | `server/data`   | Thư mục metadata            |
| `UPLOADS_DIR`     | `server/uploads`| Thư mục chứa video          |
| `CLIENT_DIST`     | `client/dist`   | Thư mục build của client    |
