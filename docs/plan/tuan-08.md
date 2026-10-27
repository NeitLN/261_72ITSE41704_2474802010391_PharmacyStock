# Tuần 8 — Làm vững hệ thống, Should, nháp báo cáo (T2 02/11 – CN 08/11/2026)

> Mốc môn học: **tài liệu thiết kế cập nhật** — không chấm riêng. Milestone: *Week 08 — Hardening*. Module tự học: ôn 4, 9.
> Rubric: *Implementation & Testing* (xử lý lỗi, lưu trữ, bảo mật, hiệu năng); *System Design* (sơ đồ khớp code); *Report Writing* (bắt đầu viết).

> **Reviewer**: bất kỳ thành viên nào khác tác giả, miễn là chạy nhánh và ghi đã kiểm gì (`00-tong-quan.md` §6.2, từ 23/10). PR gắn `stock-integrity` cần thêm A làm người duyệt thứ hai; khi A là tác giả thì người duyệt thứ hai là B hoặc C.

> **Bản nháp — chốt ở họp T7 31/10** (§6.8, lên kế hoạch tuần sau) khi đã biết kết quả cổng Must-core (#63), tag `v0.2`, hành động của Appendix D và Minh có đồng ý làm thêm hay không.

> **Cập nhật 27/10** (trưởng nhóm, sau khi bàn với cả nhóm và rà lại theo hiện trạng tuần 7): làm **cả bốn mục Should** nếu qua cổng Must-core; bớt việc đã xong sớm; dời wireframe *as-built* sang tuần 9 (vẽ sau freeze mới đúng màn cuối); bớt giờ của Tiến (29 → 24) bằng cách chuyển việc sang Duy Anh. **Minh 28 giờ** vì UC15 — cần Minh đồng ý ở họp T4 28/10; không đồng ý thì UC15 cắt ngay. Không có buổi demo với giảng viên: chấm qua báo cáo, repo và ảnh chụp.

## 1. Mục tiêu

1. **Không có UC Must mới.** Làm vững: rollback, đồng thời ép chồng lấn thật, chống gửi lặp, phân quyền, hiệu năng, backup.
2. **Bốn mục Should** (nếu qua cổng), mỗi mục là một lát dọc có test và lượt nghiệm thu đầu tiên **trước freeze T2 09/11**: FR-46/47 đánh giá hàng cách ly và ghi tiêu hủy · UC14 màn hình khách hàng và bác sĩ · UC13 giá theo ngày hiệu lực · UC15 người dùng và vai trò (thứ tự ưu tiên khi cắt: UC15 cắt trước).
3. Mọi BR đã làm có đủ test theo bảng tình huống; hai lỗi S3 còn mở (#201, #215) sửa và chạy lại.
4. **Mỗi người có nháp phần báo cáo của mình** (phần còn lại hoàn tất ở tuần 9).

## 2. Điều kiện bắt đầu

- [ ] `v0.2` đã tag và **cổng Must-core (#63) đạt trước T7 31/10**, gồm TC-26/54/62 đã có lượt chạy (bộ RACE-01…03, A chạy). Cổng phải phục hồi sang T3 03/11 thì **cắt cả bốn mục Should** (§9.3), tuần 8 chỉ làm vững
- [ ] Minh đồng ý làm thêm cho UC15 (họp T4 28/10)
- [ ] Việc tuần 7 khép lại: **TC-23** chạy trên seed của #198 (B, có bảng tính tay); #216 (nhận diện) đã merge và **TC-20, 42, 43** chạy lại (B) cùng **TC-65** (C) — nếu #216 để sau tag thì các lượt này chuyển vào đầu tuần 8; #202 (B) và #203 (C) có kết quả ghi trên issue
- [ ] Appendix D có hành động cho tuần 8–9 (người, giờ, hạn)
- [ ] **T2 02/11: A xác nhận hạn nộp Final trên CTE** (ngày, giờ, định dạng) và báo nhóm; tuần 10 đang giả định CN 22/11

## 3. Việc theo thành viên

| Mã | Việc | Giờ | Reviewer | Phụ thuộc | Đầu ra / nghiệm thu | Issue |
|---|---|---|---|---|---|---|
| W08-A1 | **TC-25** rollback giữa giao dịch: e2e UC03-08 đã có (dòng thứ hai lỗi → không lưu gì); rà lại và ghi bằng chứng cho người chạy (TC-24 đã Pass ở lượt 27) | 1 | C | v0.2 | TC-25 Pass do C chạy | #64 |
| W08-A2 | **TC-29 Hiệu năng** theo QĐ 9: script nạp dữ liệu lớn vào **DB riêng** và kịch bản đo (10 lần, trung vị, ghi cấu hình máy); **TC-30 backup/restore** *(S)*: hướng dẫn `pg_dump` trong README. C đo và chạy ở W09-C5 | 4 | B | QĐ 9 | Script + hướng dẫn merge; số đo do C ghi | #65 |
| W08-A3 | **Báo cáo — nháp phần 1**: Ch.2 (nền tảng: kiến trúc phân tầng NestJS, TypeORM, FEFO, quy trình nhà thuốc có nguồn) và Ch.3 **kiến trúc và dữ liệu**; phần thiết kế giao diện làm ở W09-A1 | 4 | B | — | Nháp trong `docs/report/` | #66 |
| W08-A5 | **Rà UX từng màn** theo `ui-design.md` §4–§5, cả màn mới của bộ nhận diện; mỗi chỗ thiếu thành issue S3/S4 | 1,5 | B | — | Xong T3 03/11 để kịp sửa trước freeze | #157 |
| W08-A6 | **UC13 giá theo ngày hiệu lực** *(S, nếu qua cổng)*: thao tác **lên lịch giá** riêng (ngày ≥ hôm nay, trùng ngày bị từ chối) — giữ nguyên cách UC01 sửa giá trong ngày; xem lịch sử giá; e2e BR09 | 5 | B | cổng | TC-40, TC-41 Pass do C chạy | #103 |
| W08-A7 | **Chạy test của B**: TC-27 (gửi lặp cấp phát và trả hàng), TC-49 chạy lại sau #201, nghiệm thu màn hình UC14 | 2 | — | B2, B5 | Lượt chạy trong `runs.md` | #68, #201 |
| — | A: họp 2,5 · review 3 (gồm người duyệt thứ hai `stock-integrity`) · giữ thứ tự migration 1; không còn giờ dự phòng | 6,5 | — | — | — | — |
| W08-B1 | **TC-26/54 ép chồng lấn thật**: RACE-02/03 hiện gửi hai request cùng lúc (`Promise.all`) mà không giữ khóa; thêm bước chờ trong transaction để 20/20 lần chắc chắn tranh nhau, invariant giữ | 2 | A | #165 | 20/20 lần đúng; TC-26, TC-54 Pass do A chạy | #67 |
| W08-B2 | Rà **mọi dòng bảng tình huống BR có test `BRxx-*` pass**; chuẩn bị TC-27 cho A chạy | 1,5 | A | — | Bảng "tình huống → tên test" không còn dòng trống | #68 |
| W08-B3 | **Báo cáo — nháp**: Ch.3 **chức năng của B** (UC05–08, UC14: mô tả, input/output, trích 5–25 dòng code FEFO/`StockLedger` có giải thích) | 3,5 | C | — | Nháp trong `docs/report/` | #69 |
| W08-B4 | **Làm vững UI, phần thiết yếu**: màn cũ dùng bộ UI chung (#155), chữ khi bảng rỗng ở cấp phát và bán hàng, sửa S3/S4 từ A5 và C4; chuyển động trang trí **cắt** | 1,5 | A | #155, A5 | Merge trước T5 05/11 | #158 |
| W08-B5 | **UC14 màn hình khách hàng và bác sĩ** *(S, nếu qua cổng)*: danh sách, tìm, sửa, ngừng/mở lại, lỗi theo field — API đã có từ UC05 | 4 | A | cổng | Nghiệm thu màn hình do A | #104 |
| W08-B7 | **Sửa #201** (số chứng chỉ bác sĩ không phân biệt hoa thường) — không phụ thuộc cổng: ảnh hưởng tạo nhanh của UC05 (Must) | 1 | A | — | Test tái hiện; TC-49 Pass do A chạy lại | #201 |
| W08-B6 | **Chạy test của C**: TC-53 (sau C1), TC-61 (FR-46/47), TC-44 (UC15), TC-20 và TC-51 sau #215 | 2 | — | C1, C5, C6 | Lượt chạy trong `runs.md` | #70, #105, #215 |
| — | B: họp 2,5 · review 2 | 4,5 | — | — | — | — |
| W08-C1 | **Kiểm toán phân quyền**: bảng endpoint → permission khớp **61 route** hiện có cộng endpoint Should mới; kiểm validation, secret, hash mật khẩu. Vượt quyền = S1 | 1,5 | B | — | TC-53 Pass; bảng không còn ô trống | #70 |
| W08-C2 | **Sơ đồ — ghi thay đổi**: mỗi PR Should kèm phần sơ đồ của nó; sinh lại toàn bộ ở W09-C2 | 0,5 | A | — | Danh sách class/bảng mới để sinh lại | #71 |
| W08-C3 | **Hồi quy phần đổi** (bắt đầu sau khi merge Should, trưa T5 05/11) + **báo cáo — nháp**: Ch.3 **chức năng của C** (UC09–12, UC15, UC16) và quy trình kiểm thử | 3 | A | B4, Should | `runs.md` có lượt hồi quy tuần 8; nháp trong `docs/report/` | #72 |
| W08-C4 | **Tổ chức chạy thử TC-32** với 1 người ngoài nhóm (T4 04/11), cùng phiếu tác vụ của TC-32; người ngoài nhóm làm tác vụ, C quan sát và ghi (lượt TC-32 chính thức ở tuần 9 do B chạy) | 1 | B | — | Thời gian, số lần hỏi, chỗ vướng vào `tests/manual/evidence/`; mỗi vấn đề thành issue S3/S4 ngay hôm đó | #159 |
| W08-C5 | **FR-46/47 đánh giá hàng cách ly và ghi tiêu hủy** *(S, nếu qua cổng)*: danh sách chờ đánh giá và chờ tiêu hủy; đánh giá trong một transaction (cho bán lại hoặc loại), chặn đánh giá hai lần; **chốt trước khi code** bản ghi tiêu hủy cần gì (ngày, cách, người chứng kiến) vì `destroy()` chỉ nhận lý do | 7 | A + B | cổng, #178 | TC-61 Pass do B chạy; invariant vẫn pass | #105 (phần FR-46/47) |
| W08-C6 | **UC15 người dùng và vai trò** *(S, nếu qua cổng và Minh đồng ý)*: thiết kế chốt **T2 02/11**; tạo user, đổi vai trò, khóa/mở, mỗi thay đổi ghi audit — đúng phạm vi TC-44. **Không làm**, ghi vào "chưa làm": đặt lại mật khẩu (FR-40 chỉ làm một phần) và audit đăng nhập, đổi giá, duyệt kiểm kê (FR-41 một phần) | 8 | A + B | cổng, C6 thiết kế | TC-44 Pass do B chạy; TC-53 vẫn Pass | #105 (phần UC15) |
| W08-C7 | **Chạy test của A** (TC-25, TC-40, TC-41) và **TC-64** (việc sửa của #203) · **sửa #215** (BR08: người đếm bị ghi đè vẫn duyệt được; sau đó B chạy TC-20, TC-51) | 2,5 | — | A1, A6 | Lượt chạy trong `runs.md`; #215 có test tái hiện | #203, #215 |
| — | C: họp 2,5 · review 2 | 4,5 | — | — | — | — |

**Thứ tự và điểm cắt của Should** (bàn với cả nhóm 27/10):

| Mốc | Việc |
|---|---|
| **T2 02/11** | Thiết kế (hợp đồng API, bảng tình huống) của cả bốn mục merge trước khi code; UC14, UC13, FR-46/47 bắt đầu song song; UC15 bắt đầu cùng lúc, không chờ FR-46/47 |
| T3 03/11 | Chốt migration nào cần (A giữ thứ tự migration); không giả định "không cần" hay "cần hết" |
| **T4 04/11, trưa** | **Điểm cắt**: mục nào chưa *review được* — đủ lát dọc, test, tài liệu, CI xanh — thì **cắt**, ghi vào "chưa triển khai và vì sao" (W10-B1). Thứ tự cắt: UC15 → UC13 → UC14 → FR-46/47 |
| **T5 05/11, trưa** | Mọi tính năng đã merge; hồi quy phần đổi bắt đầu trên commit sau cùng |
| T6–CN 06–08/11 | Chỉ nghiệm thu (người chạy ≠ tác giả) và sửa lỗi |

## 4. Phân bổ giờ

| Người | Should | Làm vững / test / UX | Chạy test của người khác | Báo cáo / thiết kế | Review | Họp | Dự phòng / sửa lỗi | **Tổng** |
|---|---|---|---|---|---|---|---|---|
| A | 5 (UC13) | 6,5 | 2 | 4 | 3 | 2,5 | — (migration 1) | **24** (làm thêm, đã đồng ý) |
| B | 5 (UC14 4 + #201 1) | 5 | 2 | 3,5 | 2 | 2,5 | — | **20** |
| C | 15 (FR-46/47 7 + UC15 8) | 2,5 | 2,5 (+ #215) | 3,5 | 2 | 2,5 | — | **28** (làm thêm, cần Minh đồng ý) |

Nếu UC15 cắt, phần việc còn lại của C là **20 giờ**. Cắt ở họp T4 28/10 (Minh không đồng ý) thì không mất gì; cắt ở điểm T4 04/11 thì giờ đã bỏ ra không lấy lại được — vì vậy thiết kế UC15 ngày T2 02/11 phải đủ rõ để quyết sớm.

## 5. Vòng chất lượng tuần này

- Kiểm thử phi chức năng có số đo, điều kiện, lặp lại được.
- **Phân loại lỗi dồn**: mọi S3/S4 còn mở được gán tuần 8 hoặc 9; sau freeze (T2 09/11) chỉ sửa lỗi.
- Mỗi mục Should vào `main` như một tính năng: cổng thiết kế, test, review, lượt nghiệm thu đầu tiên trước freeze. Tuần 9 chỉ xác nhận lại trong hồi quy cuối.
- **Ảnh chụp**: chụp trên bản `v1.0` ở tuần 9; tuần này chỉ lập danh sách ảnh cần có.
- Nháp báo cáo: mỗi người **tự commit phần mình**; người review đọc theo rubric *Report Writing*.

## 6. Bàn giao và minh chứng

- e2e TC-25, 26 (ép chồng lấn), 53, 54; số đo TC-29; biên bản TC-30.
- Lượt chạy đầu của TC-40, 41, 44, 61 (mục Should nào đã làm); TC-49 sau #201; TC-20, 51 sau #215; TC-64.
- `docs/report/` có nháp của cả 3 người.

## 7. Nghiệm thu cuối tuần

- [ ] TC-25, 26 (20/20, ép chồng lấn), 27, 29, 53, 54 có lượt Pass; 0 S1/S2 mở
- [ ] Mỗi mục Should đã merge có lượt Pass do người khác tác giả chạy; mục bị cắt có dòng trong "chưa triển khai và vì sao"
- [ ] #201 và #215 đã sửa và chạy lại (TC-49, TC-20, TC-51)
- [ ] Mọi dòng bảng tình huống BR đã làm có test pass trong CI
- [ ] 3 bản nháp báo cáo, mỗi bản do chính người viết commit
- [ ] Mỗi người ≥ 1 PR merge và ≥ 2 review

## 8. Nếu không đạt

| Tình huống | Xử lý |
|---|---|
| Cổng Must-core phải phục hồi sang T3 03/11 | Cắt cả bốn mục Should; tuần 8 chỉ làm vững và báo cáo |
| Mục Should chưa review được trưa T4 04/11 | Cắt theo thứ tự UC15 → UC13 → UC14 → FR-46/47; không mượn giờ báo cáo hay nghiệm thu |
| TC-26/54 fail | **S1** — B + A ngồi cặp ưu tiên tuyệt đối; hoãn TC-30 (Should) |
| Nháp báo cáo chưa có | Tuần 9 dùng giờ sửa lỗi và đổi wireframe *as-built* thành ảnh chụp có chú thích (W09 §8) để lấy giờ; **không lùi freeze** |
