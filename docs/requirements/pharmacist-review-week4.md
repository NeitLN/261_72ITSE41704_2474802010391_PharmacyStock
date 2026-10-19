# Pharmacist review of Appendix D — Week 4

- **Reviewer:** a practising pharmacist; relative of the team leader (Võ Việt Tiến). Name not given in the report.
- **Form:** informal conversation, recorded; summary checked against the recording by the team leader.
- **Scope reviewed:** DEC-01 to DEC-10 of Proposal v1.0 (Appendix D).
- **Open points (follow-up in Week 5):** DEC-09 (reviewer wants to read BR01 and BR02), DEC-10 (reviewer wants to see the concrete NFR targets). Until confirmed, these stay team assumptions.
- **Resulting changes:** Proposal v1.1, Appendix D (Tables D.1, D.2); see [business-decisions.md](business-decisions.md).

> The recording itself is kept outside Git, in the team leader's private storage.

## Written summary (Vietnamese, as checked)

Nhìn chung, bác đồng ý với hướng xây dựng phần mềm này. Quản lý thuốc theo từng lô và hạn sử dụng sẽ giúp nhà thuốc kiểm soát hàng tốt hơn. Tuy nhiên, có một số quyết định bác muốn nhóm điều chỉnh để phù hợp với việc cấp và bán thuốc.

**DEC-01: Bác đồng ý một phần.**
Lưu hạn sử dụng đầy đủ là hợp lý. Nếu bao bì chỉ ghi tháng và năm thì thường hiểu là hết ngày cuối tháng đó. Nếu phần mềm chặn bán ngay trong ngày hết hạn, nhóm nên ghi rõ đây là chính sách của nhà thuốc. Tôi cũng muốn có cảnh báo thuốc quá sát hạn, vì lúc bán thuốc còn hạn nhưng khách có thể chưa dùng hết thì thuốc đã hết hạn.

**DEC-02: Bác đồng ý nhưng cần bổ sung.**
Không đủ thuốc thì phần mềm phải báo rõ số lượng còn lại. Tuy nhiên, không phải cứ còn bao nhiêu là bán bấy nhiêu. Tôi cần xem việc cấp một phần có ảnh hưởng đến liệu trình không và trao đổi với người mua trước. Phần mềm nên lưu đã cấp bao nhiêu, còn thiếu bao nhiêu để lần sau kiểm tra được.

**DEC-03: Bác thấy chưa đủ để kết luận đơn hợp lệ.**
Ngoài ngày kê đơn và thông tin người kê, tôi còn phải kiểm tra thông tin người bệnh, tên thuốc, hàm lượng, liều và cách dùng. Có đơn tồn tại trên hệ thống chưa có nghĩa là có thể cấp thuốc ngay. Mốc năm ngày cũng cần đối chiếu quy định áp dụng, chứ không nên để người dùng tự kéo dài ngày hiệu lực của đơn.

**DEC-04: Bác không đồng ý với cách xử lý này.**
Thuốc khách trả lại dù chưa hết hạn vẫn chưa chắc bán lại được, vì mình không biết khách đã bảo quản như thế nào. Tôi muốn thuốc trả lại được đưa vào khu vực cách ly và trạng thái chờ đánh giá trước. Chỉ khi đủ điều kiện và được người có trách nhiệm duyệt mới xem xét nhập lại kho bán được. Nếu phải tiêu hủy thì cũng phải phân biệt "chờ tiêu hủy" và "đã tiêu hủy", không ghi đã hủy ngay khi vừa nhận thuốc.

**DEC-05: Bác đồng ý.**
Một lần giao thuốc chỉ được trừ kho một lần. Nếu thuốc đã giao rồi thì lúc lập hóa đơn không được trừ tiếp. Nhưng nhóm cần làm rõ: mới soạn thuốc hoặc mới nhập đơn thì chưa được coi là đã giao. Trường hợp khách hủy mua cũng phải có cách xử lý rõ ràng.

**DEC-06: Bác đồng ý với cách tính số lượng xuất ròng, nhưng tên gọi cần sửa.**
Nếu báo cáo muốn cho biết đã xuất bao nhiêu thuốc thì công thức này phù hợp. Còn nếu gọi là doanh thu hoặc vòng quay tồn kho thì chưa đúng. Thuốc đã cấp rồi và sau đó lập hóa đơn chỉ tính một lần; thuốc trả lại cũng chỉ trừ khi thực sự được duyệt nhập lại kho bán được.

**DEC-07: Bác đồng ý.**
Nguyên tắc chính là thuốc có hạn gần hơn thì xuất trước. Hai lô cùng hạn thì ưu tiên lô nhập trước là hợp lý. Tuy nhiên, lô đang cách ly, bị thu hồi hoặc không đạt chất lượng phải bị loại khỏi danh sách lựa chọn, dù hạn sử dụng vẫn còn.

**DEC-08: Bác đồng ý với cảnh báo, nhưng muốn đổi cách cài đặt.**
Nên có nút bật hoặc tắt theo dõi riêng, thay vì đặt mức bằng không để tắt. Tôi cũng muốn phân biệt "sắp hết hàng" với "đã hết hàng". Số lượng dùng để cảnh báo phải là số thực sự có thể bán, không tính cả thuốc hết hạn hoặc đang cách ly.

**DEC-09: Bác không đồng ý nếu chỉ chặn thuốc thuộc diện kiểm soát.**
Có những thuốc kê đơn không thuộc nhóm kiểm soát đặc biệt, nhưng vẫn cần đơn khi bán. Vì vậy, luồng bán không kê đơn phải kiểm tra thuốc đó có thực sự được phân loại là thuốc không kê đơn hay không. Tôi cần xem thêm BR01 và BR02 mới đánh giá đầy đủ phần này được.

**DEC-10: Bác cần xem các yêu cầu hiệu năng cụ thể.**
Ở quầy, tôi cần tìm thuốc, xem lô và hoàn tất giao dịch nhanh. Nhưng điều tôi quan tâm nữa là khi hai nhân viên cùng bán một thuốc còn ít, hệ thống phải cập nhật đúng, tránh cả hai cùng bán vượt số lượng còn lại. Nhóm nên đưa tình huống này vào phần kiểm thử.
