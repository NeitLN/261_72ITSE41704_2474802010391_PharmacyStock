# Tuần 10 — Final Project Report, 80% (T2 16/11 – CN 22/11/2026)

> **Mốc chấm điểm: Final Project Report — PDF + DOCX + source (link repo) + run guide, nộp trên CTE.**
> Hạn chính thức: **giả định CN 22/11** — xác nhận trên CTE. Hạn nội bộ: **khóa nội dung T5 19/11**, **nộp T6 20/11**; T7–CN dự phòng.
> Milestone: *Week 10 — Final Report (80%)*. Module tự học: 10.
> Rubric: 5 tiêu chí × 2 điểm.

## 1. Mục tiêu

Nộp báo cáo tiếng Anh đúng template, phản ánh **đúng cái đã xây dựng** (phần chưa làm có lý do), kèm link repo đã tag và run guide. Đạt **checklist 12.2 (10 mục) và 12.3 (5 mục)**. File tải lại mở được. Cam kết và Appendix C có tên cả 3 người.

## 2. Điều kiện bắt đầu

- [ ] Tag `v1.0`; TC-33 Pass
- [ ] Báo cáo nháp đủ chương; ma trận truy vết; bảng góp ý Proposal

## 3. Việc theo thành viên

| Mã | Việc | Giờ | Reviewer | Phụ thuộc | Đầu ra / nghiệm thu | Issue |
|---|---|---|---|---|---|---|
| W10-A1 | **Biên tập để nhất quán** theo template: thứ tự chương, mục lục, danh sách hình/bảng, tham chiếu chéo, thuật ngữ. **Không viết lại phần của người khác**; góp ý nội dung gửi lại người viết | 4 | C | Nháp tuần 9 | Không mục template nào thiếu | #82 |
| W10-A2 | **Ch.4** (đã làm so với đề xuất, hạn chế gồm **mọi lỗi còn mở**, hướng phát triển; mỗi người tự viết đoạn "kỹ năng đạt được" của mình); **Appendix B do Tiến tự soạn** từ ghi chép dùng AI của cả 3 người | 3 | B | A1 | Hạn chế khớp release note | #83 |
| W10-A3 | Xuất PDF + DOCX, tên `2474802010391_VoVietTien_ApplicationProgrammingProject`; **nộp CTE T6 20/11** kèm link repo + run guide; tải lại, mở thử; lưu biên nhận (**TC-34**, C chạy) | 2 | C | mọi việc | Biên nhận; hai file mở được | #84 |
| — | A: họp 2 · review 2 · dự phòng 7 | 11 | — | — | — | — |
| W10-B1 | **Đối chiếu tài liệu ↔ code** theo ma trận truy vết; viết mục **"3.3.3 chức năng chưa triển khai và lý do"**; chỗ nào không khớp thì sửa văn bản (không sửa code sau freeze, trừ S1) | 4 | A | ma trận W09-B3 | Không FR nào mô tả sai so với code | #85 |
| W10-B2 | **Tài liệu tham khảo, thư viện, license** (mục đích + license của mọi thư viện chính); **nêu rõ phần code sinh tự động** (scaffold NestJS/Vite, công cụ) theo FAQ Guidelines | 3 | A | — | Danh sách đầy đủ; một kiểu trích dẫn | #86 |
| W10-B3 | **Appendix C** từ số liệu thật (`git shortlog`, PR, review, Issue đã đóng); cả nhóm xem; **thu chữ ký (tên gõ) của cả 3 người** cho Appendix C và cam kết | 2 | C | — | Phần trăm tổng 100%, có số commit và PR mỗi người | #87 |
| — | B: đoạn "kỹ năng đạt được" 0,5 · họp 2 · review 2 · sửa lỗi/dự phòng 6,5 | 11 | — | — | — | — |
| W10-C1 | Clone mới trên máy khác lần cuối + **chạy lại luồng chính trên đúng bản sẽ nộp** (tag `v1.0` hoặc tag sửa lỗi mới) | 3 | A | — | Lượt chạy trong `runs.md` | #88 |
| W10-C2 | **Kiểm tra file và link**: PDF/DOCX đúng phiên bản; mọi link (repo, tag, bảng dự án) mở được khi **chưa đăng nhập**; tên file đúng | 2 | A | A3 | Bảng kiểm tra | #89 |
| W10-C3 | **Checklist 12.2 + 12.3** tick từng mục; kiểm bảng góp ý Proposal đã có trong báo cáo | 3 | B | — | `docs/report/final-checklist.md` | #90 |
| — | C: đoạn "kỹ năng đạt được" 0,5 · họp 2 · review 2 · sửa lỗi/dự phòng 7,5 | 12 | — | — | — | — |

## 4. Phân bổ giờ

| Người | Test | Review | Dự phòng/Sửa lỗi | Báo cáo | Họp | **Tổng** |
|---|---|---|---|---|---|---|
| A | — | 2 | 7 | 9 | 2 | **20** |
| B | — | 2 | 6,5 | 9,5 | 2 | **20** |
| C | 3 | 2 | 7,5 | 5,5 | 2 | **20** |

## 5. Lịch

| Ngày | Việc |
|---|---|
| T2 16/11 | B1, B2, B3 bắt đầu; A biên tập; C chạy máy khác |
| T3 17/11 | Mọi góp ý nội dung gửi về người viết; mỗi người nộp đoạn "kỹ năng" và ghi chép AI cho Tiến |
| T4 18/11 | Bản gần cuối; C chạy checklist; B thu chữ ký |
| **T5 19/11** | **Khóa nội dung** |
| **T6 20/11** | **Nộp CTE**; tải lại; biên nhận |
| T7–CN 21–22/11 | Dự phòng (CTE lỗi: chụp màn hình, email GV kèm file, nộp lại khi hệ thống chạy) |

## 6. Vòng chất lượng tuần này

- Không thêm tính năng. Chỉ sửa **S1**; bản sửa sau `v1.0` được **tag mới** (vd. `v1.0.1`) và báo cáo ghi rõ bản nào được nộp — không dời tag cũ.
- Đọc chéo lần cuối: mỗi người đọc toàn văn một lần, chỉ ghi lỗi.
- Mọi con số trong báo cáo (số UC, test, commit, PR) lấy từ repo tại thời điểm nộp.

## 7. Bàn giao và minh chứng

- PDF + DOCX trên CTE; biên nhận trong `docs/report/`.
- Repo sạch, tag cuối, README + run guide; `final-checklist.md` tick đủ.

## 8. Nghiệm thu

- [ ] Checklist 12.2 (10/10) và 12.3 (5/5)
- [ ] Nộp trước hạn; file tải lại mở được; có biên nhận
- [ ] Commit của **cả 3 người trải ≥ 5 tuần** (đã được theo dõi hằng tuần từ tuần 2, không phải phát hiện lúc này)
- [ ] Ba tag `v0.1`, `v0.2`, `v1.0`
- [ ] Cam kết và Appendix C có tên cả 3 người

## 9. Nếu không đạt

| Tình huống | Xử lý |
|---|---|
| T5 19/11 chưa khóa được | Dùng T7 21/11; không nộp muộn hơn T7 |
| S1 phút chót | Sửa nếu an toàn và kịp (tag mới); nếu không: nộp bản `v1.0` và ghi lỗi vào *Limitations* — trung thực hơn sửa vội |
| CTE lỗi | Theo FAQ Guidelines: chụp màn hình, email GV kèm file, nộp khi hệ thống hoạt động |
