# Tuần 9 — Feature freeze, v1.0, báo cáo nháp (T2 09/11 – CN 15/11/2026)

> Mốc môn học: **tag `v1.0`**, **báo cáo nháp** — không chấm riêng. Milestone: *Week 09 — Feature freeze — v1.0*. Module tự học: 10.
> Rubric: cả 5 tiêu chí Final; checklist 12.2 và 12.3.

> **Reviewer**: bất kỳ thành viên nào khác tác giả, miễn là chạy nhánh và ghi đã kiểm gì (`00-tong-quan.md` §6.2, từ 23/10).

> **Dự báo — chia chi tiết ở họp T7 07/11** (§6.8, lên kế hoạch tuần sau), theo những gì tuần 8 thật sự làm xong, nhất là mục Should nào đã merge hay bị cắt.

> **Cập nhật 27/10**: wireframe *as-built* dời từ tuần 8 sang đây (vẽ sau freeze mới đúng màn cuối) và chia theo người làm màn; ghép bản nháp chuyển từ Tiến sang Duy Anh; kiểm thử khám phá (#77) và ma trận truy vết (#78) đã làm 23/10 nên tuần này chỉ bổ sung phần mới; Tiến mở nháp Ch.4 để "đủ chương" là thật. Không có buổi demo: ảnh chụp trên `v1.0` là bằng chứng giao diện chính.

## 1. Mục tiêu

1. **Feature freeze T2 09/11** — từ đây chỉ sửa lỗi.
2. **Tag `v1.0` T6 13/11** sau hồi quy; chạy được từ clone mới trên máy khác theo README.
3. **Báo cáo nháp đủ chương T7 14/11** theo template Final, kể cả Ch.4; mỗi người viết và commit phần của mình; ảnh chụp trên bản `v1.0`.
4. **Ma trận truy vết FR → UC → service → test → trạng thái** (bằng chứng CLO1) cập nhật tới bản freeze.
5. TC-32 với **2 người ngoài nhóm**.
6. **Mỗi người giải thích được code của mình và một phần của người khác** — buổi tập có biên bản.

## 2. Điều kiện bắt đầu

- [ ] 0 S1 mở; S2 có người sửa
- [ ] Nháp báo cáo của cả 3 người (tuần 8)
- [ ] Mỗi mục Should đã merge có lượt nghiệm thu đầu tiên (tuần 8); mục bị cắt có dòng "chưa triển khai và vì sao"

## 3. Việc theo thành viên

| Mã | Việc | Giờ | Reviewer | Phụ thuộc | Đầu ra / nghiệm thu | Issue |
|---|---|---|---|---|---|---|
| W09-A1 | **Ch.1–2** cập nhật theo **cái đã xây dựng**; phần còn lại của nháp W08-A3; **chức năng của A** (UC01–04, UC13): mô tả, input/output, **ảnh trên v1.0**; **thiết kế giao diện/điều hướng hoàn chỉnh**, gồm bộ nhận diện LotOrder | 6,5 | B | tag v1.0 (ảnh) | Mọi chức năng của A có mô tả + ảnh dữ liệu thật | #73 |
| W09-A4 | **Wireframe *as-built*, phần của A**: đăng nhập, kiểm kê, cảnh báo — trạng thái thường và ít nhất một trạng thái lỗi/từ chối | 2,5 | B | freeze | HTML + PNG; mục lục wireframe và `ui-design.md` §2 cập nhật | #156 |
| W09-A3 | **Bảng "góp ý Proposal → hành động → minh chứng"** (từ Issue `proposal-feedback`) đưa vào báo cáo | 1 | B | — | Mọi góp ý có hành động hoặc lý do không làm | #75 |
| W09-A5 | **Nháp Ch.4** (đã làm so với đề xuất, hạn chế, hướng phát triển) để W10-A2 chỉ hoàn thiện | 1,5 | C | — | Nháp trong `docs/report/` | #83 |
| — | A: chạy lại test của B trong hồi quy cuối 1 · buổi tập giải thích code 1,5 · họp 2,5 · review 1,5 · sửa lỗi 2 | 8,5 | — | — | — | — |
| W09-B1 | **Chức năng của B** (UC05–08, UC14) hoàn chỉnh + **ảnh trên v1.0**; **sơ đồ use case + sequence** cho báo cáo (đánh số, chú thích) | 3 | C | tag v1.0 | Hình khớp code | #76 |
| W09-B4 | **Wireframe *as-built*, phần của B**: đơn thuốc, cấp phát, bán OTC, tính tiền — trạng thái thường và ít nhất một trạng thái lỗi/từ chối | 3 | A | freeze | HTML + PNG cùng bộ với W09-A4 | #156 |
| W09-B5 | **Ghép bản nháp — chỉ để nhất quán** (thứ tự, đánh số và chú thích hình/bảng, tham chiếu chéo); không viết lại phần của người khác | 3 | A | A1, A5, B1, C4 | Bản nháp đủ chương T7 14/11 | #74 |
| W09-B2 | **Kiểm thử khám phá bổ sung** cho phần mới sau 23/10: UC11, UC12 và các mục Should; lập bug | 0,5 | A | freeze | Lỗi tìm được có Issue và mức | #77 (bổ sung) |
| W09-B3 | **Ma trận truy vết cập nhật tới bản freeze** (UC11, UC12 và Should; trạng thái đã làm / một phần / chưa, lý do) | 0,5 | C | freeze | Mọi FR có trạng thái đúng với code | #78 (bổ sung) |
| W09-B6 | **Chạy TC-32 và TC-33** (người chạy; C tổ chức) · **chạy các ca của C** trong hồi quy cuối | 3 | — | C1, C2, C3 | Lượt chạy trong `runs.md` | #79, #80, #81 |
| — | B: buổi tập giải thích code 1,5 · họp 2,5 · review 1,5 · sửa lỗi 1,5 | 7 | — | — | — | — |
| W09-C1 | **Tổ chức TC-32**: 2 người ngoài nhóm làm các tác vụ chính không có hướng dẫn từng bước; ghi thời gian, lỗi, khó khăn; so với ngưỡng NFR khả dụng (QĐ 9) | 2 | B | freeze | Biên bản trong `tests/manual/evidence/`; Pass/Fail theo ngưỡng | #79 |
| W09-C2 | **TC-33**: chuẩn bị clone mới trên máy khác → làm theo README → chạy được (DB, migration, seed, tài khoản mẫu); hoàn thiện **run guide**. **Sinh lại sơ đồ** class và ERD từ code, theo phân hệ | 3,5 | B | — | Run guide trong repo; sơ đồ khớp code | #80, #71 |
| W09-C3 | **Hồi quy cuối — chỉ kiểm thử** (bộ R + TC-31, bắt đầu **T4 11/11**, sớm hơn thứ Năm của §6.5 để kịp tag T6): C chạy ca của A và TC-31, A chạy ca của B, B chạy ca của C → **ký và tag `v1.0`** T6 13/11 (người ký dự phòng: B) | 4 | A | C1, C2 | Tag + release note liệt kê lỗi còn mở | #81 |
| W09-C4 | **Chức năng của C** (UC09–12, UC15, UC16) và **kết quả kiểm thử** hoàn chỉnh + ảnh trên v1.0 | 3 | A | tag v1.0 | Nháp trong `docs/report/` | #72 |
| W09-C5 | **Chạy TC-29 và TC-30** bằng script và hướng dẫn của W08-A2 (người chạy) | 1 | — | W08-A2 | Số đo + biên bản restore trong `runs.md` | #65 |
| — | C: buổi tập 1,5 · họp 2,5 · review 1,5 · sửa lỗi 1 | 6,5 | — | — | — | — |

**Buổi tập giải thích code (1,5 giờ, T5 12/11)**: mỗi người chọn 2 đoạn code của người khác và hỏi "tại sao viết thế này?", "nếu đổi X thì sao?". **Biên bản hỏi–đáp lưu vào `docs/`**; câu nào không trả lời được thì người viết giải thích lại và bổ sung vào tài liệu thiết kế. Ưu tiên chọn code Should vừa viết ở tuần 8.

## 4. Phân bổ giờ

| Người | Test | Review | Sửa lỗi/Dự phòng | Báo cáo / wireframe / sơ đồ | Họp + tập giải thích | **Tổng** |
|---|---|---|---|---|---|---|
| A | 1 | 1,5 | 2 | 11,5 | 4 | **20** |
| B | 3,5 | 1,5 | 1,5 | 9,5 | 4 | **20** |
| C | 9 | 1,5 | 1 | 4,5 | 4 | **20** |

## 5. Lịch

| Ngày | Việc |
|---|---|
| **T2 09/11** | **Feature freeze** — nhánh tính năng chưa merge thì đóng, ghi vào "chưa làm"; bắt đầu wireframe *as-built* |
| T4 11/11 | Phân loại lỗi (chỉ S1/S2 được sửa trước tag); C bắt đầu hồi quy |
| T5 12/11 | Buổi tập giải thích code |
| **T6 13/11** | **Tag `v1.0`**; chụp ảnh trên bản này, dữ liệu seed thật |
| **T7 14/11** | **Báo cáo nháp đủ chương**; họp đọc lướt cả nhóm |
| CN 15/11 | Dự phòng |

## 6. Vòng chất lượng tuần này

- Sau freeze: mọi PR **đổi code ứng dụng** là `fix/…` gắn Issue `bug`; reviewer kiểm tra không lẫn tính năng. PR báo cáo, wireframe, sơ đồ, lượt chạy vẫn mở bình thường.
- Kiểm thử khám phá (B) và người ngoài nhóm (TC-32) tìm lỗi mà kịch bản bỏ sót.
- Mọi lỗi còn mở lúc tag → release note → mục *Limitations* của Ch.4.
- Ảnh trong báo cáo chụp lại nếu một bản sửa sau `v1.0` làm đổi màn hình.

## 7. Nghiệm thu cuối tuần

- [ ] Tag `v1.0`; TC-33 Pass trên máy khác
- [ ] TC-32 có biên bản và kết luận theo ngưỡng
- [ ] Báo cáo nháp đủ chương, kể cả Ch.4; mọi hình/bảng có số và chú thích; mỗi phần do chính người viết commit
- [ ] Wireframe *as-built* đủ 7 màn
- [ ] Ma trận truy vết đủ mọi FR, đúng tới bản freeze
- [ ] Biên bản buổi tập giải thích code
- [ ] Mỗi người ≥ 1 PR merge và ≥ 1 review

## 8. Nếu không đạt

| Tình huống | Xử lý |
|---|---|
| Còn S1 hoặc S2 T6 13/11 | Không tag; sửa T7; tag muộn nhất CN 15/11 |
| TC-33 fail trên máy khác | S1 — sửa README/cấu hình trước mọi việc khác |
| Nháp thiếu chương | Hai ngày đầu tuần 10 để hoàn tất; **không lùi hạn nội bộ nộp** |
| Wireframe *as-built* chưa xong T6 13/11 | Thay bằng ảnh chụp trên `v1.0` có chú thích; ghi trong báo cáo |
