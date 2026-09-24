# Tuần 6 — Quy tắc đơn thuốc, bán hàng, kiểm kê (T2 19/10 – CN 25/10/2026)

> Mốc môn học: **bảng test case** — không chấm riêng. Milestone: *Week 06 — Testing and validation*. Module tự học: 8.
> Rubric: *Implementation & Testing* (CLO4) — "rigorous validation; comprehensive exception handling; thorough, documented testing".

## 1. Mục tiêu

1. Quy tắc đơn thuốc: BR04 (gồm `validUntil`), BR07 (khóa `PrescriptionItem`), BR10 *(S)*.
2. UC07 bán hàng: **OTC áp BR01/02 và từ chối thuốc kiểm soát**; thanh toán cho lần cấp **không trừ kho lần hai**.
3. UC04 tra cứu tồn và lịch sử lô; UC09 kiểm kê (BR08 *(S)*); UC10 cảnh báo tồn thấp.
4. **Invariant BR05** có test; **kiểm thử luân phiên đợt 1**; nhật ký test ≥ 25 lượt chạy.

## 2. Điều kiện bắt đầu

- [ ] `v0.1` đã tag
- [ ] **Cổng thiết kế T2 19/10** (30 phút): sequence + bảng tình huống cho UC07 (B), UC09 + cảnh báo (C), UC04 (A) đã merge **trước** PR tính năng

## 3. Việc theo thành viên

| Mã | Việc | Giờ | Reviewer | Phụ thuộc | Đầu ra / nghiệm thu | Issue |
|---|---|---|---|---|---|---|
| W06-A1 | **UC04 Tra cứu tồn và lịch sử lô**: lọc theo thuốc/nhóm/trạng thái; xem mọi movement của một lô (cả bút toán đảo) | 5 | B | cổng thiết kế | TC-48 Pass do C chạy | #46 |
| W06-A2 | **Xử lý lỗi đồng nhất**: bảng *endpoint × input sai* (thiếu trường, sai kiểu, vi phạm unique, CHECK, mất kết nối DB) → mỗi ô có kết quả mong đợi và test; TC-02, 03 | 4 | C | — | Bảng trong `docs/design/`; mọi ô có test pass | #47 |
| W06-A3 | **Người chạy test của B**: TC-05, 07, 08, 10, 11, 47, 55 → `runs.md` | 3 | — | B1, B2 | Lượt chạy có commit SHA | #48 |
| — | A: họp 2,5 · review 3 (người thứ hai `stock-integrity`) · giữ schema/seed 1 · sửa lỗi 1,5 | 8 | — | — | — | — |
| W06-B1 | **`PrescriptionValidator`**: BR04 (đơn hợp lệ theo QĐ 3, gồm `validUntil`), BR07 (khóa `PrescriptionItem` trong transaction, tổng đã cấp ≤ lượng kê), BR10 *(S)*; unit `BR04/07/10-*` | 5 | C + A | QĐ 3 | Unit pass theo bảng tình huống | #49 |
| W06-B2 | **UC07 Bán hàng**: OTC qua `FefoAllocator` + `StockLedger` (BR01/02), **từ chối thuốc kiểm soát** (QĐ 11); thanh toán cho lần cấp tạo SaleLine có `dispenseLine`, **không** ghi movement (QĐ 5); giá theo QĐ 12; tổng tiền bằng thư viện số thập phân | 6 | C + A | W06-B1, QĐ 5/11/12 | TC-15, 35, 36, 52, 55 Pass do người khác chạy | #50 |
| W06-B3 | **Test invariant BR05** qua nhập, cấp, bán, điều chỉnh; **người chạy test của C**: TC-19, 20, 21, 39 | 3 | C | C1, C2 | Invariant pass; lượt chạy trong `runs.md` | #51 |
| — | B: sequence UC07 + bảng tình huống (cổng) 1 · họp 2,5 · review 1,5 · sửa lỗi 1 | 6 | — | — | — | — |
| W06-C1 | **UC09 Kiểm kê**: tạo → đếm → lý do bắt buộc khi chênh → `PENDING_APPROVAL` → **người duyệt khác người đếm** (BR08) → ghi chênh lệch = đếm − `systemQuantity` (QĐ 15) qua `StockLedger`; `approvedAt` | 6 | A | cổng thiết kế | TC-19, 20, 39, 51 Pass do B chạy | #52 |
| W06-C2 | **UC10 Cảnh báo tồn thấp** theo QĐ 8 và QĐ 16 (sinh sau movement, không trùng, tự *RESOLVED*) | 3 | A | — | TC-21 Pass do B chạy | #53 (nội dung đổi) |
| W06-C3 | **Người chạy test của A**: TC-01, 02, 24, 45, 46, 48; bắt đầu **e2e ma trận vai trò × endpoint** (TC-53) | 3 | B | A1, A2 | Lượt chạy trong `runs.md`; TC-53 phủ các endpoint hiện có | #54 (nội dung đổi) |
| — | C: sequence kiểm kê + cảnh báo (cổng) 1 · họp 2,5 · review 2 (reviewer chính của A) · sửa lỗi 2,5 | 8 | — | — | — | — |

**Luân phiên người chạy test**: A chạy test của B · B chạy test của C · C chạy test của A. Tác giả sửa lỗi; người chạy test ban đầu chạy lại.

## 4. Phân bổ giờ

| Người | Thiết kế | Code | Test | Review | Sửa lỗi/Dự phòng | Tài liệu | Họp | **Tổng** |
|---|---|---|---|---|---|---|---|---|
| A | — | 7 | 5 | 3 | 1,5 | 1 | 2,5 | **20** |
| B | 1 | 9 | 3 | 1,5 | 1 | 2 | 2,5 | **20** |
| C | 1 | 8 | 4 | 2 | 2,5 | — | 2,5 | **20** |

## 5. Vòng chất lượng tuần này

- **Ca biên bắt buộc có test**: đơn hết hạn *đúng ngày*; cấp *đúng* phần còn lại; hai dược sĩ cấp cùng một dòng đơn; tồn *bằng* ngưỡng; người đếm tự duyệt; OTC thuốc kiểm soát.
- **Review nghiệp vụ**: PR dẫn link QĐ trong `docs/README.md`; reviewer kiểm theo QĐ đó.
- **Phân loại lỗi T4 21/10**; **hồi quy nhẹ T6**: CI + TC-04, 06 sau mọi thay đổi ở `StockLedger`/`FefoAllocator`.

## 6. Bàn giao và minh chứng

- `runs.md` ≥ 25 lượt chạy, mỗi lượt có người chạy ≠ tác giả và commit SHA; chuỗi Fail → sửa → Pass có link bug.
- Unit `BR04/05/07/08/10-*` trong CI; bảng lỗi *endpoint × input*.

## 7. Nghiệm thu cuối tuần

- [ ] UC04, UC07 (OTC + thanh toán cho lần cấp), UC09, UC10 chạy end-to-end
- [ ] Unit BR04, BR05 (invariant), BR07 pass (Must); BR08, BR10 pass (Should)
- [ ] `runs.md` ≥ 25 lượt chạy do người khác tác giả
- [ ] 0 S1 mở; S2 có người và hạn
- [ ] Mỗi người ≥ 2 PR merge và ≥ 2 review

## 8. Nếu không đạt

| Tình huống | Xử lý |
|---|---|
| UC07 phức tạp | OTC trước (Must); thanh toán cho lần cấp làm đầu tuần 7 |
| BR08 / BR10 chưa kịp | Should → dùng dự phòng tuần 8; không chặn v0.2 |
| Không đủ giờ chạy test chéo | Ưu tiên TC của BR Must (01–05, 07) và OTC |
