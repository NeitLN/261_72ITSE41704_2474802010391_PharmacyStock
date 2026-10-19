# Tuần 5 — Iteration 1: v0.1 (T2 12/10 – CN 18/10/2026)

> Mốc môn học: **tag `v0.1`** — không chấm riêng; là thuốc giải cho kiểu thất bại "silent middle".
> Milestone: *Week 05 — Iteration 1 — v0.1*. Module tự học: 6.
> Rubric: *Implementation & Testing* (CLO4), *Collaborative Development* (CLO2).

> **Reviewer** theo vòng mới từ 12/10 (A do C duyệt, B do A, C do B; `00-tong-quan.md` §6.2).

## Kết quả tuần (chốt 20/10/2026)

Đạt 4/5 tiêu chí nghiệm thu (§8); **thiếu tag `v0.1`**. Chi tiết, số liệu và leader review: [`../progress/week-05.md`](../progress/week-05.md).

## Cập nhật 12/10/2026

- **A**: W05-A1 UC01 → PR #97 · W05-A2 UC03 → PR #99 · W05-A3 seed → PR #100 (thêm 12 bệnh nhân và 7 bác sĩ để UC05 của B chọn được ngay). Chờ C review và người khác tác giả chạy TC-01, 03, 45, 46, 49.
- **Điều kiện bắt đầu** của B và C đã có trong PR #94–#96 (chưa merge): migration, lát cắt mẫu, `Actor`, `StockLedger`. Chưa có: CI (W04-C2). Bảng 63 TC đã chép từ Appendix C ở #102; C bổ sung bước, dữ liệu và bộ hồi quy R (W04-C3).
- **Đăng nhập**: tạm dùng `DevAuthGuard` (chọn user mẫu ở thanh trên). W05-C1/C2 thay bằng JWT, chỉ cần sinh ra cùng `Actor`; service không đổi.
- **Buổi ngồi cặp T2 12/10** chưa diễn ra; dời sang ngày gần nhất cả ba có mặt, nội dung: `how-to-add-a-module.md` + `stock-ledger.md`.
- v0.1 vẫn cần UC05/UC06 (B) và đăng nhập (C). Nếu T5 15/10 chưa có PR của B hoặc C: áp dụng phương án khi trễ ở cuối file và ghi journal.

## 1. Mục tiêu

**v0.1 = API + giao diện tối thiểu cho một luồng thật**, dữ liệu còn sau restart:
đăng nhập (UI) → danh mục thuốc có giá hiện hành → nhập hàng tạo lô qua `StockLedger` → nhận đơn → **cấp phát FEFO** → tồn và sổ biến động đúng.
Unit test BR01–03 và e2e đồng thời cơ bản xanh trong CI. **C tag `v0.1` T7 17/10** (người ký dự phòng: B). CN 18/10 dự phòng.

## 2. Điều kiện bắt đầu

- [x] Migration, lát cắt mẫu UC02, `CurrentUser`, `StockLedger`, `FefoAllocator`, CI trên `main` (tuần 4) — có trên `main` muộn: #94–#96 ngày 12/10, `FefoAllocator` #109 ngày 13/10, CI #115 ngày 15/10
- [x] 63 TC có expected; `runs.md` sẵn sàng (12/10)
- [ ] **T2 12/10: buổi ngồi cặp 1 giờ** A với B và C (đi qua lát cắt mẫu + `StockLedger` + mẫu phân quyền) — không có ghi chép là đã diễn ra

## 3. Việc theo thành viên

| Mã | Việc | Giờ | Reviewer | Phụ thuộc | Đầu ra / nghiệm thu | Issue |
|---|---|---|---|---|---|---|
| W05-A1 | **UC01 Danh mục thuốc**: CRUD + **đặt giá bán hiện hành** (ghi `MedicinePrice` không có ngày kết thúc); nhóm thuốc và đơn vị là **dữ liệu seed** | 4 | C | W04-A3 | Thêm/sửa/ngừng; mã trùng báo lỗi đúng trường (TC-45) | #37 |
| W05-A2 | **UC03 Nhập hàng** qua `StockLedger`: nhiều dòng, tạo/cộng lô theo QĐ 17; hạn phải sau ngày nhập (TC-64; trước 20/10 ghi nhầm là TC-49, #129); chặn trùng chứng từ (TC-03); e2e rollback khi lỗi giữa chừng | 5 | C + B | A1, W04-B3 | TC-01 Pass do C chạy; e2e rollback pass | #38 |
| W05-A3 | **Seed thực tế — xong T4 14/10**: ~15 nhóm, ~60 thuốc có giá, ~10 NCC, ~120 lô với **ngày tương đối so với ngày seed** (đã hết hạn, sắp hết, còn dài), 3 tài khoản vai trò | 3 | B | W05-A1 | `npm run seed` chạy lặp lại được trên DB trống | #39 |
| — | A: giữ schema/seed 1 · khung chương báo cáo (chương → người viết) 0,5 · ngồi cặp 1 · họp 2,5 · review 2 (người thứ hai `stock-integrity`) · sửa lỗi 1 | 8 | — | — | `docs/report/outline.md` | — |
| W05-B1 | **UC05 Nhận đơn — bản tối thiểu**: chọn khách hàng/bác sĩ **có sẵn** (tạo nhanh để UC14 tuần 7), nhiều dòng thuốc, validation | 4 | A | W04-A3 | Tạo đơn nhiều thuốc trên UI (TC-47 do A chạy) | #40 |
| W05-B2 | **UC06 Cấp phát**: `DispensingService` → `FefoAllocator` → `StockLedger` trong một transaction; `requestId` chống gửi lặp; `DispenseLine` theo từng lô; UI tối thiểu hiện lô được chọn | 6 | A + C | B1, W04-B2/B3 | Cấp 7 từ lô A=3, B=8 → **A=0, B=4, hai dòng DispenseLine, hai movement −3 và −4** (TC-04 do A chạy) | #41 |
| W05-B3 | **Test**: unit BR01–03 theo QĐ đã chốt; e2e cấp thành công + thiếu tồn; **e2e song song cơ bản**: hai kết nối cùng xin lượng cuối → đúng một thành công, còn lại lỗi nghiệp vụ (không phải 500), invariant giữ | 3 | A | B2, W04-C2 | Tất cả pass trong CI | #42 |
| — | B: ngồi cặp 1 · họp 2,5 · review 1,5 · sửa lỗi 2 | 7 | — | — | — | — |
| W05-C1 | **Xác thực backend**: JWT + `bcryptjs`; guard thật thay guard tạm; `assertPermission` dùng ma trận; seed vai trò + permission; README mục *Sample accounts* | 4 | B | W04-C1 | Cashier gọi API cấp phát → 403; sai mật khẩu → 401 | #43 |
| W05-C2 | **Xác thực giao diện**: trang đăng nhập, AuthContext, interceptor axios gắn token, 401 → về trang đăng nhập, menu lọc theo vai trò | 4 | B | C1 | TC-43 Pass do A chạy; trang của A, B vẫn hoạt động sau khi bật guard | #44 |
| W05-C3 | **Kiểm thử tích hợp** (C là người chạy): T5 UC01/UC03 (TC-01, 03, 45, 64), T6 UC05/UC06 (TC-04 cùng A, 06, 09); ghi `runs.md`; lập bug; **ký nghiệm thu + tag `v0.1`** | 4 | A | A2, B2, C2 | Lượt chạy thật trong `runs.md`; 0 S1/S2 mở | #45 |
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
- `runs.md`: TC-01, 03, 04, 06, 09, 43, 45, 47, 64 có lượt chạy, **kể cả lần Fail rồi Pass**.
- Ảnh luồng v0.1 với dữ liệu seed.

## 8. Nghiệm thu cuối tuần

- [x] Trên UI: đăng nhập → nhập hàng → nhận đơn → cấp FEFO; restart backend → số lượng trên đúng như §3 W05-B2 — TC-42/43 (lượt 7–8), TC-01 có restart (lượt 2), TC-04 A=0, B=4 (lượt 9, #124)
- [x] CI xanh gồm e2e song song; 0 S1/S2 mở — CI #115 xanh trên `main`; lỗi mở duy nhất #125 là S3
- [x] ≥ 8 TC có lượt Pass do người khác tác giả chạy — 11: TC-01, 03, 42, 43, 45, 46 trên `main`; TC-04, 06, 09, 47, 58 trong #124. TC-02 Fail → #125
- [ ] Tag `v0.1` tồn tại — **chưa**, trễ hạn 17/10; #45 (Minh), sau khi merge #124
- [x] Mỗi người ≥ 2 PR có nội dung merge và ≥ 2 review — Tiến 11 PR · 6 review; Duy Anh 8 · 6; Minh 6 · 12 (`docs/progress/week-05.md`)

## 9. Nếu không đạt

| Tình huống | Xử lý |
|---|---|
| UC06 chưa xong T6 | Reviewer (C) + A **ngồi cặp** với B — không nhận thay; UI UC06 tối thiểu (form + bảng kết quả) |
| UI đăng nhập chưa xong | Tag với guard bật và đăng nhập qua API; UI đăng nhập làm đầu tuần 6 |
| Còn S1 mở T7 | **Không tag**; sửa CN; tag muộn nhất T3 20/10; tuần 6 bắt đầu bằng phục hồi; ghi journal |
| Seed chưa đủ | Tag với seed tối thiểu (~20 bản ghi); đủ 50–200 trước v0.2 |
