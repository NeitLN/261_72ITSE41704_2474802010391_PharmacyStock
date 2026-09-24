# Tuần 4 — Thiết kế và nền móng (T2 05/10 – CN 11/10/2026)

> Mốc môn học: thiết kế (UML, ERD, wireframe) có trong repo — không chấm riêng.
> Milestone: *Week 04 — Design*. Module tự học: 3, 4, 5.
> Rubric: *System Design & UI* (CLO3); nền cho *Implementation & Testing* (CLO4).

## 1. Mục tiêu

1. **Chốt QĐ 10–18** và **cổng thiết kế T4 07/10** — trước khi code nền móng merge.
2. **Nền móng dùng chung, mỗi người một phần**, để tuần 5 cả ba code song song:
   - A: migration + tooling (thay `DB_SYNCHRONIZE`), lát cắt mẫu UC02 kèm hợp đồng `CurrentUser`, mẫu phân quyền, helper form-error; bảo vệ `main`.
   - B: `FefoAllocator`, `ExpiryPolicy` (có `Clock`), **`StockLedger`** (sổ append-only, khóa, invariant).
   - C: mẫu phân quyền (chốt T3 06/10), **hạ tầng test + CI với PostgreSQL**, bảng test dạng nhật ký + TC-35…55.
3. B, C **học NestJS/TypeORM có cấu trúc** qua lát cắt mẫu.
4. Tiếp nhận phản hồi Proposal nếu có.

## 2. Điều kiện bắt đầu

- [ ] Proposal đã nộp
- [ ] QĐ 1, 2, 7 đã chốt (bắt buộc cho `FefoAllocator`)
- [ ] B, C chạy được repo; mọi người chạy `docker compose down -v` một lần để bỏ schema cũ tạo bằng synchronize

## 3. Việc theo thành viên

| Mã | Việc | Giờ | Reviewer | Phụ thuộc | Đầu ra / nghiệm thu | Issue |
|---|---|---|---|---|---|---|
| W04-A1 | **Phản hồi Proposal** → mỗi ý một Issue `proposal-feedback` (người, tuần). **Bảo vệ `main`**, mẫu PR, CODEOWNERS cho `stock-integrity`, tạo nhãn (00 §11) | 2 | B | Proposal | Branch protection bật; PR thử không có approve bị chặn | #28 |
| W04-A2 | **Migration tooling** (DataSource ESM, `migration:generate/run`, khung `seed`) + **migration đầu** theo QĐ 10–18: `CHECK` tồn ≥ 0, `reversesMovementId` unique, `sourceDocumentType`, `CHECK` dấu số lượng, `REVOKE UPDATE, DELETE` trên `stock_movements`, `requestId` unique cho cấp phát/trả | 5 | C | QĐ 10–18 (T4 07/10) | `npm run migration:run` trên DB trống tạo đúng schema; CI chạy được | #29 |
| W04-A3 | **Lát cắt mẫu UC02 Nhà cung cấp**: DTO + validation → service (có `actor` + `assertPermission` theo mẫu của C) → repository → controller → trang Ant Design (danh sách, thêm, sửa, ngừng) + **helper hiển thị lỗi theo trường** → unit + e2e. **Hợp đồng `CurrentUser`**: decorator + user seed + guard tạm theo biến môi trường. Kèm `docs/design/how-to-add-a-module.md` | 6 | B | A2, W04-C1 | UC02 chạy end-to-end; B và C dùng được `CurrentUser` từ T2 12/10 | #30 |
| — | A: sơ đồ class + ERD **sinh từ entity bằng công cụ** + data dictionary 1,5 · ngồi cặp với B (`StockLedger`) 1 và với C (CI) 1 · họp 2,5 · review 1 | 7 | — | — | Sơ đồ trong `docs/diagrams/` | mới |
| W04-B1 | **Sequence** (trước T4 07/10): cấp phát FEFO qua `StockLedger` (khóa lô theo id tăng dần, một transaction); trả hàng (bút toán bù); thanh toán cho một lần cấp (QĐ 5) | 2 | C | QĐ 2, 4, 5 | Ba sơ đồ, ghi rõ ranh giới transaction và thứ tự khóa | #31 |
| W04-B2 | **`FefoAllocator` + `ExpiryPolicy`** (nhận `Clock`/`asOfDate`, múi giờ QĐ 10) — **unit test viết trước**, tên `BR01-*`, `BR02-*`: nhiều lô, lô tồn 0, lô hết hạn, hòa hạn, thiếu tồn, đúng lượng cuối, qua nửa đêm UTC+7 | 5 | A | QĐ 1, 2, 7 | ≥ 10 test pass; bảng tình huống BR01/02/03 trong `docs/design/` khớp tên test | #32 |
| W04-B3 | **`StockLedger`**: `post(movement)` trong transaction, khóa lô `pessimistic_write` theo id tăng dần, cập nhật `quantityOnHand`, đảo movement đúng một lần; test `BR05-*` (invariant, không đảo hai lần) — **ngồi cặp với A** | 4 | A + C | A2, W04-C2 | Unit + 1 e2e trên DB test pass | #33 (nội dung đổi) |
| — | B: **học NestJS/TypeORM** (module, provider, repository, transaction, lock, guard) qua lát cắt mẫu 4 · wireframe giao dịch **dạng phác thảo** 1 · họp 2,5 · review 1,5 | 9 | — | — | Wireframe (nguồn + PNG) | — |
| W04-C1 | **Mẫu phân quyền** — chốt **T3 06/10**: ma trận 3 vai trò × permission; `actor` + `assertPermission()` trong service; JWT + `bcryptjs`; sequence đăng nhập | 3 | A | UC15/16 | `docs/design/access-control.md`; A dùng ngay trong lát cắt mẫu | #34 (nội dung đổi) |
| W04-C2 | **Hạ tầng test + CI**: DB test riêng, reset mỗi lần chạy, helper e2e cho Vitest ESM (thay spec "Hello World"); GitHub Actions: PostgreSQL service → migration trên DB trống → build + lint + unit + e2e — **ngồi cặp với A** | 5 | A | W04-A2 | PR đỏ bị chặn merge; e2e chạy trong CI | #35 (nội dung đổi) |
| W04-C3 | **Bảng test mới**: `test-cases.md` (định nghĩa: tác giả, người chạy, tuần khớp roadmap) + `runs.md` (nhật ký chạy ghi nối tiếp); **viết TC-35…55 có expected trước code**; định nghĩa **bộ hồi quy R**; TC-32 dùng ngưỡng khả dụng từ NFR | 4 | B | QĐ đã chốt | 55 TC, không TC nào thiếu expected; bộ R 15 TC | #36 (nội dung đổi) |
| — | C: **học NestJS/TypeORM** qua lát cắt mẫu 3 · wireframe quản lý + đăng nhập dạng phác thảo 1,5 · họp 2,5 · review 1 | 8 | — | — | Wireframe | — |

## 4. Phân bổ giờ

| Người | Tự học | Thiết kế | Code | Test | Review | Tài liệu | Họp | **Tổng** |
|---|---|---|---|---|---|---|---|---|
| A | — | 3,5 | 10 | 1 | 1 | 2 | 2,5 | **20** |
| B | 4 | 3 | 5 | 4 | 1,5 | — | 2,5 | **20** |
| C | 3 | 4,5 | 4 | 3 | 1 | 2 | 2,5 | **20** |

**B và C không có giờ dự phòng tuần này** — xem §9 nếu trễ.

## 5. Lịch và phụ thuộc

```
T2 05/10  A2 tooling · B2 FefoAllocator (không cần DB) · C1 mẫu phân quyền · A1 feedback + bảo vệ main
T3 06/10  C1 chốt mẫu phân quyền → A3 bắt đầu lát cắt mẫu
T4 07/10  ★ CỔNG THIẾT KẾ (1 giờ): QĐ 10–18 chốt; sequence B1; ma trận quyền; schema A2 duyệt → A2 merge
T4–T5     C2 hạ tầng test + CI (A ngồi cặp) · B3 StockLedger (A ngồi cặp, cần A2 + C2)
T5 08/10  A3 lát cắt mẫu merge → B, C học qua mẫu (T5–T7)
T7 10/10  Họp: đi qua 3 luồng trên sơ đồ + code nền móng; retro
```

## 6. Vòng chất lượng tuần này

- **Cổng thiết kế T4 07/10 — trước khi merge**: đi qua luồng nhập hàng, cấp phát, trả hàng trên sơ đồ; mỗi bước chỉ ra entity, service, quy tắc, khóa. Chỗ nào không trả lời được thì sửa sơ đồ hoặc schema **trước** khi merge A2.
- **Test viết trước**: A review test `BR01/02` theo bảng tình huống đã chốt.
- **Lát cắt mẫu và `StockLedger`** mang nhãn `stock-integrity` → review kỹ nhất tuần.
- Từ khi CI chạy: PR đỏ không merge.

## 7. Bàn giao và minh chứng

- `docs/diagrams/`: class + ERD (sinh từ code), 3 sequence, use case, wireframe.
- `docs/design/`: data dictionary, how-to-add-a-module, access-control, bảng tình huống BR.
- Code: migration, UC02, `CurrentUser`, `FefoAllocator`, `ExpiryPolicy`, `StockLedger`, exception filter + helper lỗi, CI.
- Issue `proposal-feedback`; `journal.md`: QĐ 10–18, biên bản cổng thiết kế, shortlog.

## 8. Nghiệm thu cuối tuần

- [ ] UC02: thêm NCC trên giao diện → khởi động lại backend → NCC còn; mã trùng báo lỗi đúng trường
- [ ] **B và C mỗi người merge ≥ 1 PR nền móng của mình** (B: `StockLedger`; C: CI) theo mẫu how-to
- [ ] CI chạy migration trên DB trống + unit + e2e; `main` được bảo vệ
- [ ] ≥ 10 test `BR01/02-*`, ≥ 3 test `BR05-*` pass
- [ ] QĐ 10–18 có trạng thái; 55 TC có expected
- [ ] Mỗi người ≥ 1 PR merge và ≥ 1 review

## 9. Nếu không đạt

| Tình huống | Xử lý |
|---|---|
| QĐ 10–18 chưa chốt 07/10 | Dùng đề xuất tạm; bổ sung migration ở tuần 5 (một migration/PR, sau rebase) |
| Lát cắt mẫu trễ quá T5 | A hoàn tất T6–T7; B, C học từ phần backend đã merge |
| `StockLedger` chưa xong | B + A ngồi cặp T7; **cổng tuần 5**: UC03/UC06 chỉ bắt đầu khi `StockLedger` đã có trên `main` |
| CI chưa xong | C + A ngồi cặp T7; tạm thời reviewer chạy `npm test` và dán kết quả vào PR — **không cắt CI** |
