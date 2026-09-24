# Tuần 5 — Iteration 1: v0.1 (T2 12/10 – CN 18/10/2026)

> Mốc môn học: **tag `v0.1`** — không chấm riêng; là thuốc giải cho kiểu thất bại "silent middle".
> Milestone: *Week 05 — Iteration 1 — v0.1*. Module tự học: 6.
> Rubric: *Implementation & Testing* (CLO4), *Collaborative Development* (CLO2).

## 1. Mục tiêu

**v0.1 = API + giao diện tối thiểu cho một luồng thật**, dữ liệu còn sau restart:
đăng nhập (UI) → danh mục thuốc có giá hiện hành → nhập hàng tạo lô qua `StockLedger` → nhận đơn → **cấp phát FEFO** → tồn và sổ biến động đúng.
Unit test BR01–03 và e2e đồng thời cơ bản xanh trong CI. **C tag `v0.1` T7 17/10** (người ký dự phòng: B). CN 18/10 dự phòng.

## 2. Điều kiện bắt đầu

- [ ] Migration, lát cắt mẫu UC02, `CurrentUser`, `StockLedger`, `FefoAllocator`, CI trên `main` (tuần 4)
- [ ] 55 TC có expected; `runs.md` sẵn sàng
- [ ] **T2 12/10: buổi ngồi cặp 1 giờ** A với B và C (đi qua lát cắt mẫu + `StockLedger` + mẫu phân quyền)

## 3. Việc theo thành viên

| Mã | Việc | Giờ | Reviewer | Phụ thuộc | Đầu ra / nghiệm thu | Issue |
|---|---|---|---|---|---|---|
| W05-A1 | **UC01 Danh mục thuốc**: CRUD + **đặt giá bán hiện hành** (ghi `MedicinePrice` không có ngày kết thúc); nhóm thuốc và đơn vị là **dữ liệu seed** | 4 | B | W04-A3 | Thêm/sửa/ngừng; mã trùng báo lỗi đúng trường (TC-45) | #37 |
| W05-A2 | **UC03 Nhập hàng** qua `StockLedger`: nhiều dòng, tạo/cộng lô theo QĐ 17; hạn phải sau ngày nhập (TC-49); chặn trùng chứng từ (TC-03); e2e rollback khi lỗi giữa chừng | 5 | B + C | A1, W04-B3 | TC-01 Pass do C chạy; e2e rollback pass | #38 |
| W05-A3 | **Seed thực tế — xong T4 14/10**: ~15 nhóm, ~60 thuốc có giá, ~10 NCC, ~120 lô với **ngày tương đối so với ngày seed** (đã hết hạn, sắp hết, còn dài), 3 tài khoản vai trò | 3 | C | W05-A1 | `npm run seed` chạy lặp lại được trên DB trống | #39 |
| — | A: giữ schema/seed 1 · khung chương báo cáo (chương → người viết) 0,5 · ngồi cặp 1 · họp 2,5 · review 2 (người thứ hai `stock-integrity`) · sửa lỗi 1 | 8 | — | — | `docs/report/outline.md` | — |
| W05-B1 | **UC05 Nhận đơn — bản tối thiểu**: chọn khách hàng/bác sĩ **có sẵn** (tạo nhanh để UC14 tuần 7), nhiều dòng thuốc, validation | 4 | C | W04-A3 | Tạo đơn nhiều thuốc trên UI (TC-47 do A chạy) | #40 |
| W05-B2 | **UC06 Cấp phát**: `DispensingService` → `FefoAllocator` → `StockLedger` trong một transaction; `requestId` chống gửi lặp; `DispenseLine` theo từng lô; UI tối thiểu hiện lô được chọn | 6 | C + A | B1, W04-B2/B3 | Cấp 7 từ lô A=3, B=8 → **A=0, B=4, hai dòng DispenseLine, hai movement −3 và −4** (TC-04 do A chạy) | #41 |
| W05-B3 | **Test**: unit BR01–03 theo QĐ đã chốt; e2e cấp thành công + thiếu tồn; **e2e song song cơ bản**: hai kết nối cùng xin lượng cuối → đúng một thành công, còn lại lỗi nghiệp vụ (không phải 500), invariant giữ | 3 | C | B2, W04-C2 | Tất cả pass trong CI | #42 |
| — | B: ngồi cặp 1 · họp 2,5 · review 1,5 · sửa lỗi 2 | 7 | — | — | — | — |
| W05-C1 | **Xác thực backend**: JWT + `bcryptjs`; guard thật thay guard tạm; `assertPermission` dùng ma trận; seed vai trò + permission; README mục *Sample accounts* | 4 | A | W04-C1 | Cashier gọi API cấp phát → 403; sai mật khẩu → 401 | #43 |
| W05-C2 | **Xác thực giao diện**: trang đăng nhập, AuthContext, interceptor axios gắn token, 401 → về trang đăng nhập, menu lọc theo vai trò | 4 | A | C1 | TC-43 Pass do A chạy; trang của A, B vẫn hoạt động sau khi bật guard | #44 |
| W05-C3 | **Kiểm thử tích hợp** (C là người chạy): T5 UC01/UC03 (TC-01, 03, 45, 49), T6 UC05/UC06 (TC-04 cùng A, 06, 09); ghi `runs.md`; lập bug; **ký nghiệm thu + tag `v0.1`** | 4 | B | A2, B2, C2 | Lượt chạy thật trong `runs.md`; 0 S1/S2 mở | #45 |
| — | C: ngồi cặp 1 · họp 2,5 · review 1,5 · sửa lỗi 3 | 8 | — | — | — | — |

## 4. Phân bổ giờ

| Người | Code | Test | Review | Sửa lỗi/Dự phòng | Tài liệu | Họp + ngồi cặp | **Tổng** |
|---|---|---|---|---|---|---|---|
| A | 10 | 1,5 | 2 | 1 | 2 | 3,5 | **20** |
| B | 9 | 4 | 1,5 | 2 | — | 3,5 | **20** |
| C | 8 | 4 | 1,5 | 3 | — | 3,5 | **20** |

## 5. Lịch và tích hợp

| Ngày | Việc |
|---|---|
| T2 12/10 | Ngồi cặp 1 giờ; mỗi người mở nhánh |
| T3 13/10 | C1 merge (backend auth) — A, B đã code theo `CurrentUser` từ T2 nên không bị chặn |
| **T4 14/10** | **Seed merge**; UC01 merge; đồng bộ + phân loại lỗi |
| T5 15/10 | UC03, UC05, UI đăng nhập merge; **C bắt đầu kiểm thử UC01/UC03** |
| T6 16/10 | UC06 merge; C kiểm thử UC05/UC06; hồi quy bộ R phần đã có |
| **T7 17/10** | Họp: demo luồng đầy đủ; sửa S1/S2; **C ký → tag `v0.1`**; retro: **hiệu chỉnh ước lượng giờ** cho tuần 6–10 |
| CN 18/10 | Dự phòng |

Mỗi người merge vào `main` **≥ 2 lần/tuần**; không giữ nhánh quá 3 ngày.

## 6. Vòng chất lượng tuần này

- Tiêu chí chấp nhận UC03/05/06 lấy từ đặc tả tuần 2; reviewer đối chiếu PR với luồng thay thế.
- Review: B review A (nhập hàng); C review B (cấp phát), **A là người thứ hai** (`stock-integrity`); A review C (xác thực — vượt quyền là S1).
- Lỗi → Issue `bug` + S1–S4; PR sửa `Refs #bug` + test tái hiện → `needs-retest` → người chạy test ban đầu chạy lại, ghi lượt mới trong `runs.md`, rồi đóng.
- Trước tag: CI xanh + bộ R phần đã có chức năng.

## 7. Bàn giao và minh chứng

- Tag `v0.1` + release note (UC đã chạy; hạn chế đã biết; lỗi S3/S4 còn mở).
- `runs.md`: TC-01, 03, 04, 06, 09, 43, 45, 47, 49 có lượt chạy, **kể cả lần Fail rồi Pass**.
- Ảnh luồng v0.1 với dữ liệu seed.

## 8. Nghiệm thu cuối tuần

- [ ] Trên UI: đăng nhập → nhập hàng → nhận đơn → cấp FEFO; restart backend → số lượng trên đúng như §3 W05-B2
- [ ] CI xanh gồm e2e song song; 0 S1/S2 mở
- [ ] ≥ 8 TC có lượt Pass do người khác tác giả chạy
- [ ] Tag `v0.1` tồn tại
- [ ] Mỗi người ≥ 2 PR có nội dung merge và ≥ 2 review

## 9. Nếu không đạt

| Tình huống | Xử lý |
|---|---|
| UC06 chưa xong T6 | Reviewer (C) + A **ngồi cặp** với B — không nhận thay; UI UC06 tối thiểu (form + bảng kết quả) |
| UI đăng nhập chưa xong | Tag với guard bật và đăng nhập qua API; UI đăng nhập làm đầu tuần 6 |
| Còn S1 mở T7 | **Không tag**; sửa CN; tag muộn nhất T3 20/10; tuần 6 bắt đầu bằng phục hồi; ghi journal |
| Seed chưa đủ | Tag với seed tối thiểu (~20 bản ghi); đủ 50–200 trước v0.2 |
