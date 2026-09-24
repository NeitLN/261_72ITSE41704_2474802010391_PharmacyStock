# Tuần 9 — Feature freeze, v1.0, báo cáo nháp (T2 09/11 – CN 15/11/2026)

> Mốc môn học: **tag `v1.0`**, **báo cáo nháp** — không chấm riêng. Milestone: *Week 09 — Feature freeze — v1.0*. Module tự học: 10.
> Rubric: cả 5 tiêu chí Final; checklist 12.2 và 12.3.

## 1. Mục tiêu

1. **Feature freeze T2 09/11** — từ đây chỉ sửa lỗi.
2. **Tag `v1.0` T6 13/11** sau hồi quy; chạy được từ clone mới trên máy khác theo README.
3. **Báo cáo nháp đủ chương T7 14/11** theo template Final; mỗi người viết và commit phần của mình; ảnh chụp trên bản `v1.0`.
4. **Ma trận truy vết FR → UC → service → test → trạng thái** (bằng chứng CLO1) trong báo cáo.
5. TC-32 với **2 người ngoài nhóm**.
6. **Mỗi người giải thích được code của mình và một phần của người khác** — buổi tập có biên bản.

## 2. Điều kiện bắt đầu

- [ ] 0 S1 mở; S2 có người sửa
- [ ] Nháp báo cáo của cả 3 người (tuần 8)

## 3. Việc theo thành viên

| Mã | Việc | Giờ | Reviewer | Phụ thuộc | Đầu ra / nghiệm thu | Issue |
|---|---|---|---|---|---|---|
| W09-A1 | **Ch.1–2** cập nhật theo **cái đã xây dựng**; **chức năng của A** (UC01–04, UC13): mô tả, input/output, **ảnh trên v1.0** | 4,5 | C | tag v1.0 (ảnh) | Mọi chức năng của A có mô tả + ảnh dữ liệu thật | #73 |
| W09-A2 | **Ghép bản nháp — chỉ để nhất quán** (thứ tự, đánh số và chú thích hình/bảng, tham chiếu chéo); không viết lại phần của người khác | 3 | B | A1, B1, C3 | Bản nháp đủ chương T7 14/11 | #74 |
| W09-A3 | **Bảng "góp ý Proposal → hành động → minh chứng"** (từ Issue `proposal-feedback`) đưa vào báo cáo | 1 | C | — | Mọi góp ý có hành động hoặc lý do không làm | #75 (nội dung đổi) |
| — | A: buổi tập giải thích code 1,5 · họp 2,5 · review 1,5 · sửa lỗi 3 · dự phòng 3 | 11,5 | — | — | — | — |
| W09-B1 | **Chức năng của B** (UC05–08, UC14) hoàn chỉnh + **ảnh trên v1.0**; phần thiết kế giao diện/điều hướng hoàn chỉnh; **sơ đồ use case + sequence** cho báo cáo (đánh số, chú thích) | 4 | A | tag v1.0 | Hình khớp code | #76 |
| W09-B2 | **Kiểm thử khám phá** module của A và C (không theo kịch bản); lập bug | 3 | C | freeze | Lỗi tìm được có Issue và mức | #77 |
| W09-B3 | **Ma trận truy vết FR → UC → service → test → trạng thái** (đã làm / một phần / chưa, lý do) | 3 | A | — | Ma trận trong báo cáo; mọi FR có trạng thái | #78 |
| — | B: buổi tập giải thích code 1,5 · họp 2,5 · review 1,5 · sửa lỗi 4,5 | 10 | — | — | — | — |
| W09-C1 | **TC-32**: 2 người ngoài nhóm làm các tác vụ chính không có hướng dẫn từng bước; ghi thời gian, lỗi, khó khăn; so với ngưỡng NFR khả dụng (QĐ 9) | 3 | A | freeze | Biên bản trong `tests/manual/evidence/`; Pass/Fail theo ngưỡng | #79 |
| W09-C2 | **TC-33**: clone mới trên máy khác → làm theo README → chạy được (DB, migration, seed, tài khoản mẫu); hoàn thiện **run guide** | 3 | A | — | Run guide trong repo; mọi bước phải sửa đã sửa | #80 |
| W09-C3 | **Hồi quy cuối — chỉ kiểm thử** (bộ R + TC-31, bắt đầu T4 11/11) → **ký và tag `v1.0`** T6 13/11 (người ký dự phòng: B) | 5 | B | C1, C2 | Tag + release note liệt kê lỗi còn mở | #81 |
| — | C: phần kiểm thử + chức năng của C hoàn chỉnh + ảnh trên v1.0 2 · buổi tập 1,5 · họp 2,5 · review 1,5 · sửa lỗi 1,5 | 9 | — | — | — | — |

**Buổi tập giải thích code (1,5 giờ, T5 12/11)**: mỗi người chọn 2 đoạn code của người khác và hỏi "tại sao viết thế này?", "nếu đổi X thì sao?". **Biên bản hỏi–đáp lưu vào `docs/`**; câu nào không trả lời được thì người viết giải thích lại và bổ sung vào tài liệu thiết kế.

## 4. Phân bổ giờ

| Người | Test | Review | Sửa lỗi/Dự phòng | Báo cáo | Họp + tập giải thích | **Tổng** |
|---|---|---|---|---|---|---|
| A | — | 1,5 | 6 | 8,5 | 4 | **20** |
| B | 3 | 1,5 | 4,5 | 7 | 4 | **20** |
| C | 11 | 1,5 | 1,5 | 2 | 4 | **20** |

## 5. Lịch

| Ngày | Việc |
|---|---|
| **T2 09/11** | **Feature freeze** — nhánh tính năng chưa merge thì đóng, ghi vào "chưa làm" |
| T4 11/11 | Phân loại lỗi (chỉ S1/S2 được sửa trước tag); C bắt đầu hồi quy |
| T5 12/11 | Buổi tập giải thích code |
| **T6 13/11** | **Tag `v1.0`**; chụp ảnh trên bản này |
| **T7 14/11** | **Báo cáo nháp đủ chương**; họp đọc lướt cả nhóm |
| CN 15/11 | Dự phòng |

## 6. Vòng chất lượng tuần này

- Sau freeze: mọi PR là `fix/…` gắn Issue `bug`; reviewer kiểm tra không lẫn tính năng.
- Kiểm thử khám phá (B) và người ngoài nhóm (C) tìm lỗi mà kịch bản bỏ sót.
- Mọi lỗi còn mở lúc tag → release note → mục *Limitations* của Ch.4.

## 7. Nghiệm thu cuối tuần

- [ ] Tag `v1.0`; TC-33 Pass trên máy khác
- [ ] TC-32 có biên bản và kết luận theo ngưỡng
- [ ] Báo cáo nháp đủ chương; mọi hình/bảng có số và chú thích; mỗi phần do chính người viết commit
- [ ] Ma trận truy vết đủ mọi FR
- [ ] Biên bản buổi tập giải thích code
- [ ] Mỗi người ≥ 1 PR merge và ≥ 1 review

## 8. Nếu không đạt

| Tình huống | Xử lý |
|---|---|
| Còn S1 T6 13/11 | Không tag; sửa T7; tag muộn nhất CN 15/11 |
| TC-33 fail trên máy khác | S1 — sửa README/cấu hình trước mọi việc khác |
| Nháp thiếu chương | Hai ngày đầu tuần 10 để hoàn tất; **không lùi hạn nội bộ nộp** |
