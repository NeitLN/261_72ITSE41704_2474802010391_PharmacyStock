# Roadmap 10 tuần — Pharmacy Stock and Prescription Dispensing System

**Vai trò người lập:** phụ trách kỹ thuật và kế hoạch · **Lập ngày:** 24/09/2026 (thứ Năm, tuần 2) · **Bản 2** (sau tự phản biện, §10)
**Trạng thái:** kế hoạch — chưa phải kết quả. Các quyết định của trưởng nhóm ngày 24/09 ở §12. Mọi ô "đã xong" phải có minh chứng (commit / PR / lượt chạy test / ảnh).

## 0. Cách đọc bộ tài liệu

| File | Nội dung |
|---|---|
| `00-tong-quan.md` (file này) | Căn cứ, giả định, quyết định, phạm vi, quy trình chất lượng, truy vết, quyết định nghiệp vụ, rủi ro, tự phản biện, câu hỏi cần chốt |
| `tuan-01.md` … `tuan-10.md` | Mỗi tuần: mục tiêu, điều kiện bắt đầu, việc từng người (giờ, reviewer, phụ thuộc, nghiệm thu), phân bổ giờ, vòng chất lượng, bàn giao, nghiệm thu cuối tuần, phương án khi trễ |

Mã việc `Wtt-Xn` trùng mã Issue trên GitHub khi nội dung tương ứng. Dòng "mới" là việc chưa có Issue. Chênh lệch với Issue/Excel: §11.

**Thành viên** (đã xác nhận): **A** = Võ Việt Tiến (trưởng nhóm, `NeitLN`) · **B** = Bùi Duy Anh (`anh7032`) · **C** = Võ Hoàng Minh (`Jayson135724`).

**Quy ước giờ**: mỗi người 20 giờ hoạt động học tập/tuần (Guidelines §1), **đã gồm** tự học, họp, review và dự phòng. Tổng giờ trong bảng việc của mỗi tuần = 20 cho mỗi người (đã kiểm bằng script).

---

## 1. Căn cứ

| Nguồn | Dùng cho |
|---|---|
| Course-Guidelines.pdf §1–2 (mốc), §3 (nhóm cố định sau tuần 2), §4.1 (phạm vi tối thiểu), §5–6 (rubric, hướng dẫn chương), §7 (Git), §8 (nộp bài), §9 (điểm cá nhân), §10 (AI), §12 (checklist), §13 (FAQ) | Mốc, tiêu chí chấm, luật Git, checklist nghiệm thu |
| Suggested-Project-Titles.pdf, Bảng 2; §2 (xác minh vấn đề với người dùng thật hoặc nguồn tài liệu); §5; đề tài 12 | Phạm vi nhóm 3 người; 5 quy tắc gốc; stretch goals |
| Self-study-Materials.pdf, Module 0 (nhịp tuần, 4 kiểu thất bại, Definition of Done), lịch 11 module | Nhịp tuần, DoD, lịch tự học |
| Template_Project-Proposal.docx | Cấu trúc Proposal, bảng 2.4 |
| Repo tại commit `4372890` | 25 entity, docker-compose, 34 TC kế hoạch, 90 Issue |
| Lịch sử trao đổi | Thành viên, stack, lịch tuần, hạn Proposal |
| **Rà soát độc lập (4 agent AI) + tự rà soát** | §10 |

## 2. Đã xác nhận và giả định

| Hạng mục | Giá trị | Loại |
|---|---|---|
| Nhóm, MSSV, trưởng nhóm, tài khoản GitHub | Như §0 | Đã xác nhận |
| Hạn Proposal | CN 04/10/2026 (cuối tuần 3) | Người dùng cung cấp |
| Tuần 1 | T2 14/09 – CN 20/09/2026 | Suy ra, người dùng đồng ý |
| Stack | React + Vite + Ant Design → NestJS + TypeORM (ESM) → PostgreSQL 18 (Docker), TypeScript | Đã xác nhận |
| Form Appendix A; quyền GV; đề tài 12 còn trống | Đã xong | Người dùng xác nhận; quyền GV đã kiểm trên GitHub |
| **Hạn nộp chính thức** | Kế hoạch **bám cấu trúc 10 tuần** (Proposal cuối tuần 3, Final cuối tuần 10). Ngày chính thức cập nhật khi E-learning/CTE công bố; hạn nội bộ luôn sớm hơn 1–2 ngày | Quyết định trưởng nhóm 24/09 |
| Múi giờ nghiệp vụ | Asia/Ho_Chi_Minh (UTC+7) cho mọi so sánh ngày | Giả định kỹ thuật (QĐ 10) |
| Buổi họp cố định | **Giả định**: T7 2 giờ (demo, tích hợp, retro, journal) + T4 30 phút (đồng bộ, phân loại lỗi). Nhóm có thể đổi ngày nhưng phải cố định | Giả định |
| Kỹ năng NestJS/TypeORM của B, C | Chưa biết → giả định **mới học**; có giờ học có cấu trúc ở tuần 4 và buổi ngồi cặp ở tuần 5 | Giả định thận trọng |
| Tình trạng B, C đến 24/09 | **0 commit, 0 PR, Issue tuần 1 còn mở** | Thực tế |
| Rubric đầy đủ + Template Final | Guidelines §1 nói đã có trên E-learning; nhóm chưa tải → **tải trong tuần 3** | Thiếu, xử lý được |
| Khảo sát người dùng thật | Chưa có. Kế hoạch có việc tạo nguồn thật (phỏng vấn ngắn hoặc ≥ 2 tài liệu); **không bịa kết quả** | Thiếu |

## 3. Quyết định lập kế hoạch (và lý do)

| # | Quyết định | Lý do |
|---|---|---|
| D1 | **Giữ stack TypeScript xuyên suốt** | Nhóm quen JS/TS nên tránh "infinite framework". NestJS ép tách controller/service/repository (§4.1-4). PostgreSQL có transaction, khóa dòng, `CHECK`, `REVOKE`, cần cho BR03/BR05. Ant Design giúp form/bảng nhất quán. Đã cân nhắc: Express thuần (phải tự dựng phân tầng), Prisma (không có entity class, câu chuyện OOP yếu hơn) |
| D2 | **Lát cắt dọc**: mỗi UC đi UI → service → DB → test → docs | Module 0. Có bản chạy được ở tuần 5 |
| D3 | **Nền móng dùng chung xong ở tuần 4**, trước khi code tính năng: migration + tooling, `StockLedger` (khóa, sổ append-only), hợp đồng `CurrentUser` + mẫu phân quyền, hạ tầng test + CI có PostgreSQL, lát cắt mẫu UC02 | Rà soát cho thấy nếu làm sau thì phải sửa ngược code rủi ro nhất (§10 F1) |
| D4 | **Chia nền móng cho cả ba**: A (migration, lát cắt mẫu), B (`StockLedger`, `FefoAllocator`), C (phân quyền, hạ tầng test, CI) | Tránh "single hero"; mỗi người sở hữu một phần cốt lõi (§10 F2) |
| D5 | **Quy tắc = lớp miền thuần, có unit test đặt tên `BRxx-…`**; thời gian truyền vào qua `Clock` / `asOfDate` | Test không cần UI, lặp lại được với ngày cố định (§10 F6) |
| D6 | **Yêu cầu viết một lần bằng tiếng Anh** trong `docs/requirements/`; Proposal lấy từ đó. A làm **một đặc tả mẫu** trước để B, C theo | Chỉ còn 10 ngày đến Proposal |
| D7 | **MoSCoW**: 14 UC Must (trên cận dưới 13) | Có biên an toàn nếu giám khảo không tính UC16 đăng nhập là một "journey" |
| D8 | **Mỗi người sở hữu 5–6 UC và tự viết phần báo cáo của UC mình** | Cân đóng góp; Appendix C mục tiêu ~33/33/33 (§10 F2) |
| D9 | **Review chính theo vòng B↔C↔A; A là reviewer thứ hai bắt buộc cho PR nhãn `stock-integrity`** (sổ kho, cấp phát, trả, kiểm kê, xác thực) | Không dồn review cho A; vẫn giữ mắt kinh nghiệm ở chỗ rủi ro (§10 F3) |
| D10 | **Người chạy test ≠ tác giả**; bảng test là **nhật ký chạy ghi nối tiếp**; Issue chỉ đóng sau khi người chạy test xác nhận Pass | Giữ bằng chứng "Fail → sửa → Pass" (§10 F4) |
| D11 | **Hạn nội bộ sớm 1–2 ngày** trước mọi mốc | Chừa chỗ cho sự cố |
| D12 | **CI là Must, không cắt**; `main` được bảo vệ (PR + 1 approve khác tác giả + CI xanh) | `main` luôn build (§7 Guidelines); ép quy trình bằng công cụ |
| D13 | **Báo cáo viết từ tuần 8, chia theo người/UC** | Tránh "documentation last" |
| D14 | **Đa hình có chủ đích**: cây `BusinessRuleViolation`; `ReportGenerator` (tồn thấp / hạn dùng / luân chuyển) | Bằng chứng OOP cho trích code (Guidelines §6.3) |
| D15 | **Cổng thiết kế đầu mỗi tuần tính năng**: sequence + bảng tình huống của UC tuần đó merge **trước** PR tính năng | Thiết kế đi trước code (§10 F5) |

## 4. Phạm vi: bắt buộc / nên có / mở rộng

| Mức | Use case (chủ sở hữu) | Quy tắc | Khác |
|---|---|---|---|
| **Must — 14 UC** | A: UC01 danh mục thuốc (kèm giá bán hiện hành) · UC02 NCC · UC03 nhập hàng · UC04 tra cứu tồn/lịch sử lô — B: UC05 nhận đơn · UC06 cấp phát · UC07 bán hàng (OTC + theo đơn) · UC08 trả hàng · **UC14 khách hàng/bác sĩ** — C: UC09 kiểm kê · UC10 cảnh báo tồn thấp · UC11 cảnh báo hạn dùng/hủy lô · UC12 báo cáo luân chuyển · UC16 đăng nhập | BR01 FEFO · BR02 lô hết hạn · BR03 không âm kho · BR04 thuốc kiểm soát cần đơn hợp lệ (gồm kiểm tra `validUntil`) · BR05 sổ kho append-only + bút toán bù · BR07 không cấp vượt đơn — **6 quy tắc**; BR01/02/04 áp dụng cho **mọi** xuất kho (cấp phát và bán OTC) | 3 vai trò, quyền kiểm ở service · validation mọi input · xử lý lỗi DB · dữ liệu còn sau restart · CI · ≥ 20 TC có lượt chạy thật · unit test cho mọi BR Must · 50–200 bản ghi mẫu thực tế |
| **Should** | A: UC13 lịch sử giá theo ngày — C: UC15 màn hình quản trị người dùng/vai trò | BR08 kiểm kê hai người · BR09 giá theo ngày hiệu lực · BR10 đơn hết hạn (tách riêng khỏi BR04) | Backup/restore (TC-30) · stress đồng thời 20 lần |
| **Could** (cắt đầu tiên) | — | **BR06 quy đổi đơn vị** — mặc định nhập theo đơn vị cơ sở (QĐ 18) | Quét mã vạch · gợi ý đặt hàng · deploy công khai · xuất PDF/Excel |

Không làm Should thì: vai trò và tài khoản vẫn có qua seed; giá hiện hành vẫn đặt được ở UC01. **14 UC Must vẫn chạy.**

## 5. Roadmap tổng quan

| Tuần | Ngày | Cổng / mốc | A — Tiến | B — Duy Anh | C — Minh |
|---|---|---|---|---|---|
| 1 | 14–20/09 | Đăng ký ✅ (A) | ✅ Đăng ký, repo, scaffold | *không có minh chứng* → tuần 2 | *không có minh chứng* → tuần 2 |
| 2 | 21–27/09 | PR đầu của B, C; **chốt 9 QĐ lõi (T7 26/09)**; FR + đặc tả UC Must | ✅ Domain, DB · sửa `.env.example` · đặc tả mẫu + FR UC01–04 | Nhập cuộc · QĐ 1,2,3,5,7 + nguồn · FR UC05–08, 14 | Nhập cuộc · QĐ 4,6,8,9 + nguồn · FR UC09–12, 16 + NFR |
| 3 | 28/09–04/10 | **Proposal — nộp T7 03/10** | Ch.1, 2.4, Ch.4, ghép, nộp; tải rubric + template Final | FR, sơ đồ + đặc tả gọn 14 UC, 2.3 | Ch.3, NFR, tham khảo, checklist + rubric |
| 4 | 05–11/10 | **Nền móng + cổng thiết kế T4 07/10**; chốt QĐ 10–18 | Migration + tooling, lát cắt mẫu UC02 (+ `CurrentUser`, mẫu phân quyền, form-error), bảo vệ `main` | Học NestJS, sequence, **`FefoAllocator`**, **`StockLedger`** | Học NestJS, mẫu phân quyền, **hạ tầng test + CI**, bảng test mới + TC-35…55 |
| 5 | 12–18/10 | **v0.1** (API + UI tối thiểu): đăng nhập → nhập hàng → nhận đơn → cấp FEFO | UC01, UC03, seed | UC05, UC06, test BR01–03 + đồng thời cơ bản | Xác thực backend + **UI đăng nhập**, kiểm thử tích hợp, **tag v0.1** |
| 6 | 19–25/10 | Quy tắc đơn thuốc, bán hàng, kiểm kê | UC04, xử lý lỗi, chạy test của B | BR04/07/10, UC07 (OTC áp BR01/02/04), invariant BR05 | UC09, UC10, chạy test của A |
| 7 | 26/10–01/11 | **v0.2**: 14 UC Must; Appendix D | UC13 *(S)*, hồi quy, review | UC08, UC14, Appendix D, **tag v0.2** | UC11, UC12, UC15 *(S)* |
| 8 | 02–08/11 | Làm vững; sơ đồ sinh từ code; **nháp báo cáo** | Restart/rollback, hiệu năng, backup, Ch.2 + kiến trúc/dữ liệu | Stress đồng thời, chống gửi lặp, test BR đầy đủ, báo cáo phần B | Kiểm toán quyền, sơ đồ, hồi quy, báo cáo phần C + kiểm thử |
| 9 | 09–15/11 | **Freeze T2 09/11**; **v1.0 T6 13/11**; nháp đủ T7 14/11 | Ch.1–2, phần A, ghép (chỉ để nhất quán), bảng phản hồi Proposal | Phần B, kiểm thử khám phá, ma trận truy vết | TC-32, TC-33, hồi quy cuối, **tag v1.0** |
| 10 | 16–22/11 | **Final — khóa T5 19/11, nộp T6 20/11** | Biên tập nhất quán, Ch.4, nộp | Đối chiếu tài liệu–code, "chưa làm và vì sao", nguồn/license, Appendix C | Chạy máy khác, kiểm tra file/link, checklist 12.2/12.3 |

**Dự phòng**: khoảng 25–30 giờ/người (~13–15%) rải trong các tuần, nhiều hơn ở tuần 8–10.

---

## 6. Quy trình code → review → test → fix

### 6.1 Vòng chất lượng của một chức năng

```
Yêu cầu + tiêu chí chấp nhận (FR-xx, luồng thay thế)
  → Cổng thiết kế: sequence + bảng tình huống thường/biên/lỗi (merge trước code)
  → Unit test BRxx-… (viết trước hoặc cùng lúc)
  → Code: controller mỏng → service (quy tắc, kiểm quyền) → StockLedger/repository
  → PR "Refs #n" → CI xanh → review (người chính + A nếu `stock-integrity`) → merge
  → Người chạy test (≠ tác giả) chạy TC trên build đã merge → ghi một dòng vào nhật ký chạy
  → Fail → Issue `bug` + S1–S4 → PR sửa kèm test tái hiện "Refs #bug" → nhãn `needs-retest`
        → người chạy test chạy lại → Pass → đóng bug (trích dòng nhật ký)
  → Tất cả TC của UC Pass → người chạy test đóng Issue tính năng
```

**Vì sao `Refs #n` thay cho `Closes #n`**: `Closes` tự đóng Issue ngay lúc merge, trước khi có người test lại (§10 F4). Bảng dự án vẫn tự chuyển sang *Done* khi Issue được đóng.

### 6.2 Nhánh, PR, bảo vệ `main`

- Nhánh `feature/uc06-dispense`, `fix/123-negative-stock`, `docs/…`. Không commit thẳng `main`.
- **Bảo vệ `main`** (A bật ở tuần 4): bắt buộc PR, 1 approve khác tác giả, CI xanh, approve cũ bị hủy khi có commit mới.
- **Mẫu PR**: UC/FR/BR/TC liên quan · đã test thế nào · **"Reviewer đã chạy: lệnh + TC"**.
- PR mục tiêu < 400 dòng; reviewer phản hồi **trong 24 giờ**; mỗi người merge vào `main` **ít nhất 2 lần/tuần** trong tuần 5–8.
- **Migration**: mỗi PR tối đa một migration, sinh **sau khi rebase** lên `main`; CI chạy migration + seed trên DB trống. A là **người giữ schema và seed** (1 giờ/tuần, tuần 5–8).
- **Ma trận review** (người chính → A là người thứ hai nếu PR có nhãn `stock-integrity`):

| Tác giả | Reviewer chính | Reviewer dự phòng khi vắng |
|---|---|---|
| A | B | C |
| B | C | A |
| C | A | B |

### 6.3 Checklist review

| Góc | Reviewer phải trả lời "có" |
|---|---|
| Thiết kế | Quy tắc nằm trong service/lớp miền? **Mọi thay đổi tồn đi qua `StockLedger`**? Khóa theo thứ tự lô tăng dần theo id, trong một transaction? Quan hệ đơn trị dùng `Relation<T>`, import có `.js`? |
| Nghiệp vụ | Khớp FR và quyết định (dẫn link `docs/README.md`)? Đủ luồng thay thế? Ngày so sánh theo `Clock` và múi giờ QĐ 10? |
| Phân quyền | Endpoint mới có `assertPermission` trong service với đúng permission? |
| Mã | DTO + class-validator? Lỗi DB trả `{code, message, field}`? UI hiện lỗi theo từng trường? Tiền không dùng `parseFloat`? Không code comment-out, không secret? |
| Schema | Đổi entity ⇒ có migration **và đã khởi động backend thật** (bài học `acaa60b`)? Cập nhật `domain-model.md`? |
| Kiểm thử | Test tên `BRxx-…`/`UCxx-…` cho ca thường, biên, lỗi? Reviewer **tự chạy** và ghi vào PR? |
| Tài liệu | Docs, đặc tả UC và trạng thái UC cập nhật trong cùng PR? |

### 6.4 Mức nghiêm trọng và thời hạn

| Mức | Định nghĩa | Ví dụ | Thời hạn |
|---|---|---|---|
| **S1 Chặn** | Sai dữ liệu kho, vi phạm quy tắc nhà thuốc, **vượt quyền / lộ dữ liệu**, crash, mất dữ liệu | Tồn âm; cấp/bán lô hết hạn; bán OTC thuốc kiểm soát; Cashier gọi được API của Manager | Dừng việc mới, sửa trong **24 giờ** |
| **S2 Nặng** | Chức năng không dùng được hoặc sai kết quả, không có cách tránh | Báo cáo sai số; không lưu được đơn | Trong tuần |
| **S3 Nhẹ** | Có cách tránh; thông báo chưa rõ | Validation báo chung chung | Tuần sau |
| **S4 Hình thức** | Giao diện, chính tả | Lệch cột | Trước freeze |

**Luật tag duy nhất**: **không tag khi còn S1 hoặc S2 mở.** Lỗi S3/S4 còn mở lúc tag được liệt kê trong release note; lúc nộp, mọi lỗi còn mở phải có trong mục *Limitations* của Ch.4.

### 6.5 Tầng kiểm thử và bộ hồi quy

| Tầng | Công cụ | Phạm vi | Từ tuần |
|---|---|---|---|
| Unit | Vitest | Lớp miền + service của mọi BR; ngày cố định qua `Clock` | 4 |
| API e2e | Vitest + NestJS testing, **DB test riêng**, reset mỗi lần chạy, chạy trong CI (PostgreSQL service) | Luồng nhập → cấp → bán → trả; rollback; đồng thời; ma trận vai trò × endpoint | 4–5 |
| Thủ công | `tests/manual/test-cases.md` (định nghĩa) + `tests/manual/runs.md` (**nhật ký chạy ghi nối tiếp**: lượt, ngày, người chạy, commit, Actual, kết quả, link bug) | Luồng giao diện, khả dụng, cài đặt | 5 |
| **Bộ hồi quy R** (15 TC, ~2 giờ gồm reset + seed) | Thủ công + toàn bộ unit/e2e trong CI | TC-01, 03, 04, 06, 07, 09, 12, 15, 16, 19, 21, 28, 31, 35, 43 | Trước mỗi tag, bắt đầu **thứ Năm** |

Trước mỗi lượt chạy thủ công: `docker compose down -v` → migration → seed. Dữ liệu lớn cho TC-29 nạp vào **DB riêng**.

### 6.6 Definition of Done

**Issue tính năng** chỉ đóng khi:
1. Chạy end-to-end trên giao diện; dữ liệu còn sau restart.
2. Mọi dòng trong bảng tình huống của các BR liên quan có test tự động tên `BRxx-…` và pass trong CI.
3. Input được validate; lỗi DB và dữ liệu sai được xử lý và hiện đúng trường trên UI.
4. PR đã merge qua CI xanh và approve của reviewer (thêm A nếu `stock-integrity`); reviewer ghi "đã chạy".
5. **Các TC của UC có dòng Pass trong `runs.md` do người khác tác giả chạy**, kèm ảnh minh chứng.
6. Đặc tả UC, docs, sơ đồ liên quan đã cập nhật.

**Issue không có code** (đọc, thiết kế, viết): đóng khi đầu ra ở trong repo và reviewer comment đồng ý trên PR **kèm ít nhất một góp ý hoặc câu "đã đối chiếu với X"**.

### 6.7 Minh chứng tuần (cổng đóng góp)

Mỗi T7, `docs/journal.md` ghi:
- Kết quả `git shortlog -sn --since=<T2>`.
- **Mỗi thành viên có ≥ 1 PR có nội dung đã merge dưới tài khoản mình và ≥ 1 review.**
- Quyết định, lỗi tìm được, việc tuần sau.

Ngoài ra lưu: lượt chạy trong `runs.md`, ảnh trong `tests/manual/evidence/`, tag và release note, sơ đồ (nguồn + ảnh).

---

## 7. Truy vết: yêu cầu → việc → chức năng → test → minh chứng → tiêu chí chấm

Mã FR do từng người đặt ở tuần 2 (`FR-01…`). Ma trận đầy đủ FR → UC → service → test → trạng thái nằm trong báo cáo (W09-B3). **TC-35 đến TC-55** là test mới, viết **trước code** ở W04-C3.

| Quy tắc / nhóm | UC | Lớp / service | Việc | Test tự động | TC thủ công (người chạy) | Tiêu chí |
|---|---|---|---|---|---|---|
| BR01 FEFO | UC06, UC07 | `FefoAllocator` | W04-B2, W05-B2, W06-B2 | `BR01-*` (nhiều lô, lô tồn 0, hòa hạn QĐ 7) | TC-04, 05, 08 (A); TC-55 OTC (A) | CLO4, CLO1 |
| BR02 Lô hết hạn | UC06, UC07, UC11 | `ExpiryPolicy` + `Clock` | W04-B2, W06-B2, W07-C1 | `BR02-*` trước/đúng/sau ngày, qua nửa đêm UTC+7 | TC-06, 07, 08 (A); TC-35 OTC (A); TC-22 (B) | CLO4 |
| BR03 Không âm kho | UC06, 07, 09 | `StockLedger` + `CHECK` + khóa dòng | W04-B3, W05-B3, W08-B1 | `BR03-*`; e2e song song: đúng một thành công, còn lại lỗi nghiệp vụ, invariant giữ | TC-09, 10 (A); TC-26 (B, stress) | CLO4, CLO3 |
| BR04 Thuốc kiểm soát (+ `validUntil`) | UC06, UC07 | `PrescriptionValidator` | W06-B1, W06-B2 | `BR04-*` | TC-12, 13, 14 (C); TC-36 OTC (C) | CLO4, CLO1 |
| BR05 Sổ kho append-only | Mọi UC đổi tồn | `StockLedger`, `REVOKE UPDATE/DELETE`, `reversesMovementId` duy nhất | W04-A2, W04-B3, W06-B3 | `BR05-*`: invariant tồn = tổng movement; không đảo hai lần | TC-16 (C), 19 (B), 25 (C), 51 (B) | CLO4, CLO3 |
| BR07 Không cấp vượt đơn | UC06, UC08 | `PrescriptionValidator` + khóa `PrescriptionItem` | W06-B1, W08-B1 | `BR07-*` gồm hai dược sĩ cùng lúc | TC-37, 38 (C); TC-54 (A) | CLO4 |
| BR08 Kiểm kê hai người *(S)* | UC09 | `StockTakeService` | W06-C1 | `BR08-*` | TC-19, 20, 39 (B) | CLO4 |
| BR09 Giá theo ngày *(S)* | UC13, UC07 | `PriceBook` | W07-A1 | `BR09-*` | TC-40, 41 (B) | CLO4 |
| BR10 Đơn hết hạn *(S)* | UC06 | `PrescriptionValidator` | W06-B1 | `BR10-*` | TC-42 (C) | CLO4 |
| BR06 Quy đổi đơn vị *(Could)* | — | — | chỉ khi còn thời gian | — | — | — |
| Chức năng Must khác | UC01, 02, 03, 04, 05, 14 | các service tương ứng | W04–W07 | `UCxx-*` | TC-45 UC01, 46 UC02, 49 nhập hàng hạn ≤ ngày nhập (C); 47 UC05 (A); 48 UC04 (C); 52 tổng hóa đơn thập phân (A) | CLO4, CLO1 |
| Phân quyền 3 vai trò | UC15, UC16 | `assertPermission` ở service | W04-C1, W05-C1, W08-C1 | e2e bảng vai trò × endpoint (TC-53) | TC-28 (B), 43 (A); TC-44 khóa tài khoản *(S, cần UC15)* (A) | CLO4, CLO3 |
| Trả hàng | UC08 | `ReturnService` | W07-B1 | `UC08-*` | TC-17, 18 (C); TC-50 thuốc kiểm soát/hết hạn không về tồn bán (C) | CLO4 |
| Lưu trữ, giao dịch | Tất cả | Transaction trong service | W05-A2, W08-A1 | e2e rollback | TC-24, 25 (C); 30 backup *(S)* (C) | CLO4 |
| Luồng đầu–cuối | UC03→06→07→08→12 | — | W07, W09 | e2e luồng chính | **TC-31** (A ở W07; C ở W09) | CLO4 |
| NFR hiệu năng, khả dụng, cài đặt | — | — | W08-A2, W09-C1, W09-C2 | — | TC-29 (C), 32 (C, ngưỡng từ NFR), 33 (C) | CLO1, CLO4 |
| Nộp bài | — | — | W03-A3, W10-A3 | — | TC-34 (C) | CLO5 |
| Git, cộng tác | — | — | Mọi tuần | CI | — | **CLO2**: cổng đóng góp hằng tuần (§6.7), 3 tag |

**TC mới (viết ở W04-C3)**: 35 OTC lô hết hạn bị từ chối · 36 OTC thuốc kiểm soát bị từ chối · 37/38 BR07 đúng phần còn lại / vượt · 39 BR08 tự duyệt · 40/41 BR09 · 42 BR10 · 43 đăng nhập sai · 44 tài khoản bị khóa *(S)* · 45 UC01 tạo/trùng mã · 46 UC02 validation · 47 UC05 tạo đơn/thiếu trường · 48 UC04 tra cứu + lịch sử lô · 49 phiếu nhập hạn ≤ ngày nhập · 50 hàng trả kiểm soát/hết hạn · 51 điều chỉnh/hủy giữ invariant · 52 tổng hóa đơn thập phân · 53 vai trò × endpoint · 54 cấp vượt đồng thời · 55 OTC theo FEFO. TC-11 viết lại (bỏ "sai đơn vị" nếu BR06 bị cắt). **Tổng 55 TC.**

---

## 8. Quyết định nghiệp vụ cần nhóm chốt

Tôi **không tự chốt**. Cột "Đề xuất" để buổi họp đi nhanh; nhóm có quyền chọn khác. Mỗi quyết định sau khi chốt được ghi vào `docs/README.md` bởi người phụ trách, bằng commit của chính họ, **với một cách đánh số thống nhất** (QĐ 1–18 — thay cho "6.4-x" trong code TODO). Riêng **QĐ 10–18 ảnh hưởng schema** nên phải chốt trước khi migration tuần 4 merge.

### 8.1 Chín quyết định lõi — hạn **T7 26/09** (cần cho FR của Proposal)

| # | Câu hỏi | Phương án | Đề xuất (cần xác nhận) | Ảnh hưởng |
|---|---|---|---|---|
| 1 | Hạn dùng lưu theo ngày hay tháng; có được xuất đúng ngày hết hạn? | (a) Ngày, xuất được đến hết ngày hết hạn · (b) Ngày, không xuất từ ngày hết hạn · (c) Tháng → ngày cuối tháng | Lưu kiểu `date`; nhãn chỉ có tháng thì quy về ngày cuối tháng; chỉ xuất khi `expiryDate > ngày nghiệp vụ` (b). **Viết lại câu BR02** cho khớp với phương án đã chọn | BR02, TC-07 |
| 2 | Thiếu tồn: từ chối cả dòng hay cấp một phần? | (a) Từ chối, báo lượng còn · (b) Tự cấp phần có | (a); người dùng tự giảm số lượng; đơn sang *PARTIALLY_DISPENSED* | BR03, TC-09 |
| 3 | Đơn "hợp lệ" gồm kiểm tra nào? `validUntil` rỗng nghĩa là gì? Ai chuyển trạng thái? | Danh sách | Mã tồn tại; bác sĩ hoạt động; ngày kê ≤ hôm nay; `validUntil` ≥ hôm nay (**rỗng = ngày kê + N ngày**, N do nhóm chọn); trạng thái RECEIVED/PARTIALLY_DISPENSED; thuốc có trong đơn; còn lượng kê. Service cấp phát tự chuyển trạng thái sau mỗi lần cấp | BR04, BR07, BR10 |
| 4 | Hàng trả vào tồn nào; có bán lại? | (a) Luôn hủy · (b) Dược sĩ chọn, quản lý duyệt mới về tồn bán | **Xem QĐ 14 (chi phí mô hình)** trước khi chọn. Thuốc kiểm soát và lô hết hạn **không bao giờ** về tồn bán | UC08, TC-16, 50 |
| 5 | Cấp phát và bán liên kết thế nào để không trừ kho hai lần? | (a) Trừ ở cấp phát · (b) Trừ ở bán | (a): thuốc theo đơn trừ **một lần** ở DispenseLine; thanh toán tạo SaleLine có `dispenseLine` (FK rỗng được) và **không** ghi movement; OTC trừ ở SaleLine. Trả hàng thuốc theo đơn đi qua SaleLine đó | UC06, UC07, UC08, TC-15 |
| 6 | Định nghĩa báo cáo luân chuyển | Kỳ; hàng trả; hủy/điều chỉnh | Xuất ròng = cấp + bán − trả; **hủy và điều chỉnh báo riêng, không tính vào luân chuyển**; giá vốn từ `unitCost` của lô (bắt buộc có); tồn đầu kỳ dựng lại từ movement | UC12, TC-23 |
| 7 | Hai lô cùng hạn: chọn lô nào? | Nhập trước / số lô | Lô nhập trước, rồi số lô | BR01 |
| 8 | Cảnh báo tồn thấp: `<` hay `≤`? | `<` / `≤` | `≤`, chỉ tính tồn còn xuất được; **`reorderLevel = 0` nghĩa là không theo dõi** | UC10, TC-21 |
| 9 | NFR hiệu năng và khả dụng | — | Tra cứu ≤ 1 giây (1.000 thuốc / 5.000 lô); báo cáo ≤ 3 giây (10.000 movement); trung vị 10 lần đo, ghi cấu hình máy. Khả dụng: người mới hoàn thành "nhập hàng" và "cấp theo đơn" mỗi việc ≤ 5 phút, ≤ 1 lỗi cần trợ giúp | NFR, TC-29, TC-32 |

### 8.2 Chín quyết định ảnh hưởng mô hình — nêu tại buổi họp 26/09, hạn **T4 07/10** (cổng thiết kế tuần 4)

Các câu này do rà soát độc lập phát hiện (§10); chưa câu nào được chốt.

| # | Câu hỏi | Đề xuất (cần xác nhận) | Thay đổi schema nếu chọn |
|---|---|---|---|
| 10 | Múi giờ nghiệp vụ | Asia/Ho_Chi_Minh; "ngày nghiệp vụ" tính theo múi giờ này | Không; `Clock` trong code |
| 11 | Bán OTC có áp FEFO, hạn dùng, thuốc kiểm soát? | Có: mọi xuất kho áp BR01/02; OTC **từ chối** thuốc kiểm soát | Không |
| 12 | Giá tính theo ngày cấp hay ngày thanh toán? | Ngày thanh toán (SaleLine), vì BR09 nói "ngày bán" | Không |
| 13 | Trả thuốc theo đơn có hoàn lại lượng còn được cấp của đơn? | Không (an toàn, đơn giản); ghi rõ trong đặc tả | Không |
| 14 | Cách ly hàng trả ở mức số lượng (QĐ 4-b) | Nếu chọn 4-b: thêm `quarantinedQuantity` trên `Batch` + trạng thái duyệt, `approvedBy`, `approvedAt` trên `ReturnLine`. Nếu chọn 4-a: không cần | Có (4-b) |
| 15 | Kiểm kê trong khi vẫn bán/cấp | Ghi chênh lệch = đếm − `systemQuantity` lúc đếm; thêm trạng thái `PENDING_APPROVAL`, `approvedAt` | Có |
| 16 | Cảnh báo sinh khi nào, tránh trùng, khi nào *RESOLVED* | Sinh sau mỗi movement làm tồn qua ngưỡng / khi chạy báo cáo hạn dùng hằng ngày; mỗi (loại, thuốc, lô) chỉ một cảnh báo OPEN | Ràng buộc unique một phần |
| 17 | Cùng số lô giao hai lần | Cho phép: cộng vào lô cũ nếu cùng hạn; khác hạn thì từ chối | Bỏ `OneToOne` ở `GoodsReceiptLine.batch` → `ManyToOne` |
| 18 | BR06 quy đổi đơn vị trong phạm vi? | **Không** (Could): nhập và bán theo đơn vị cơ sở. Nếu có: thêm `MedicineUnit(medicine, unit, factor)` từ tuần 4 | Có (nếu chọn làm) |

Kèm theo schema tuần 4, **không cần quyết định** vì là thiết kế kỹ thuật: `StockMovement.reversesMovementId` (FK về chính bảng, unique), `sourceDocumentType` (enum), `CHECK` dấu số lượng theo loại movement, `REVOKE UPDATE, DELETE` trên `stock_movements`, cột `requestId` (unique) cho cấp phát và trả hàng (chống gửi lặp).

---

## 9. Rủi ro, dự phòng, phương án khi trễ

### 9.1 Sổ rủi ro

| # | Rủi ro | KN / TĐ | Dấu hiệu | Giảm thiểu | Theo dõi |
|---|---|---|---|---|---|
| R1 | **"Single hero"** — B, C chưa tham gia | **Cao / Cao** (đang xảy ra) | Không có PR của B/C đến T7 26/09 | Buổi cài đặt T6 25/09; cổng đóng góp hằng tuần. **Đề xuất (trưởng nhóm quyết)**: nếu đến T7 26/09 B hoặc C không có PR merge và không phản hồi, **email GV trước CN 27/09** (Guidelines §3: nhóm cố định sau tuần 2; FAQ: báo ngay khi xảy ra), chỉ nêu sự kiện; ghi journal. Việc A làm thay ghi rõ trên Issue để Appendix C khớp lịch sử Git | A |
| R2 | Đường cong học NestJS/TypeORM | Cao / Cao | Tuần 4 B/C chưa chạy được lát cắt mẫu | 3–4 giờ học có cấu trúc ở tuần 4; ngồi cặp với A (T2 12/10); phương án khi trễ là **ngồi cặp, không giao lại cho A** | A |
| R3 | Proposal dồn 10 ngày | Cao / Cao | FR chưa đủ T3 29/09 | Đặc tả mẫu của A (T6 25/09); chỉ viết UC Must ở tuần 2; hạn nội bộ | A |
| R4 | Quyết định treo | TB / Cao | Sau 26/09 (QĐ 1–9) hoặc 07/10 (QĐ 10–18) còn câu chưa chốt | Phương án tạm + hạn xem lại | B, C |
| R5 | Xung đột migration/entity | TB / Cao | CI đỏ ở bước migration | Một migration/PR sau rebase; A giữ schema; CI chạy migration trên DB trống | A |
| R6 | Quá tải tuần 5 và 7 | TB / Cao | T4 dưới 50% | v0.1 = API + UI tối thiểu; cắt theo §9.3 | A |
| R7 | Lỗi đồng thời làm âm kho hoặc cấp vượt | TB / Cao | e2e song song fail | Khóa trong `StockLedger` ngay từ tuần 4; test cơ bản tuần 5; stress tuần 8 | B |
| R8 | Báo cáo dồn cuối | TB / Cao | Tuần 8 chưa có nháp | Chia theo người/UC; nháp ở tuần 8 | A |
| R9 | Phản hồi Proposal đến muộn/không được xử lý | TB / TB | — | Mỗi ý góp → Issue `proposal-feedback`; bảng "góp ý → hành động → minh chứng" trong báo cáo | A |
| R10 | Dữ liệu và test theo ngày bị trôi | TB / TB | Lô "sắp hết hạn" thành "đã hết hạn" | Seed theo ngày tương đối; `Clock` trong test | A, B |
| R11 | Thành viên vắng | TB / Cao | Không cập nhật > 2 ngày | Reviewer dự phòng (§6.2); người ký tag dự phòng; vắng dài thì báo GV | A |
| R12 | Môi trường Windows (Docker, `bcrypt`) | TB / TB | Lỗi cài đặt | `.env.example` khớp docker-compose; dùng `bcryptjs` | C |
| R13 | Code sinh bởi công cụ mà người phụ trách không giải thích được | TB / **Rất cao** | Không trả lời được câu hỏi review | Reviewer hỏi "tại sao"; buổi tập giải thích code tuần 9 có biên bản | Mọi người |

### 9.2 Dự phòng

- Mỗi tuần có giờ "sửa lỗi & dự phòng" (1–4,5 giờ/người); tuần 10 có 6,5–7,5 giờ/người.
- Mọi mốc có hạn nội bộ trước 1–2 ngày.
- Tuần 8 không nhận UC Must mới.

### 9.3 Khi trễ — thứ tự xử lý

1. **Phát hiện ở T4 hằng tuần**: gói Must dưới 50% hoặc có S1 mở → báo trên Issue và nhóm chat.
2. **Dùng giờ dự phòng** của tuần; reviewer của module **ngồi cặp** (không nhận thay việc).
3. **Cắt theo thứ tự**: Could → Should (UC15 màn hình → UC13 lịch sử giá → BR10 → BR08 → backup → stress 20 lần) → độ trau chuốt giao diện. **Không bao giờ cắt**: 14 UC Must, BR01–05, BR07, CI, unit test của chúng, nhật ký test, báo cáo.
4. **Cổng tuần không đạt**: hai ngày đầu tuần sau là phục hồi, không nhận việc mới đến khi cổng đạt; ghi trung thực vào journal.
5. **Thành viên vắng > 3 ngày**: việc chuyển cho reviewer của module, ghi lý do trên Issue; nếu kéo dài, báo GV.

---

## 10. Tự phản biện

### 10.1 Cách làm

Bản 1 được **4 agent AI độc lập** rà soát, mỗi agent chỉ đọc file và một góc nhìn: người triển khai, người review thiết kế/nghiệp vụ, người kiểm thử, giảng viên chấm bài. Bốn agent **không sửa file và không chạy phần mềm**; chúng đọc roadmap, tài liệu repo, entity và bản PDF môn học. Cùng với lượt tự rà của người lập, có **60 phát hiện** (khoảng 25 ở mức High). Người lập đánh giá từng phát hiện, chấp nhận phần lớn và sửa roadmap thành bản này. Không có hội thoại hay kết quả test nào được tạo giả.

### 10.2 Phát hiện chính và thay đổi

| # | Phát hiện (nguồn) | Thay đổi trong bản 2 |
|---|---|---|
| F1 | `StockLedger`, khóa, chống gửi lặp, hạ tầng test, CI, migration tooling đặt **sau** code phụ thuộc chúng (triển khai, review, kiểm thử) | Tất cả vào **tuần 4** (D3); cột `requestId`, `reversesMovementId`… vào migration đầu |
| F2 | A vẫn chiếm phần lớn: nền móng, 6 UC, gần hết báo cáo, cả 3 tag, review gần mọi PR (giảng viên, review) | Nền móng chia 3 người (D4); mỗi người 5–6 UC; UC15 trả lại C; B tag v0.2, C tag v0.1/v1.0; báo cáo chia theo người/UC; B↔C là reviewer chính (D8, D9) |
| F3 | A là nút thắt review, trái với vòng review đã công bố (review, giảng viên) | Ma trận review + reviewer dự phòng; A là người thứ hai chỉ cho PR `stock-integrity`; A có 2–3 giờ review/tuần ở tuần 5–7 |
| F4 | Tác giả tự nghiệm thu; ghi đè cột Actual làm mất "Fail → Pass"; `Closes #n` đóng Issue trước khi test lại (kiểm thử) | D10; `runs.md` nhật ký ghi nối tiếp; `Refs #n` + nhãn `needs-retest`; ma trận người chạy test ở §7 |
| F5 | Review thiết kế diễn ra sau khi code đã xong; UC tuần 6–7 không có thiết kế trước (review) | Cổng thiết kế T4 07/10 **trước** merge; cổng đầu tuần 6, 7 (D15); sơ đồ class/ERD sinh từ code ở tuần 8 |
| F6 | Test theo ngày không kiểm soát được đồng hồ; seed ngày cố định bị trôi; lệch múi giờ (kiểm thử, review) | `Clock`/`asOfDate` (D5); seed theo ngày tương đối; QĐ 10 múi giờ; test qua nửa đêm UTC+7 |
| F7 | Mô hình không biểu diễn được: đảo movement, cách ly theo số lượng, kiểm kê song song, trả hàng thuốc theo đơn, quy đổi đơn vị theo thuốc (review) | 9 quyết định mới QĐ 10–18 kèm chi phí schema; BR06 đề xuất chuyển Could |
| F8 | Bán OTC không bị BR01/02/04 ràng buộc — Cashier có thể bán thuốc kiểm soát (review) | BR01/02/04 áp cho mọi xuất kho; QĐ 11; TC-35, 36, 55 |
| F9 | Không ai phụ trách UI đăng nhập, interceptor token, hiển thị lỗi theo trường; ghi dữ liệu cần user trước khi có auth (triển khai) | Hợp đồng `CurrentUser` + guard tạm ở tuần 4 (A); UI xác thực là W05-C2; helper form-error trong lát cắt mẫu |
| F10 | B, C không có giờ học NestJS; ước lượng tuần 5 hợp với người đã làm rồi (triển khai, giảng viên) | 3–4 giờ học có cấu trúc ở tuần 4; ngồi cặp T2 12/10; v0.1 = API + UI tối thiểu; UC05 bản tối thiểu; tạo nhanh khách hàng/bác sĩ dời sang UC14 |
| F11 | UC07 (Must) cần giá, nhưng giá thuộc UC13 (Should); danh mục/đơn vị không ai quản lý (triển khai) | UC01 đặt giá hiện hành; nhóm thuốc, đơn vị là dữ liệu seed; UC13 chỉ còn lịch sử giá |
| F12 | Báo GV về thành viên không tham gia **sau** hạn cố định nhóm (giảng viên) | R1: email trước CN 27/09 (đề xuất, trưởng nhóm quyết) |
| F13 | Chương 3 báo cáo không có người viết cho chức năng của C và phần thiết kế (giảng viên) | Chia Ch.3 theo người và UC; B viết phần thiết kế giao diện, A kiến trúc/dữ liệu, C kiểm thử; ảnh chụp trên bản v1.0 |
| F14 | Phạm vi Must sát cận dưới 13 nếu không tính UC16 (giảng viên) | UC14 lên Must → 14 UC |
| F15 | Vấn đề không có nguồn thật (Titles §2) (giảng viên) | W02-B2/C2: phỏng vấn ngắn có ghi chép hoặc ≥ 2 tài liệu (vd. quy định GPP nhà thuốc của Bộ Y tế, hướng dẫn GPP của WHO/FIP — nhóm tự tra và trích đúng văn bản) |
| F16 | Rubric/template để đến tuần 7–8; Appendix B chỉ A viết; không nêu phần code sinh bởi scaffold (giảng viên) | Tải rubric + template ở tuần 3; mỗi thành viên nộp ghi chép dùng AI cho Tiến; W10-B2 nêu phần code sinh tự động |
| F17 | Bộ hồi quy không định nghĩa, 3 giờ không đủ; TC-26 để quá muộn và pass dễ dàng nhờ CHECK (kiểm thử) | Bộ R 15 TC (§6.5), bắt đầu thứ Năm; e2e song song cơ bản ở tuần 5 với tiêu chí "đúng một thành công, còn lại lỗi nghiệp vụ" |
| F18 | Thiếu TC cho UC01/02/05/04, OTC, trả thuốc kiểm soát, tổng tiền thập phân, ma trận vai trò (kiểm thử) | TC-45…55 viết trước code ở W04-C3 |
| F19 | Luật tag mâu thuẫn; S1 không tính lỗ hổng phân quyền (kiểm thử) | Một luật tag (§6.4); vượt quyền là S1 |
| F20 | `.env.example` lệch docker-compose, làm B/C vấp ngay lần chạy đầu (triển khai — **đã kiểm tra: đúng**) | W02-A0: A sửa trước buổi cài đặt |
| F21 | Tiêu chí nghiệm thu mơ hồ ("không phải hỏi", "dữ liệu vẫn đúng", "có hiệu lực ngay") (kiểm thử) | Viết lại thành số lượng, PR, lượt chạy cụ thể trong từng tuần |
| F22 | Cổng đóng góp chỉ kiểm ở tuần 10 (giảng viên) | Cổng hằng tuần §6.7 |

### 10.3 Phát hiện không chấp nhận hoặc chấp nhận một phần

| Phát hiện | Quyết định | Lý do |
|---|---|---|
| Chuyển UC05 sang A cho nhẹ việc B (triển khai) | **Không** | Mâu thuẫn với cân bằng đóng góp (F2). Thay bằng thu hẹp UC05 ở tuần 5 + ngồi cặp |
| Để khóa dòng tới tuần 8 cho đơn giản (giảng viên) | **Không** | Khóa nằm trong `StockLedger` làm ở tuần 4 có A ngồi cặp; làm đúng một lần rẻ hơn sửa ngược |
| Sinh cả sequence diagram tự động (review) | **Một phần** | Chỉ class/ERD sinh từ code; sequence vẽ tay ở cổng thiết kế |
| Dùng `Refs #n` cho mọi PR (kiểm thử) | **Chấp nhận** | Hệ quả: *PR merged → Done* không tự chạy; bảng vẫn chuyển *Done* khi người chạy test đóng Issue. Cần sửa `CONTRIBUTING.md` |

### 10.4 Giới hạn của lần rà soát

- Rà soát đọc tài liệu; **không có phần mềm nào được chạy** để kiểm chứng ước lượng.
- Ước lượng giờ vẫn là phỏng đoán cho người mới học NestJS. Tuần 5 là phép thử đầu tiên và cần hiệu chỉnh ở buổi retro T7 17/10.
- Việc dùng AI để lập và rà soát kế hoạch này được khai báo ở Appendix B của các báo cáo.

---

## 11. Điều chỉnh so với Issue, Excel và tài liệu repo hiện có

Tài liệu repo đã được đồng bộ cùng lúc đưa roadmap vào `docs/plan/` (24/09). Issue trên GitHub và file Excel theo dõi nội bộ **chưa** cập nhật theo bảng dưới.

| Nơi | Thay đổi |
|---|---|
| Issue tuần 4 | #28–#36 đổi nội dung theo tuan-04 (migration + tooling, lát cắt mẫu có `CurrentUser`/phân quyền, `StockLedger` cho B, hạ tầng test + CI cho C, bảng test mới) |
| Issue tuần 5 | #39 tách seed (T4) và tag (C); #42 thêm e2e song song; #43/#44 thành xác thực backend + UI đăng nhập; #45 C tag v0.1 |
| Issue tuần 6 | #46–#54 theo tuan-06 (không còn W06-A0; B làm invariant BR05; người chạy test luân phiên) |
| Issue tuần 7 | #56 UC15 trả lại C; B làm Appendix D + tag v0.2; UC14 là Must |
| Issue tuần 8–10 | Chia báo cáo theo người/UC; hiệu năng + backup sang A; sơ đồ sang C; Appendix C sang B |
| Issue tuần 1 | #5, #6, #8 gộp vào tuần 2 — đóng kèm comment khi B, C ghi nguồn |
| Nhãn mới | `stock-integrity`, `needs-retest`, `bug`, `S1`–`S4`, `proposal-feedback` |
| Repo | `CONTRIBUTING.md`: `Refs #n`, ma trận review, luật migration; `.env.example` khớp docker-compose; `docs/requirements/use-cases.md`: 14 Must + vòng review; `business-rules.md`: BR06 Could, BR01/02/04 áp mọi xuất kho; đánh số QĐ 1–18 thống nhất |
| Excel | Dựng lại 90 dòng; giờ gồm họp/review/dự phòng |

## 12. Quyết định của trưởng nhóm (24/09/2026) và việc còn mở

| # | Vấn đề | Quyết định |
|---|---|---|
| 1 | Hạn nộp | Bám cấu trúc 10 tuần; ngày chính thức cập nhật khi được công bố |
| 2 | Phạm vi | Giao người phụ trách kỹ thuật chọn → **UC14 lên Must (14 UC Must); BR06 xuống Could**. Lý do: 14 UC Must có biên an toàn trên cận dưới 13 của Bảng 2 kể cả khi UC16 đăng nhập không được tính; UC14 vốn đã cần cho UC05. BR06 cần bảng quy đổi theo từng thuốc và chạm vào nhập hàng, cấp phát, giá — rủi ro cao so với lợi ích; 6 quy tắc Must vẫn đạt mức 6+ |
| 3 | Chia sẻ roadmap | Đưa vào repo `docs/plan/` để cả nhóm và giảng viên cùng xem |
| 4 | Báo GV nếu thành viên không tham gia trước khi chốt nhóm (R1) | **Còn mở** — trưởng nhóm quyết sau buổi họp T7 26/09 |
