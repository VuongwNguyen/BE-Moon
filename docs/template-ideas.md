# Template Ideas — Lumora

Danh sách 30 template sẽ triển khai dần cho app Lumora - Ánh sáng của ký ức.
Mỗi template là một folder trong `public/`, đăng ký vào `enum` ở `models/galaxy.js` và `TEMPLATE_HTML` trong `index.js`.

---

## Trạng thái

| # | Tên | Nhóm | Trạng thái |
|---|-----|------|------------|
| - | galaxy | Không gian | ✅ Done |
| - | fall | Thiên nhiên | ✅ Done |
| 1 | rose | Lãng mạn | ⬜ Chưa làm |
| 2 | sakura | Lãng mạn | ⬜ Chưa làm |
| 3 | candle | Lãng mạn | ⬜ Chưa làm |
| 4 | heartbeat | Lãng mạn | ⬜ Chưa làm |
| 5 | firefly | Huyền bí | ⬜ Chưa làm |
| 6 | aurora | Huyền bí | ✅ Done |
| 7 | lantern | Huyền bí | ⬜ Chưa làm |
| 8 | bubble | Huyền bí | ⬜ Chưa làm |
| 9 | portal | Huyền bí | ⬜ Chưa làm |
| 10 | ocean | Thiên nhiên | ⬜ Chưa làm |
| 11 | rain | Thiên nhiên | ⬜ Chưa làm |
| 12 | snow | Thiên nhiên | ⬜ Chưa làm |
| 13 | forest | Thiên nhiên | ⬜ Chưa làm |
| 14 | butterfly | Thiên nhiên | ⬜ Chưa làm |
| 15 | dandelion | Thiên nhiên | ⬜ Chưa làm |
| 16 | nebula | Không gian | ⬜ Chưa làm |
| 17 | blackhole | Không gian | ⬜ Chưa làm |
| 18 | comet | Không gian | ⬜ Chưa làm |
| 19 | polaroid | Vintage | ⬜ Chưa làm |
| 20 | film | Vintage | ⬜ Chưa làm |
| 21 | newspaper | Vintage | ⬜ Chưa làm |
| 22 | typewriter | Vintage | ⬜ Chưa làm |
| 23 | confetti | Lễ hội | ⬜ Chưa làm |
| 24 | firework | Lễ hội | ⬜ Chưa làm |
| 25 | christmas | Lễ hội | ⬜ Chưa làm |
| 26 | midautumn | Lễ hội | ⬜ Chưa làm |
| 27 | neon | Hiện đại | ⬜ Chưa làm |
| 28 | glitch | Hiện đại | ⬜ Chưa làm |
| 29 | hologram | Hiện đại | ⬜ Chưa làm |
| 30 | liquid | Hiện đại | ⬜ Chưa làm |

---

## Chi tiết từng template

### 1. Rose
**Nhóm:** Lãng mạn / Tình yêu
**Vibe:** Đêm Valentine, tặng hoa cho người yêu
**Background:** Nền đen tuyền hoặc đỏ sẫm, ánh sáng mờ ảo
**Animation:** Hàng trăm cánh hoa hồng đỏ rơi xoay nhẹ từ trên xuống, mỗi cánh có độ trong suốt khác nhau, gió nhẹ đẩy sang phải
**Ảnh:** Nổi giữa màn hình như đóng khung trong khung vàng ánh, xoay chậm khi cuộn
**Caption:** Chữ xuất hiện theo kiểu fade-in màu vàng hồng, font serif lãng mạn
**Âm nhạc:** Nút nhạc hình nốt nhạc vàng góc dưới

---

### 2. Sakura
**Nhóm:** Lãng mạn / Tình yêu
**Vibe:** Mùa xuân Nhật Bản, ngồi dưới gốc anh đào
**Background:** Bầu trời gradient hồng nhạt → tím pastel → xanh lam lúc hoàng hôn
**Animation:** Hoa anh đào 5 cánh (geometry 3D mỏng) rơi lượn nhẹ, một số bay lên khi rơi gặp gió, tốc độ mỗi cánh khác nhau
**Ảnh:** Trải dọc theo trục Z, fly-through khi cuộn — cảm giác đang bay qua rừng hoa
**Caption:** Chữ Nhật hoặc tiếng Việt, font mỏng, màu trắng mờ
**Điểm đặc biệt:** Khi hover vào ảnh, hoa anh đào xung quanh ảnh đó bay ra tứ phía

---

### 3. Candle
**Nhóm:** Lãng mạn / Tình yêu
**Vibe:** Bữa tối lãng mạn, kỷ niệm ấm áp
**Background:** Nền tối gần như đen, ánh sáng cam ấm tỏa ra từ trung tâm như ngọn nến
**Animation:** 3–5 ngọn nến 3D thắp sáng, ngọn lửa dao động nhẹ theo Perlin noise, bóng nến đổ lên tường phía sau
**Ảnh:** Xuất hiện trong vùng ánh sáng nến — khi lại gần mới thấy rõ, xa thì mờ dần như trong bóng tối
**Caption:** Chữ viết tay, màu vàng cam, như được viết bằng ánh lửa
**Điểm đặc biệt:** Thổi vào mic → nến tắt → màn hình tối hẳn rồi sáng lại (Web Audio API)

---

### 4. Heartbeat
**Nhóm:** Lãng mạn / Tình yêu
**Vibe:** Tình yêu đang đập, nhịp tim của hai người
**Background:** Nền đen, đường ECG tim chạy ngang màn hình màu đỏ phát sáng
**Animation:** Mỗi khi đường tim đập (peak), một ảnh bung ra từ điểm đó và nổi lên, sau đó từ từ tan dần
**Ảnh:** Bay lên như bong bóng sau mỗi nhịp đập, kích thước và vị trí ngẫu nhiên
**Caption:** Hiện ra giữa nhịp — chữ đập theo nhịp tim
**Điểm đặc biệt:** Tốc độ nhịp tim thay đổi theo BPM của bài nhạc đang phát

---

### 5. Firefly
**Nhóm:** Huyền bí / Ma thuật
**Vibe:** Đêm hè ở làng quê, ngồi ngoài sân ngắm đom đóm
**Background:** Rừng cây tối, silhouette cây đen trên nền xanh đen huyền bí
**Animation:** 200–400 đom đóm (điểm sáng nhỏ màu vàng-xanh) bay lơ lửng, nhấp nháy ngẫu nhiên, bay theo đường cong sin
**Ảnh:** Xuất hiện khi nhiều đom đóm tụ lại một chỗ và tạo thành khung ảnh bằng ánh sáng
**Caption:** Chữ sáng lên như đom đóm, từng chữ một
**Điểm đặc biệt:** Click vào màn hình → đom đóm tụ lại chỗ click rồi tan ra

---

### 6. Aurora
**Nhóm:** Huyền bí / Ma thuật
**Vibe:** Bắc Cực huyền bí, đêm trắng Iceland
**Background:** Bầu trời đêm đen với dải cực quang xanh lá → xanh dương → tím chảy dọc ngang
**Animation:** Shader GLSL tạo cực quang sóng mềm mại, chuyển màu liên tục, phản chiếu xuống mặt tuyết phía dưới
**Ảnh:** Trôi trong dải cực quang như bị cuốn vào luồng ánh sáng, nghiêng nhẹ theo dòng chảy
**Caption:** Màu trắng lạnh, font sans-serif mỏng, fade từ trái sang
**Điểm đặc biệt:** Màu cực quang thay đổi theo theme màu của galaxy (dùng themeId)

---

### 7. Lantern
**Nhóm:** Huyền bí / Ma thuật
**Vibe:** Tết Nguyên Tiêu, thả đèn hoa đăng trên sông
**Background:** Bầu trời đêm tím than, mặt sông phản chiếu ánh đèn ở phía dưới
**Animation:** Đèn lồng đỏ/vàng/hồng từ từ bay lên trời, lung linh nhẹ, phát ánh sáng ấm xung quanh
**Ảnh:** Mỗi đèn lồng chứa một ảnh bên trong — khi click vào đèn thì ảnh phóng to ra
**Caption:** Chữ viết theo phong cách thư pháp, cuộn dọc từ dưới lên
**Điểm đặc biệt:** Thêm ảnh mới → một chiếc đèn mới bay lên từ phía dưới

---

### 8. Bubble
**Nhóm:** Huyền bí / Ma thuật
**Vibe:** Phù thủy nhỏ đang xem ký ức trong quả cầu pha lê
**Background:** Nền tím sẫm huyền bí, ngôi sao nhỏ lấp lánh
**Animation:** Bong bóng cầu pha lê trong suốt nổi lên, bên trong mỗi bong bóng là một ảnh bị bẻ cong theo hình cầu (sphere mapping)
**Ảnh:** Chiếu lên mặt trong bong bóng hình cầu, méo nhẹ như ảnh phản chiếu
**Caption:** Chữ xuất hiện như khói từ vạc phù thủy
**Điểm đặc biệt:** Bong bóng nổi chậm, hover thì dừng và sáng lên, click thì vỡ và ảnh hiện full

---

### 9. Portal
**Nhóm:** Huyền bí / Ma thuật
**Vibe:** Du hành thời gian, cổng ký ức
**Background:** Không gian đen, nhiều cổng tròn xoay đồng tâm phát sáng
**Animation:** Cổng tròn quay chậm với hiệu ứng warp, tia sét điện chạy quanh viền, hút ánh sáng vào trong
**Ảnh:** Hiện ra từ trong cổng bay ra về phía người xem, tạo cảm giác depth mạnh
**Caption:** Chữ vỡ ra từ cổng, lắp lại thành từng chữ
**Điểm đặc biệt:** Mỗi ảnh đi kèm timestamp, cổng quay ngược chiều kim đồng hồ khi xem ảnh cũ hơn

---

### 10. Ocean
**Nhóm:** Thiên nhiên
**Vibe:** Lặn biển, ký ức dưới đáy đại dương
**Background:** Gradient xanh dương đậm → xanh ngọc, tia sáng mặt trời xuyên từ trên xuống (caustics)
**Animation:** Bong bóng khí nổi lên, rong biển đung đưa, cá nhỏ bơi qua
**Ảnh:** Nổi như trong bong bóng nước lớn, lung linh theo sóng nước nhẹ
**Caption:** Chữ hiện như chữ nổi trong nước, nhấp nhô theo sóng
**Điểm đặc biệt:** Tiếng sóng biển / tiếng thở của thợ lặn làm ambient sound

---

### 11. Rain
**Nhóm:** Thiên nhiên
**Vibe:** Ngày mưa nhớ người, ngồi nhìn mưa qua cửa kính
**Background:** Nền xám xịt, hạt mưa rơi thẳng nhanh, đọng lại trên kính phía trước
**Animation:** Giọt nước đọng trên kính chảy xuống để lộ ảnh phía sau (kỹ thuật mask), mờ → rõ → mờ
**Ảnh:** Ở phía sau lớp kính mưa, nhìn qua giọt nước — bị distort nhẹ
**Caption:** Chữ mờ nhòe như mực thấm nước
**Điểm đặc biệt:** Có thể dùng chuột "lau kính" để xem ảnh rõ hơn

---

### 12. Snow
**Nhóm:** Thiên nhiên
**Vibe:** Giáng Sinh, mùa đông ấm áp bên gia đình
**Background:** Nền xanh đen đêm đông, ánh đèn ấm từ phía xa
**Animation:** Tuyết rơi nhẹ nhàng, kích thước hạt tuyết khác nhau (parallax), đọng lại ở đáy màn hình
**Ảnh:** Đóng khung như thiệp Giáng Sinh, có viền tuyết đọng xung quanh
**Caption:** Font chữ mập tròn, màu đỏ/xanh/vàng
**Điểm đặc biệt:** Toggle "snow globe" — lắc màn hình (gyroscope) tuyết bay tung tóe

---

### 13. Forest
**Nhóm:** Thiên nhiên
**Vibe:** Picnic trong rừng, đi dạo rừng mùa thu
**Background:** Rừng cây 3D nhìn từ dưới lên (tree canopy), lá vàng cam đỏ
**Animation:** Lá rừng rơi xoay nhẹ, ánh sáng mặt trời xuyên qua tán lá (god rays)
**Ảnh:** Gắn lên thân cây như đang căng dây và kẹp ảnh, đung đưa nhẹ theo gió
**Caption:** Khắc vào thân cây (text với texture gỗ)
**Điểm đặc biệt:** Kéo sang trái/phải để di chuyển trong rừng, ảnh bố trí dọc đường mòn

---

### 14. Butterfly
**Nhóm:** Thiên nhiên
**Vibe:** Mùa xuân, vườn hoa đầy bướm
**Background:** Vườn hoa xanh mờ, ánh sáng ban mai nhẹ nhàng
**Animation:** Bướm 3D với cánh vỗ (wing flap animation), bay theo đường cong ngẫu nhiên, cánh phát ra bụi phấn lấp lánh
**Ảnh:** Đặt trên nền hoa, bướm bay xung quanh và đậu lên góc ảnh
**Caption:** Nhẹ nhàng như cánh bướm, font cursive thanh mảnh
**Điểm đặc biệt:** Hover vào ảnh → bướm đổ về đậu kín xung quanh ảnh đó

---

### 15. Dandelion
**Nhóm:** Thiên nhiên
**Vibe:** Thổi bồ công anh và ước, khoảnh khắc tự do
**Background:** Đồng cỏ xanh nhạt, bầu trời trong xanh
**Animation:** Hàng ngàn sợi tơ bồ công anh bay trong gió, mỗi sợi có một hạt nhỏ ở đầu
**Ảnh:** Thu nhỏ gắn vào hạt bồ công anh — khi bay lại gần camera thì phóng to ra
**Caption:** Chữ tan ra thành sợi tơ bay
**Điểm đặc biệt:** Click → thổi một làn bồ công anh, ảnh theo đó bay sang vị trí mới

---

### 16. Nebula
**Nhóm:** Không gian
**Vibe:** Tinh vân vũ trụ, màu sắc rực rỡ hơn Galaxy
**Background:** Mây khí nhiều màu — đỏ, cam, xanh — shader volumetric fog
**Animation:** Mây tinh vân chuyển động chậm như thở, hạt bụi vũ trụ lấp lánh bên trong
**Ảnh:** Nổi trong mây tinh vân, viền sáng hào quang theo màu tinh vân xung quanh
**Caption:** Font khoa học viễn tưởng, màu cyan
**Điểm đặc biệt:** Tên galaxy và tên ảnh hiện như tọa độ thiên văn

---

### 17. Blackhole
**Nhóm:** Không gian
**Vibe:** Kéo ký ức vào hố đen, dramatic và ấn tượng
**Background:** Không gian đen tuyền, vòng accretion disk phát sáng cam vàng xung quanh hố đen
**Animation:** Ánh sáng bị bẻ cong (gravitational lensing shader), ảnh bị kéo vào vòng xoáy rồi thoát ra phía bên kia
**Ảnh:** Bay quanh hố đen theo quỹ đạo, bị kéo dài và bóp méo khi lại gần
**Caption:** Chữ bị kéo dài theo chiều hướng tâm
**Điểm đặc biệt:** Click vào hố đen → ảnh bị hút vào và hiện toàn màn hình

---

### 18. Comet
**Nhóm:** Không gian
**Vibe:** Sao chổi xuất hiện một lần trong đời, khoảnh khắc hiếm có
**Background:** Bầu trời đêm đầy sao, dải Ngân Hà mờ phía sau
**Animation:** Sao chổi 3D bay qua với đuôi sáng dài kéo theo, hạt bụi đuôi sao phát sáng
**Ảnh:** Gắn trên đuôi sao chổi — khi sao đi qua thì kéo theo ảnh
**Caption:** Chữ vệt sáng như đuôi sao
**Điểm đặc biệt:** Mỗi lần vào trang sao chổi bay theo một hướng khác nhau

---

### 19. Polaroid
**Nhóm:** Vintage
**Vibe:** Album ảnh ngày xưa, chụp bằng máy phim
**Background:** Nền gỗ hoặc vải bố thô, ánh đèn bàn vàng ấm
**Animation:** Ảnh rơi xuống như in Polaroid — trắng trắng rồi từ từ hiện màu, nghiêng ngả mỗi cái một góc
**Ảnh:** Khung Polaroid trắng, bên dưới có thể viết caption tay
**Caption:** Chữ viết tay bằng bút dạ xanh, nghiêng nhẹ
**Điểm đặc biệt:** Lắc ảnh (click giữ + lắc) để nó hiện màu nhanh hơn

---

### 20. Film
**Nhóm:** Vintage
**Vibe:** Chiếu phim cũ, rạp chiếu bóng hoài niệm
**Background:** Nền đen, hạt nhiễu film (grain) chạy liên tục, đường kẻ dọc thỉnh thoảng chạy qua
**Animation:** Cuộn phim chạy qua, sprocket holes (lỗ film) hai bên, ảnh là từng frame của cuộn phim
**Ảnh:** Giống frame film đen trắng hoặc sepia, khi dừng lại thì lên màu
**Caption:** Phụ đề như phim câm ngày xưa — text card đen trắng
**Điểm đặc biệt:** Tiếng máy chiếu phim cũ, flicker ánh sáng nhẹ

---

### 21. Newspaper
**Nhóm:** Vintage
**Vibe:** Tin tức đặc biệt, kỷ niệm đáng được đăng báo
**Background:** Giấy báo vàng ố, texture giấy thô ráp
**Animation:** Trang báo bay lật trong gió, ảnh in trên tờ báo như ảnh thời sự
**Ảnh:** In trên tờ báo, có caption bên dưới kiểu headline báo
**Caption:** Font chữ báo cổ điển, bold, all-caps
**Điểm đặc biệt:** Caption/tên galaxy hiện như tiêu đề trang nhất tờ báo

---

### 22. Typewriter
**Nhóm:** Vintage
**Vibe:** Nhà văn đang viết hồi ký, gõ từng kỷ niệm ra
**Background:** Bàn gỗ tối, ánh đèn bàn, tờ giấy trắng trong máy đánh chữ
**Animation:** Chữ gõ ra từng ký tự có âm thanh "clack", ảnh dán lên tờ giấy như ảnh trong nhật ký
**Ảnh:** Dán nghiêng trên trang giấy, cạnh hơi nhàu, góc có băng dính vàng
**Caption:** Gõ ra từng chữ theo animation typewriter
**Điểm đặc biệt:** Mỗi ảnh trong một "trang nhật ký" riêng, cuộn sang trang mới để xem tiếp

---

### 23. Confetti
**Nhóm:** Lễ hội
**Vibe:** Sinh nhật, kỷ niệm, lễ tốt nghiệp
**Background:** Nền trắng hoặc gradient pastel sáng
**Animation:** Kim tuyến đủ màu rơi xoay, ribbon dài cuộn theo gió, popper bắn ra từ hai bên
**Ảnh:** Nổi ở trung tâm trong vòng kim tuyến, viền ảnh có màu sắc tươi vui
**Caption:** Chữ bóng bay, màu sắc, font tròn vui vẻ
**Điểm đặc biệt:** Click → confetti popper bắn ra từ vị trí click

---

### 24. Firework
**Nhóm:** Lễ hội
**Vibe:** Giao thừa, kỷ niệm lớn, màn pháo hoa cuối năm
**Background:** Nền đêm đen tuyền, thành phố silhouette phía dưới
**Animation:** Pháo hoa 3D nổ theo nhiều hình — tròn, sao, tim — mỗi vụ nổ là một ảnh được tạo thành từ các hạt sáng
**Ảnh:** Mỗi ảnh được "bắn" lên như pháo hoa và nổ ra thành hình ảnh bằng particles
**Caption:** Chữ nổ ra như pháo hoa chữ
**Điểm đặc biệt:** Bấm để bắn pháo hoa, mỗi phát hiện một ảnh mới

---

### 25. Christmas
**Nhóm:** Lễ hội
**Vibe:** Giáng Sinh, quây quần bên gia đình
**Background:** Phòng khách ấm, cây thông Noel đầy đèn nhấp nháy, lò sưởi
**Animation:** Tuyết rơi ngoài cửa sổ, đèn trên cây thông nhấp nháy, tất Giáng Sinh treo trên lò sưởi
**Ảnh:** Treo trên cây thông như quả châu Noel, xoay chậm
**Caption:** Font Giáng Sinh, màu đỏ xanh vàng
**Điểm đặc biệt:** Click vào tất trên lò sưởi → ảnh rơi ra như quà tặng

---

### 26. Mid-Autumn
**Nhóm:** Lễ hội
**Vibe:** Tết Trung Thu, trăng rằm, đèn lồng
**Background:** Bầu trời đêm với trăng tròn lớn vàng rực, mây nhẹ trôi qua
**Animation:** Đèn lồng ngôi sao / cá chép truyền thống bay lên trời, ánh trăng chiếu xuống mặt ao
**Ảnh:** Bên trong đèn lồng phát sáng, hoặc phản chiếu trên mặt ao dưới ánh trăng
**Caption:** Chữ thư pháp, màu vàng, font cổ điển Á Đông
**Điểm đặc biệt:** Có thể nghe nhạc Trung Thu truyền thống

---

### 27. Neon
**Nhóm:** Hiện đại
**Vibe:** Tokyo về đêm, Cyberpunk, Blade Runner
**Background:** Nền đen, mưa neon, phản chiếu ánh đèn trên vỉa hè ướt
**Animation:** Đường neon màu hồng/xanh/tím chạy quanh ảnh như khung viền điện tử, tia sét nhỏ phóng qua
**Ảnh:** Khung neon phát sáng, màu ảnh shift về tông lạnh/neon
**Caption:** Font pixel hoặc LED bảng điện tử, màu cyan
**Điểm đặc biệt:** Hiệu ứng scan line và chromatic aberration nhẹ

---

### 28. Glitch
**Nhóm:** Hiện đại
**Vibe:** Lỗi hệ thống, ký ức bị vỡ rồi ráp lại
**Background:** Nền đen, sọc nhiễu RGB chạy ngang, pixel vỡ lung tung
**Animation:** Ảnh bị glitch — vỡ thành các mảnh pixel màu RGB rồi ráp lại, thỉnh thoảng ghost image xuất hiện lệch màu
**Ảnh:** Bình thường rồi đột nhiên glitch vài giây rồi trở lại
**Caption:** Chữ bị lỗi font, ký tự đặc biệt xen vào rồi sửa lại
**Điểm đặc biệt:** Mức độ glitch tăng khi di chuyển chuột nhanh

---

### 29. Hologram
**Nhóm:** Hiện đại
**Vibe:** Tương lai, Iron Man, gọi video hologram
**Background:** Nền đen/tối, lưới kỹ thuật số mờ
**Animation:** Ảnh hiện ra như hologram 3D — màu xanh lam bán trong suốt, scan line từ dưới lên, nhiễu nhẹ
**Ảnh:** Phiên bản hologram xanh của ảnh, thỉnh thoảng flicker
**Caption:** Font kỹ thuật số, chạy chữ như terminal
**Điểm đặc biệt:** Xoay hologram 360° bằng chuột

---

### 30. Liquid
**Nhóm:** Hiện đại
**Vibe:** Nghệ thuật, sơn chảy trong nước, Ebru art
**Background:** Nền trắng / đen, màu sơn loang ra như mực trong nước
**Animation:** Màu sắc chảy lỏng liên tục (fluid simulation), mỗi màu là một ảnh — khi hai màu gặp nhau thì ảnh hiện ra tại điểm giao
**Ảnh:** Xuất hiện trong vùng màu sắc giao thoa, bị bao quanh bởi màu sơn loang
**Caption:** Chữ hiện lên như mực đổ vào nước, loang ra
**Điểm đặc biệt:** Click vào màn hình → đổ thêm màu mới, ảnh tiếp theo hiện ra

---

## Ghi chú kỹ thuật

Để thêm template mới vào hệ thống:
1. Tạo folder `public/<tên-template>/` với `index.html` + `js/` (+ `css/` nếu cần)
2. Thêm tên vào `enum` trong `models/galaxy.js`
3. Đăng ký HTML trong object `TEMPLATE_HTML` ở `index.js`
4. Build JS bằng Vite nếu dùng Three.js (xem cấu trúc `fall` hoặc `galaxy-moon`)
