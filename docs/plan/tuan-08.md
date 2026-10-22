# Tuần 8 — Làm vững hệ thống, nháp báo cáo (T2 02/11 – CN 08/11/2026)

> Mốc môn học: **tài liệu thiết kế cập nhật** — không chấm riêng. Milestone: *Week 08 — Hardening*. Module tự học: ôn 4, 9.
> Rubric: *Implementation & Testing* (xử lý lỗi, lưu trữ, bảo mật, hiệu năng); *System Design* (sơ đồ khớp code); *Report Writing* (bắt đầu viết).

> **Reviewer** theo vòng mới từ 12/10 (A do C duyệt, B do A, C do B; `00-tong-quan.md` §6.2).

## 1. Mục tiêu

1. **Không có UC Must mới.** Làm vững: restart, rollback, đồng thời (stress), chống gửi lặp, phân quyền, hiệu năng, backup.
2. Mọi BR đã làm có đủ test theo bảng tình huống; Should dở dang thì hoàn tất hoặc cắt có ghi chép.
3. **Sơ đồ sinh lại từ code**, chia theo phân hệ; class nào không có chức năng dùng thì đánh dấu hoặc bỏ.
4. **Mỗi người có nháp phần báo cáo của mình**, theo khung chương (tuần 5).

## 2. Điều kiện bắt đầu

- [ ] `v0.2` đã tag
- [ ] Appendix D có hành động cho tuần 8–9
- [ ] Rubric đầy đủ + template Final đã có (tuần 3)

## 3. Việc theo thành viên

| Mã | Việc | Giờ | Reviewer | Phụ thuộc | Đầu ra / nghiệm thu | Issue |
|---|---|---|---|---|---|---|
| W08-A1 | **TC-24** dữ liệu còn sau restart; **TC-25** lỗi DB giữa giao dịch → rollback toàn bộ (e2e mô phỏng lỗi) | 3 | C | v0.2 | Hai ca Pass do C chạy; e2e TC-25 trong CI | #64 |
| W08-A2 | **TC-29 Hiệu năng** theo QĐ 9 (nạp dữ liệu lớn vào **DB riêng**, 10 lần đo, trung vị, ghi cấu hình máy); **TC-30 backup/restore** *(S)* bằng `pg_dump` + hướng dẫn trong README | 4 | B | QĐ 9 | Số đo + điều kiện trong `runs.md`; restore khớp số dư | #65 (nội dung đổi) |
| W08-A3 | **Báo cáo — nháp**: Ch.2 (nền tảng: kiến trúc phân tầng NestJS, TypeORM, FEFO, quy trình nhà thuốc hiện tại có nguồn); Ch.3 phần **kiến trúc và dữ liệu** (ERD và các bảng, luồng dữ liệu) + **thiết kế giao diện và điều hướng** (từ `ui-design.md`) | 7 | B | — | Nháp trong `docs/report/` | #66 |
| W08-A4 | **Wireframe *as-built* 7 màn đã làm**: đăng nhập, đơn thuốc, cấp phát, bán OTC, tính tiền, kiểm kê, cảnh báo — mỗi màn có trạng thái thường và ít nhất một trạng thái lỗi/từ chối | 5,5 | B | — | HTML + PNG; mục lục wireframe và `ui-design.md` §2 cập nhật; trước T5 05/11 | #156 |
| W08-A5 | **Rà UX từng màn** theo bảng trạng thái `ui-design.md` §4 và quy ước §5; mỗi chỗ thiếu thành issue S3/S4 | 1,5 | B | — | Xong T3 03/11 để kịp sửa trước freeze | #157 |
| — | A: họp 2,5 · review 2 · giữ schema/seed 1 · sửa lỗi 2,5 | 8 | — | — | — | — |
| W08-B1 | **TC-26 stress**: 20 lần hai kết nối tranh lượng cuối, ép chồng lấn thật (chờ trong transaction) → đúng một thành công, còn lại lỗi nghiệp vụ, invariant giữ. **TC-54** hai dược sĩ cấp cùng dòng đơn | 3 | A + C | W05-B3, W06-B1 | 20/20 lần đúng; TC-54 Pass | #67 |
| W08-B2 | **TC-27** gửi lặp cấp phát và trả hàng (`requestId`) do A chạy; rà **mọi dòng bảng tình huống BR có test `BRxx-*` pass** | 3 | A | — | Bảng "tình huống → tên test" không còn dòng trống | #68 |
| W08-B3 | **Báo cáo — nháp**: Ch.3 **chức năng của B** (UC05–08, UC14: mô tả, input/output, trích 5–25 dòng code FEFO/`StockLedger` có giải thích); phần thiết kế giao diện chuyển sang A3 (22/10) | 3,5 | C | — | Nháp trong `docs/report/` | #69 |
| W08-B4 | **Làm vững UI trước freeze**: các màn cũ dùng bộ UI chung (#155); chữ khi bảng rỗng ở màn cấp phát và bán hàng; chuyển động tối thiểu theo `ui-design.md` §5.1 (tôn trọng `prefers-reduced-motion`); sửa lỗi S3/S4 từ A5 và C4 | 3 | A | #155, A5 | Merge trước T5 05/11 để hồi quy phủ | #158 |
| — | B: họp 2,5 · review 2 · sửa lỗi 3 | 7,5 | — | — | — | — |
| W08-C1 | **Kiểm toán phân quyền**: bảng endpoint → permission; **e2e ma trận vai trò × endpoint (TC-53) phủ toàn bộ**; kiểm validation, secret, hash mật khẩu. Vượt quyền = S1 | 3 | B | — | TC-53 Pass; bảng không còn ô trống | #70 |
| W08-C2 | **Sơ đồ sinh lại từ code** (class, ERD), chia theo phân hệ; đánh dấu/bỏ class không dùng nếu Should bị cắt; cập nhật sequence nếu code lệch | 2,5 | A | — | Reviewer đối chiếu sơ đồ với code, không thấy lệch | #71 (nội dung đổi) |
| W08-C3 | **Hồi quy toàn bộ bộ R** (bắt đầu T5 05/11) + **báo cáo — nháp**: Ch.3 **chức năng của C** (UC09–12, UC15, UC16) + **quy trình và kết quả kiểm thử** | 5,5 | A | — | `runs.md` có lượt hồi quy tuần 8; nháp trong `docs/report/` | #72 |
| W08-C4 | **Chạy thử TC-32** với 1 người ngoài nhóm (T4 04/11), cùng phiếu tác vụ của TC-32 | 1 | B | — | Thời gian, số lần hỏi, chỗ vướng ghi vào `tests/manual/evidence/`; mỗi vấn đề thành issue S3/S4 ngay hôm đó | #159 |
| — | C: họp 2,5 · review 2 · sửa lỗi 3,5 | 8 | — | — | — | — |

*Cập nhật 12/10 theo Proposal v1.1 §2.4*: **nếu cổng Must-core tuần 7 đạt**, A làm thêm UC13 lịch sử giá (BR09, nội dung cũ của #55), B làm màn hình UC14, C làm UC15 và đánh giá cách ly/tiêu hủy (FR-46, 47). Giờ lấy từ dòng sửa lỗi/dự phòng và cân lại ở retro T7 31/10. Nếu cổng không đạt, tuần 8 dành cho sửa Must và các mục này vào danh sách cắt (§9.3 tổng quan).

*UI/UX (thêm 22/10, lộ trình `ui-design.md` §8)*: mọi thay đổi giao diện merge trước freeze T2 09/11. Tiến rà UX (A5) và vẽ wireframe *as-built* (A4); Minh cho 1 người ngoài nhóm chạy thử TC-32 ngày T4 04/11 vì TC-32 chính thức ở tuần 9 là sau freeze, lỗi tìm được khi đó không còn sửa được; Duy Anh sửa theo hai kết quả đó (B4). **Tuần 8 của Tiến là 29 giờ** (A3 thêm 2, A4 5,5, A5 1,5) — Tiến chấp nhận làm thêm, quyết định 22/10.

## 4. Phân bổ giờ

| Người | Code | Test | Review | Sửa lỗi/Dự phòng | Báo cáo/Tài liệu | Thiết kế UI | Họp | **Tổng** |
|---|---|---|---|---|---|---|---|---|
| A | 2 | 5 | 2 | 2,5 | 8 | 7 | 2,5 | **29** (làm thêm, 22/10) |
| B | 2 + UI 3 | 4 | 2 | 3 | 3,5 | — | 2,5 | **20** |
| C | 1 | 5,5 + chạy thử 1 | 2 | 3,5 | 4,5 | — | 2,5 | **20** |

## 5. Vòng chất lượng tuần này

- Kiểm thử phi chức năng có số đo, điều kiện, lặp lại được.
- **Phân loại lỗi dồn**: mọi S3/S4 còn mở được gán tuần 8 hoặc 9; sau freeze (T2 09/11) chỉ sửa lỗi.
- **Ảnh chụp**: chụp lại trên bản `v1.0` ở tuần 9; tuần này chỉ lập danh sách ảnh cần có.
- Nháp báo cáo: mỗi người **tự commit phần mình**; người review đọc theo rubric *Report Writing*.

## 6. Bàn giao và minh chứng

- e2e TC-25, 26, 53, 54; số đo TC-29; biên bản TC-30.
- `docs/diagrams/` sinh lại; `docs/report/` có nháp của cả 3 người.

## 7. Nghiệm thu cuối tuần

- [ ] TC-24, 25, 26 (20/20), 27, 29, 53, 54 có lượt Pass; 0 S1/S2 mở
- [ ] Mọi dòng bảng tình huống BR đã làm có test pass trong CI
- [ ] Sơ đồ khớp code (reviewer ghi xác nhận trên PR)
- [ ] 3 bản nháp báo cáo, mỗi bản do chính người viết commit
- [ ] Mỗi người ≥ 1 PR merge và ≥ 2 review

## 8. Nếu không đạt

| Tình huống | Xử lý |
|---|---|
| TC-26/54 fail | **S1** — B + A ngồi cặp ưu tiên tuyệt đối; hoãn TC-30 (Should) |
| Should còn dở | Cắt; ghi vào mục "chưa triển khai và vì sao" của báo cáo (W10-B1) |
| Nháp báo cáo chưa có | Tuần 9 lấy 2 giờ/người từ dự phòng; **không lùi freeze** |
