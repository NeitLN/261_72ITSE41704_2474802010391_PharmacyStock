# Tuần 7 — Iteration 2: v0.2 (T2 26/10 – CN 01/11/2026)

> Mốc môn học: **tag `v0.2`** + **tự đánh giá Appendix D** — checkpoint, không chấm riêng.
> Milestone: *Week 07 — Iteration 2 — v0.2*. Module tự học: 9.
> Rubric: đối chiếu cả 5 tiêu chí Final qua Appendix D.

> **Reviewer**: mặc định theo vòng từ 12/10 (A do C duyệt, B do A, C do B); từ 23/10 bất kỳ thành viên nào khác tác giả cũng được duyệt, miễn là chạy nhánh và ghi đã kiểm gì (`00-tong-quan.md` §6.2).

## 1. Mục tiêu

1. **13 UC Must chạy end-to-end** (Proposal v1.1): thêm UC08 trả hàng vào cách ly, UC11 cảnh báo hạn dùng/trạng thái lô/hủy lô, UC12 báo cáo luân chuyển kho.
2. **Cổng Must-core** (Proposal §2.4): chỉ khi đạt mới mở Should (UC13, màn hình UC14, UC15, FR-46/47) ở tuần 8.
3. **Hồi quy bộ R** (bắt đầu T5 29/10) và **TC-31 luồng đầu–cuối lần đầu**.
4. **B tag `v0.2` T7 31/10** (người ký dự phòng: A). **Appendix D** trong `docs/` (B ghi).

## 2. Điều kiện bắt đầu

- [ ] UC07 có SaleLine (tuần 6); invariant BR05 có test
- [ ] **Cổng thiết kế theo từng tính năng, merge trước khi bắt đầu code** (không chỉ trước PR tính năng) — hạn T2 26/10. Mỗi tính năng (UC08 của B; UC11, UC12 của C; lệnh trạng thái lô/cách ly trong ledger của A) có đủ: đặc tả đã review (luồng chính, lỗi, quyền, tác động tới kho), hợp đồng API/lệnh và sequence (người code tính năng làm), và wireframe các trạng thái chính. **Thiết kế UI (wireframe, `ui-design.md`) do Tiến làm; Duy Anh review, góp ý chỉnh sửa và phát triển thêm (chuyển động, hiệu ứng tương tác, độ trau chuốt giao diện); Minh hỗ trợ khi cần** (quyết định của trưởng nhóm 22/10). Checklist: [`ui-design.md` §7](../design/ui-design.md#7-feature-design-gate). Đặc tả UC11, UC12 nằm trong #145 (C), cần merge trước
- [ ] Không còn S1 mở

## 3. Việc theo thành viên

| Mã | Việc | Giờ | Reviewer | Phụ thuộc | Đầu ra / nghiệm thu | Issue |
|---|---|---|---|---|---|---|
| W07-A1 | **Trạng thái lô và cách ly trong `StockLedger`** (BR11, DEC-04, DEC-07): đổi trạng thái lô có lý do (FR-48 của C dùng), lệnh RETURN/RELEASE/REJECT/WRITE_OFF/DESTROY qua ledger, invariant cho từng loại | 5 | C | W04-B3 (ledger) | e2e mọi loại movement pass; TC-60 có dữ liệu | #55 (nội dung đổi: UC13 sang tuần 8 nếu qua cổng) |
| W07-A2 | **Hồi quy phần của B và C** trong bộ R + **TC-31 luồng đầu–cuối** (nhập → nhận đơn → cấp → thanh toán → trả → báo cáo khớp) | 2,5 | C | B1, C2 | Lượt chạy trong `runs.md` | #56 (nội dung đổi) |
| W07-A3 | **Seed giao dịch cho báo cáo**: bán và trả trải hai kỳ (dùng ngày nghiệp vụ lùi); cập nhật seed theo schema mới | 2 | B | B1 | TC-23 có dữ liệu tính tay | #57 (nội dung đổi) |
| — | A: họp 2,5 · review 3 · giữ schema/seed 1 · sửa lỗi/dự phòng 4 | 10,5 | — | — | — | — |
| W07-B1 | **UC08 Trả hàng** theo QĐ 4/13/14: `SaleReturn` + `ReturnLine`; không trả vượt số đã bán (TC-17); `requestId` chống gửi lặp (TC-18); movement **RETURN vào cách ly** của đúng lô đã bán qua `StockLedger` (DEC-04, BR11) — trả hàng **không** phải bút toán đảo (`reversesMovementId` chỉ dùng để sửa sai một movement); thuốc kiểm soát / lô hết hạn không về tồn bán (TC-50). **Lên `main` trước T4 28/10** (UC12 phụ thuộc) | 7 | A + C | W06-B2 | TC-16, 17, 18, 50 Pass do C chạy; invariant vẫn pass | #58 |
| W07-B2 | **Hủy trước bàn giao** (FR-45, DEC-05) cho cấp phát và giỏ bán + **TC-62** bán OTC và cấp phát tranh lượng cuối (20 lần) | 3 | A | W06-B2 | TC-59, TC-62 Pass do C chạy | #59 (nội dung đổi: màn hình UC14 là Should, sang tuần 8; tạo nhanh nằm trong UC05) |
| W07-B3 | **Appendix D** (cả nhóm chấm ở họp T7; B ghi) + **ký và tag `v0.2`** | 1,5 | C | W07-C3 | `docs/appendix-d-self-check.md`; tag + release note | #60 (nội dung đổi) |
| — | B: hồi quy phần của A trong bộ R 2 · họp 2,5 · review 1,5 · sửa lỗi 2,5 | 8,5 | — | — | — | — |
| W07-C1 | **UC11 Cảnh báo hạn dùng và hủy lô**: `ExpiryReport`; hết hạn **được tính theo ngày nghiệp vụ** (DEC-01), không phải trạng thái lô; đổi trạng thái lô ON_HOLD/RECALLED/REJECTED có lý do (FR-48); ghi hủy → movement WRITE_OFF sang *chờ tiêu hủy* (chưa phải đã hủy); xác nhận đã xem. Đánh giá hàng trả và ghi tiêu hủy (FR-46/47) là Should, tuần 8 | 5 | B | cổng thiết kế | TC-22 Pass do B chạy | #61 |
| W07-C2 | **UC12 Báo cáo luân chuyển** theo QĐ 6 qua `ReportGenerator` (đa hình cùng báo cáo tồn thấp/hạn dùng): làm phần xuất trước, cộng trả hàng sau khi B1 lên `main` | 5 | B | W07-B1 (T4), W07-A3 | TC-23 Pass: số liệu khớp bảng tính tay (lưu cả hai) | #62 |
| W07-C3 | **Kiểm tra cổng Must-core**: 13 UC Must chạy trên `main`, mọi TC của quy tắc Must pass, CI xanh, invariant + TC-26/54/62 pass; ghi kết quả vào journal | 3 | B | A1, B1, C1, C2 | Kết quả cổng (đạt/không, lý do) trong `docs/journal.md` | #63 (nội dung đổi: UC15 sang tuần 8 nếu qua cổng) |
| — | C: tổng hợp kết quả hồi quy + ký nghiệm thu (dự phòng A) 1,5 · họp 2,5 · review 1,5 · sửa lỗi 1,5 | 7 | — | — | — | — |

*So với Issue*: UC15 trả lại C (C thiết kế RBAC; cân đóng góp); A nhận hồi quy + seed giao dịch; B ghi Appendix D và tag v0.2.

## 4. Phân bổ giờ

| Người | Code | Test | Review | Sửa lỗi/Dự phòng | Tài liệu | Họp | **Tổng** |
|---|---|---|---|---|---|---|---|
| A | 7 + thiết kế 4 | 2,5 | 3 | 1 | — | 2,5 | **20** |
| B | 10 + hợp đồng 0,5 | 2 | 1,5 + review UI 1 | 1 | 1,5 | 2,5 | **20** |
| C | 12 + hợp đồng 0,5 | 1,5 | 1,5 | 2 (gồm hỗ trợ UI) | — | 2,5 | **20** |

*Thiết kế* (thêm 22/10): Tiến làm thiết kế UI cho mọi màn — wireframe các trạng thái chính của UC08, UC11, UC12 trước T2 26/10 (#154, 3 giờ) và bộ UI dùng chung `src/frontend/src/ui/` (token theme, `StatusTag`, định dạng số lượng và tiền) trước T3 27/10 để màn UC08, UC11, UC12 dùng ngay (#155, 1 giờ); ở tuần 8 là wireframe *as-built* 7 màn đã có, rà UX và phần thiết kế giao diện trong báo cáo (lộ trình UI/UX: `ui-design.md` §8) — cùng cổng thiết kế của A1. Duy Anh review các PR thiết kế UI (ngoại lệ của vòng review: thiết kế UI của Tiến do Duy Anh duyệt) và phát triển thêm: quy ước chuyển động và hiệu ứng tương tác (`ui-design.md` §5.1) ở tuần 7, áp dụng vào các màn ở tuần 8 khi làm vững; Minh hỗ trợ khi cần. *Hợp đồng* là phần API/lệnh và sequence của tính năng do chính người code tính năng viết. Phần chung (sơ đồ class, ERD, data dictionary, `ui-design.md`, bộ wireframe) đã làm trong tuần 6 (#151).

## 5. Lịch

| Ngày | Việc |
|---|---|
| T2 26/10 | Cổng thiết kế đã merge thì mới code; thứ tự: A1 (UC08 và UC11 cần lệnh của ledger), B1, C1, C2, B2. **A1 và C3 là Must** (C3 là kiểm tra cổng Must-core) |
| **T4 28/10** | **UC08 trên `main`**. **Điểm cắt phạm vi**: Must nào < 50% → dừng Should, dồn người (ngồi cặp) |
| **T5 29/10** | Bắt đầu hồi quy bộ R (A: phần B, C; B: phần A) |
| T6 30/10 | Sửa S1/S2; chạy lại |
| **T7 31/10** | Họp: demo 13 UC Must; chấm Appendix D; C ký → **B tag `v0.2`** |
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

- [ ] 13/13 UC Must: mỗi UC có ≥ 1 TC Pass trong `runs.md` tuần này do người khác tác giả chạy
- [ ] Unit BR01–05, BR07 pass trong CI; TC-31 Pass
- [ ] Appendix D có trong repo
- [ ] Tag `v0.2`; 0 S1/S2 mở
- [ ] Mỗi người ≥ 2 PR merge và ≥ 2 review

## 9. Nếu không đạt

| Tình huống | Xử lý |
|---|---|
| Must chưa đủ tại T4 28/10 | Dừng mọi việc Should (UC13, màn hình UC14, UC15, FR-46/47) và phần hồi quy mở rộng; A ngồi cặp cho UC12, C ngồi cặp cho UC08. A1 và C3 không dừng |
| UC12 lệch số với tính tay | Là S2 → **không tag** cho đến khi khớp; tag muộn nhất T3 03/11 |
| Không kịp tag T7 | Tag muộn nhất T3 03/11; tuần 8 bắt đầu bằng phục hồi; ghi journal |
