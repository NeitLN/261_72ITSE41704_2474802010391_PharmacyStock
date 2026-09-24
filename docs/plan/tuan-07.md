# Tuần 7 — Iteration 2: v0.2 (T2 26/10 – CN 01/11/2026)

> Mốc môn học: **tag `v0.2`** + **tự đánh giá Appendix D** — checkpoint, không chấm riêng.
> Milestone: *Week 07 — Iteration 2 — v0.2*. Module tự học: 9.
> Rubric: đối chiếu cả 5 tiêu chí Final qua Appendix D.

## 1. Mục tiêu

1. **14 UC Must chạy end-to-end**: thêm UC08 trả hàng, UC11 cảnh báo hạn dùng/hủy lô, UC12 báo cáo luân chuyển, UC14 khách hàng/bác sĩ.
2. Should nếu kịp: UC13 lịch sử giá (BR09), UC15 quản trị người dùng.
3. **Hồi quy bộ R** (bắt đầu T5 29/10) và **TC-31 luồng đầu–cuối lần đầu**.
4. **B tag `v0.2` T7 31/10** (người ký dự phòng: A). **Appendix D** trong `docs/` (B ghi).

## 2. Điều kiện bắt đầu

- [ ] UC07 có SaleLine (tuần 6); invariant BR05 có test
- [ ] **Cổng thiết kế T2 26/10**: sequence UC08 (B), UC11 + UC12 (C), UC13 (A) merge trước PR tính năng
- [ ] Không còn S1 mở

## 3. Việc theo thành viên

| Mã | Việc | Giờ | Reviewer | Phụ thuộc | Đầu ra / nghiệm thu | Issue |
|---|---|---|---|---|---|---|
| W07-A1 | **UC13 Lịch sử giá** *(S)* — `PriceBook`: giá theo ngày hiệu lực (BR09); UC07 lấy giá tại ngày thanh toán | 5 | B | W06-B2 | TC-40, 41 Pass do B chạy | #55 |
| W07-A2 | **Hồi quy phần của B và C** trong bộ R + **TC-31 luồng đầu–cuối** (nhập → nhận đơn → cấp → thanh toán → trả → báo cáo khớp) | 2,5 | B | B1, C2 | Lượt chạy trong `runs.md` | #56 (nội dung đổi) |
| W07-A3 | **Seed giao dịch cho báo cáo**: bán và trả trải hai kỳ (dùng ngày nghiệp vụ lùi); cập nhật seed theo schema mới | 2 | C | B1 | TC-23 có dữ liệu tính tay | #57 (nội dung đổi) |
| — | A: họp 2,5 · review 3 · giữ schema/seed 1 · sửa lỗi/dự phòng 4 | 10,5 | — | — | — | — |
| W07-B1 | **UC08 Trả hàng** theo QĐ 4/13/14: `SaleReturn` + `ReturnLine`; không trả vượt số đã bán (TC-17); `requestId` chống gửi lặp (TC-18); **bút toán bù** qua `StockLedger` (`reversesMovementId`); thuốc kiểm soát / lô hết hạn không về tồn bán (TC-50). **Lên `main` trước T4 28/10** (UC12 phụ thuộc) | 7 | C + A | W06-B2 | TC-16, 17, 18, 50 Pass do C chạy; invariant vẫn pass | #58 |
| W07-B2 | **UC14 Khách hàng và bác sĩ** (Must): màn hình quản lý + **tạo nhanh ngay trong UC05**; số giấy phép không trùng | 3 | C | W05-B1 | TC mới cho UC14 Pass do C chạy | #59 |
| W07-B3 | **Appendix D** (cả nhóm chấm ở họp T7; B ghi) + **ký và tag `v0.2`** | 1,5 | A | W07-C3 | `docs/appendix-d-self-check.md`; tag + release note | #60 (nội dung đổi) |
| — | B: hồi quy phần của A trong bộ R 2 · họp 2,5 · review 1,5 · sửa lỗi 2,5 | 8,5 | — | — | — | — |
| W07-C1 | **UC11 Cảnh báo hạn dùng và hủy lô**: `ExpiryReport`; ai đặt trạng thái EXPIRED và khi nào (QĐ 1); hủy → movement WRITE_OFF; xác nhận đã xem | 5 | A | cổng thiết kế | TC-22 Pass do B chạy | #61 |
| W07-C2 | **UC12 Báo cáo luân chuyển** theo QĐ 6 qua `ReportGenerator` (đa hình cùng báo cáo tồn thấp/hạn dùng): làm phần xuất trước, cộng trả hàng sau khi B1 lên `main` | 5 | A | W07-B1 (T4), W07-A3 | TC-23 Pass: số liệu khớp bảng tính tay (lưu cả hai) | #62 |
| W07-C3 | **UC15 Quản trị người dùng/vai trò** *(S)* theo ma trận của C; khóa tài khoản (TC-44) | 3 | A | W05-C1 | TC-44 Pass do A chạy | #63 (nội dung đổi) |
| — | C: tổng hợp kết quả hồi quy + ký nghiệm thu (dự phòng A) 1,5 · họp 2,5 · review 1,5 · sửa lỗi 1,5 | 7 | — | — | — | — |

*So với Issue*: UC15 trả lại C (C thiết kế RBAC; cân đóng góp); A nhận hồi quy + seed giao dịch; B ghi Appendix D và tag v0.2.

## 4. Phân bổ giờ

| Người | Code | Test | Review | Sửa lỗi/Dự phòng | Tài liệu | Họp | **Tổng** |
|---|---|---|---|---|---|---|---|
| A | 8 | 2,5 | 3 | 4 | — | 2,5 | **20** |
| B | 10 | 2 | 1,5 | 2,5 | 1,5 | 2,5 | **20** |
| C | 13 | 1,5 | 1,5 | 1,5 | — | 2,5 | **20** |

## 5. Lịch

| Ngày | Việc |
|---|---|
| T2 26/10 | Cổng thiết kế; Must trước (B1, C1, C2, B2); A1, C3 là Should |
| **T4 28/10** | **UC08 trên `main`**. **Điểm cắt phạm vi**: Must nào < 50% → dừng Should, dồn người (ngồi cặp) |
| **T5 29/10** | Bắt đầu hồi quy bộ R (A: phần B, C; B: phần A) |
| T6 30/10 | Sửa S1/S2; chạy lại |
| **T7 31/10** | Họp: demo 14 UC; chấm Appendix D; C ký → **B tag `v0.2`** |
| CN 01/11 | Dự phòng |

## 6. Vòng chất lượng tuần này

- **Trả hàng** (rủi ro nhất tuần): C review, A người thứ hai; kiểm hóa đơn gốc không đổi, movement bù đúng dấu và chỉ đảo một lần.
- **Báo cáo**: tính tay trên bảng tính với dữ liệu seed; lưu cả bảng tính và kết quả báo cáo làm minh chứng.
- **Appendix D trung thực**: tiêu chí nào dưới 7 có hành động, người, tuần. Trạng thái các Issue `proposal-feedback` cũng được xem lại tại đây.

## 7. Bàn giao và minh chứng

- Tag `v0.2` + release note (Should nào hoãn và vì sao; lỗi S3/S4 còn mở).
- `docs/appendix-d-self-check.md`; `runs.md` có lượt hồi quy tuần 7 và TC-31.
- Ảnh các UC mới với dữ liệu seed.

## 8. Nghiệm thu cuối tuần

- [ ] 14/14 UC Must: mỗi UC có ≥ 1 TC Pass trong `runs.md` tuần này do người khác tác giả chạy
- [ ] Unit BR01–05, BR07 pass trong CI; TC-31 Pass
- [ ] Appendix D có trong repo
- [ ] Tag `v0.2`; 0 S1/S2 mở
- [ ] Mỗi người ≥ 2 PR merge và ≥ 2 review

## 9. Nếu không đạt

| Tình huống | Xử lý |
|---|---|
| Must chưa đủ tại T4 28/10 | Dừng A1, C3 (Should); A ngồi cặp cho UC12, C ngồi cặp cho UC08 |
| UC12 lệch số với tính tay | Là S2 → **không tag** cho đến khi khớp; tag muộn nhất T3 03/11 |
| Không kịp tag T7 | Tag muộn nhất T3 03/11; tuần 8 bắt đầu bằng phục hồi; ghi journal |
