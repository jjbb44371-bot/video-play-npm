[English](./README.md) · **Tiếng Việt**

# video-play-npm

Ứng dụng xem video full-stack (kiểu YouTube), kiến trúc **server-authoritative**: mọi quyền
xử lý và dữ liệu nằm ở máy chủ, máy khách (trình duyệt) chỉ hiển thị những gì server trả về.

## Kiến trúc

- **server/** — backend [Fastify](https://fastify.dev/)
  - Nhận upload video (multipart), xác thực MIME, lưu file trên máy chủ.
  - Quản lý người dùng, video và dữ liệu tương tác trong SQLite (`server/data/videos.db`, schema v2).
  - Cung cấp xác thực bằng session cookie và quyền sở hữu theo từng video.
  - Streaming hỗ trợ HTTP Range (tua video, phát mượt).
  - Tự sinh ID, tự tăng lượt xem, tự kiểm soát danh sách video → server giữ toàn quyền.
- **client/** — frontend React + Vite
  - Trang chủ (lưới video), trang xem video, trang upload, và trang đăng nhập/đăng ký.
  - Không có quyền quyết định dữ liệu; chỉ gọi API của server.

## Xác thực và kiểm soát truy cập

- **Đọc công khai:** xem danh sách, chi tiết, stream và tăng lượt xem không cần tài khoản.
- **Upload cần tài khoản:** `POST /api/videos` trả về `401` nếu chưa đăng nhập.
- **Quyền sở hữu:** mỗi video mới gắn với người tạo. Chỉ chủ sở hữu (hoặc `admin`) được sửa/xoá.
  Video tạo trước khi có auth vẫn đọc được công khai.
- Phiên đăng nhập lưu trong cookie HTTP-only (`SESSION_COOKIE_NAME`), mật khẩu băm bằng bcrypt.
  Đặt `SESSION_SECRET` khi chạy production (bắt buộc khi `NODE_ENV=production`).

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

## Kiểm thử

```sh
npm test
```

## API

| Method | Endpoint                          | Auth        | Mô tả                              |
| ------ | --------------------------------- | ----------- | ---------------------------------- |
| GET    | `/api/health`                     | public      | Kiểm tra server                    |
| POST   | `/api/auth/register`              | public      | Đăng ký và bắt đầu phiên           |
| POST   | `/api/auth/login`                 | public      | Đăng nhập                          |
| POST   | `/api/auth/logout`                | session     | Đăng xuất                          |
| GET    | `/api/auth/me`                    | session     | Người dùng hiện tại                |
| GET    | `/api/videos`                     | public      | Danh sách video                    |
| GET    | `/api/videos/:id`                 | public      | Chi tiết video                     |
| GET    | `/api/videos/:id/stream`          | public      | Stream video (hỗ trợ Range)        |
| POST   | `/api/videos/:id/view`            | public      | Tăng lượt xem                      |
| POST   | `/api/videos`                     | required    | Upload video (multipart)           |
| PATCH  | `/api/videos/:id`                 | owner/admin | Cập nhật tiêu đề/mô tả            |
| DELETE | `/api/videos/:id`                 | owner/admin | Xoá video                          |
| GET    | `/api/categories`                 | public      | Danh sách danh mục                 |
| GET    | `/api/categories/:id`             | public      | Chi tiết danh mục                  |
| POST   | `/api/categories`                 | required    | Tạo danh mục                       |
| GET    | `/api/tags`                       | public      | Danh sách tag                      |
| GET    | `/api/tags/:id`                   | public      | Chi tiết tag                       |
| POST   | `/api/tags`                       | required    | Tạo (hoặc dùng lại) tag            |
| GET    | `/api/videos/:id/tags`            | public      | Các tag của video                  |
| POST   | `/api/videos/:id/tags`            | owner/admin | Thêm tag vào video                 |
| DELETE | `/api/videos/:id/tags/:tagId`     | owner/admin | Bỏ tag khỏi video                  |
| GET    | `/api/videos/:id/comments`        | public      | Danh sách bình luận                |
| POST   | `/api/videos/:id/comments`        | required    | Thêm bình luận                     |
| DELETE | `/api/comments/:id`               | owner/admin | Xoá bình luận                      |
| GET    | `/api/videos/:id/likes`           | public      | Tổng hợp thích/không thích         |
| POST   | `/api/videos/:id/likes`           | required    | Đặt cảm xúc thích/không thích     |
| DELETE | `/api/videos/:id/likes`           | required    | Bỏ cảm xúc                        |
| GET    | `/api/playlists`                  | required    | Danh sách playlist của bạn         |
| POST   | `/api/playlists`                  | required    | Tạo playlist                       |
| GET    | `/api/playlists/:id`              | public/owner| Chi tiết playlist kèm items        |
| PATCH  | `/api/playlists/:id`              | owner/admin | Cập nhật playlist                  |
| GET    | `/api/playlists/:id/items`        | public/owner| Danh sách item của playlist        |
| POST   | `/api/playlists/:id/items`        | owner/admin | Thêm video vào playlist            |
| DELETE | `/api/playlists/:id/items/:videoId`| owner/admin| Bỏ video khỏi playlist             |

## Biến môi trường

| Biến                  | Mặc định         | Ý nghĩa                                  |
| --------------------- | ---------------- | ---------------------------------------- |
| `PORT`                | `4000`           | Cổng server                              |
| `HOST`                | `0.0.0.0`        | Địa chỉ bind                             |
| `MAX_UPLOAD_BYTES`    | `1073741824`     | Giới hạn dung lượng upload               |
| `DATA_DIR`            | `server/data`    | Thư mục cơ sở dữ liệu SQLite             |
| `UPLOADS_DIR`         | `server/uploads` | Thư mục chứa video                       |
| `CLIENT_DIST`         | `client/dist`    | Thư mục build của client                 |
| `AUTH_ENABLED`        | `true`           | Đặt `false`/`0` để tắt kiểm tra đăng nhập |
| `SESSION_SECRET`      | mặc định dev     | Secret ký phiên (bắt buộc khi production) |
| `SESSION_COOKIE_NAME` | `video_play_sid` | Tên cookie phiên                         |
| `SESSION_MAX_AGE`     | `604800000`      | Thời hạn phiên (miligiây)                |

## Cơ sở dữ liệu

SQLite (`server/data/videos.db`) dùng migration theo phiên bản (`schema_version`). Schema **v2** thêm:

- `users` (id, username, email, password_hash, role, timestamps)
- `videos.userId` (tham chiếu chủ sở hữu, có thể null)
- `categories`, `tags`, `video_tags`
- `comments`, `likes`
- `playlists`, `playlist_items`
- `video_metrics` (lượt xem, thích, không thích, bình luận, chia sẻ)

Migration chạy dần và giữ nguyên video cũ; hàng cũ vẫn hoạt động khi chủ sở hữu là null.

## Quy trình

Quy trình làm việc của dự án được mô tả bằng tiếng Anh trong [`AGENTS.md`](./AGENTS.md)
(chỉ tiếng Anh, không dịch). Cấu hình quy trình nằm trong
[`project.config.json`](./project.config.json). Nhật ký thay đổi nằm trong
[`CHANGELOG.md`](./CHANGELOG.md).
