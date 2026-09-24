# Tuần 2 — Yêu cầu (T2 21/09 – CN 27/09/2026)

> Mốc môn học: Proposal nháp (không bắt buộc). Milestone: *Week 02 — Requirements*. Module tự học: 1, 2.
> **Tuần đang diễn ra.** Kế hoạch lập ngày T5 24/09; phần việc của B, C dồn vào T5–CN.
> **Hạn chốt thành phần nhóm: hết tuần 2** (Guidelines §3).
> Rubric: Proposal — *Problem Definition & Requirement Analysis* (5/10 điểm Proposal).

## 1. Mục tiêu

1. B và C chạy được hệ thống và có **PR đầu tiên merge dưới tài khoản riêng**.
2. **Chốt 9 quyết định lõi (QĐ 1–9)** tại buổi họp **T7 26/09**; nêu 9 câu hỏi mô hình (QĐ 10–18) để chốt trước T4 07/10.
3. **FR đánh số + đặc tả gọn cho 14 UC Must**, tiếng Anh, theo mẫu của A. Hạn đủ dùng cho Proposal: **T3 29/09 12:00**.
4. **Nguồn thật cho vấn đề**: phỏng vấn ngắn có ghi chép hoặc ≥ 2 tài liệu (Titles §2).

## 2. Điều kiện bắt đầu

- [x] Repo chạy được; 25 entity; danh sách UC/BR (A)
- [x] B, C là collaborator, đã được gán Issue
- [ ] `.env.example` khớp `docker-compose.yml` (W02-A0 — **trước** buổi cài đặt)

## 3. Việc theo thành viên

| Mã | Việc | Giờ | Reviewer | Phụ thuộc | Đầu ra / nghiệm thu | Issue |
|---|---|---|---|---|---|---|
| W02-A1 | Domain model 25 entity, tổng hợp quy định | 7 | B | — | ✅ `1011c2f` | #10 ✅ |
| W02-A2 | Chạy backend với PostgreSQL, sửa lỗi khởi động | 4 | B | A1 | ✅ `acaa60b` | #11 ✅ |
| W02-A0 | Sửa `src/backend/.env.example` cho khớp docker-compose (cổng 5433, user/mật khẩu dev); **buổi cài đặt 1 giờ T6 25/09** với B, C | 1,5 | C | — | B, C chạy được backend + frontend + DB trên máy mình | mới |
| W02-A3 | **Đặc tả mẫu UC03 + mẫu FR** (công bố **T6 25/09** để B, C theo), rồi FR + đặc tả UC01–04. UC13 (Should) để tuần 4 | 4 | B | — | Mỗi FR có dạng "The system shall …" và **gắn ít nhất một TC**; mỗi UC có actor, tiền điều kiện, luồng chính và ≥ 1 luồng thay thế | #12 |
| — | A: chủ trì họp T7 26/09 (2 giờ) · review 1 · đồng bộ tài liệu repo với roadmap 0,5 | 3,5 | — | — | Biên bản họp trong `journal.md` | — |
| W02-B1 | Clone → `docker compose up` → backend + frontend. **PR đầu tiên**: mục giới thiệu vai trò của mình trong `journal.md` | 3 | C | W02-A0 | PR của `anh7032` merge vào `main` | #13 (+#4) |
| W02-B2 | **Phiếu phương án QĐ 1, 2, 3, 5, 7** (2–3 phương án, ưu/nhược). **Nguồn**: một cuộc phỏng vấn ngắn với nhân viên nhà thuốc (ghi chép có ngày) **hoặc** ≥ 2 tài liệu (vd. quy định GPP của Bộ Y tế) — trích đúng văn bản. Sau họp: ghi quyết định vào `docs/README.md` | 4 | C | W02-B1 | Commit của B ghi 5 QĐ; nguồn ghi ở #5/#6 rồi đóng | #14 (+#5, #6) |
| W02-B3 | FR + đặc tả **UC05–08, UC14**; viết rõ BR01–04, BR07, BR10 theo QĐ đã chốt, mỗi BR có ví dụ số | 6 | A | B2, họp 26/09 | Như W02-A3 | #15 |
| — | B: tự học Module 1–2 + `docs/course-requirements.md` 2,5 · họp 2,5 · review 1 · dự phòng 1 | 7 | — | — | — | — |
| W02-C1 | Như W02-B1 | 3 | A | W02-A0 | PR của `Jayson135724` merge | #16 (+#7) |
| W02-C2 | **Phiếu phương án QĐ 4, 6, 8, 9** + đề xuất lịch họp cố định; **nguồn** như W02-B2. Sau họp: ghi vào `docs/README.md` + `journal.md` | 4 | A | W02-C1 | Commit của C ghi 4 QĐ + lịch họp; đóng #8, #9 | #17 (+#8, #9) |
| W02-C3 | FR + đặc tả **UC09–12, UC16**; **NFR đo được** gồm cả ngưỡng khả dụng (dùng cho TC-32). UC15 (Should) để tuần 4 | 6 | B | C2, họp 26/09 | Mỗi NFR có con số + cách đo | #18 |
| — | C: tự học Module 1–2 + `docs/course-requirements.md` 2,5 · họp 2,5 · review 1 · dự phòng 1 | 7 | — | — | — | — |

## 4. Phân bổ giờ

| Người | Tự học | Phân tích/Thiết kế | Code/Cấu hình | Review | Tài liệu | Họp | Dự phòng | **Tổng** |
|---|---|---|---|---|---|---|---|---|
| A | — | 7 | 5,5 | 1 | 4,5 | 2 | — | **20** |
| B | 2,5 | 5 | 2 | 1 | 6 | 2,5 | 1 | **20** |
| C | 2,5 | 5 | 2 | 1 | 6 | 2,5 | 1 | **20** |

B và C làm khoảng 20 giờ trong 4 ngày — **nặng**. Phần đặc tả còn dở được phép tràn sang **T2–T3 28–29/09** (đã tính vào tuần 3).

## 5. Lịch và chương trình họp

| Ngày | Việc |
|---|---|
| T5 24/09 | A gửi B, C: link Issue và bảng dự án; hẹn buổi cài đặt; sửa `.env.example` |
| T6 25/09 | Buổi cài đặt 1 giờ; B, C mở PR đầu; **A công bố đặc tả mẫu UC03 + mẫu FR** |
| **T7 26/09** | **Họp 2 giờ**: (1) chốt QĐ 1–9; (2) nêu QĐ 10–18, giao người chuẩn bị, hạn 07/10; (3) chốt lịch họp cố định; (4) kiểm tra cổng đóng góp; (5) quyết định về R1 nếu cần |
| CN 27/09 | Viết đặc tả; mở PR nháp để người review xem sớm. **Hết hạn chốt thành phần nhóm** |
| T3 29/09 12:00 | **Hạn cứng**: FR + đặc tả 14 UC Must đủ cho Proposal |

## 6. Vòng chất lượng tuần này

- **Yêu cầu kiểm thử được**: reviewer đánh dấu FR nào không trả lời được "test thế nào?"; tác giả viết lại.
- **Tình huống**: mỗi đặc tả UC có ≥ 1 luồng cho dữ liệu sai và ≥ 1 cho vi phạm quy tắc.
- **Review**: theo ma trận (B review A, C review B, A review C); PR đầu tiên của B do C review và ngược lại, để hai người mới làm quen với review.
- **Lỗi môi trường** → Issue `bug` S3 + cách khắc phục ghi vào README.

## 7. Bàn giao và minh chứng

- PR đầu của B và C đã merge — **minh chứng CLO2 quan trọng nhất tuần**.
- `docs/README.md`: QĐ 1–9 có trạng thái; QĐ 10–18 có người chuẩn bị và hạn.
- `docs/requirements/`: FR + đặc tả 14 UC Must; ghi chép nguồn (phỏng vấn hoặc tài liệu).
- `journal.md`: biên bản 26/09, lịch họp cố định, kết quả `git shortlog`.

## 8. Nghiệm thu cuối tuần (CN 27/09)

- [ ] `git shortlog -sn` có đủ 3 người; B và C mỗi người ≥ 1 PR merge và ≥ 1 review
- [ ] 9/9 QĐ lõi có trạng thái *chốt* hoặc *tạm* (kèm ngày xem lại)
- [ ] ≥ 12/14 UC Must có đặc tả với luồng thay thế; 2 UC còn lại có người và hạn T3 29/09
- [ ] Mọi NFR có con số và cách đo, gồm ngưỡng khả dụng
- [ ] Có ≥ 1 nguồn thật cho mô tả vấn đề (ghi chép phỏng vấn hoặc 2 tài liệu)
- [ ] Issue #4–#9 đóng kèm comment kết quả hoặc ghi rõ đã gộp vào tuần 2

## 9. Nếu không đạt

| Tình huống | Xử lý |
|---|---|
| B hoặc C chưa chạy được repo đến T6 | A ngồi cặp gọi màn hình ngay; dự phòng dùng PostgreSQL cài máy |
| **B hoặc C không có PR và không phản hồi đến T7 26/09** | **Đề xuất (trưởng nhóm quyết)**: email GV **trước CN 27/09**, chỉ nêu sự kiện; ghi journal. Việc A làm thay ghi rõ trên Issue |
| Chưa chốt được QĐ lõi | Dùng phương án đề xuất tạm, xem lại T4 30/09 |
| Đặc tả chưa đủ T3 29/09 | Người phụ trách hoàn tất ngay T3–T4, **không chuyển cho A**; nếu UC không có đặc tả, Proposal liệt kê nó ở mức FR và nói rõ đặc tả chi tiết ở tuần 4 |
