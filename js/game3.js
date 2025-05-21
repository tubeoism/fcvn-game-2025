async function fetchData(filename) {
    try {
        const response = await fetch(`data/${filename}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error(`Could not fetch ${filename}:`, error);
        return null;
    }
}

// Hàm chung để hiển thị người thắng cuộc
function displayWinners(containerId, winners) {
    const container = document.getElementById(containerId);
    container.innerHTML = ''; // Clear previous content

    if (winners.length === 0) {
        container.innerHTML = '<p>Chưa có người thắng cuộc hoặc không tìm thấy.</p>';
        return;
    }

    winners.forEach(winner => {
        const winnerCard = document.createElement('div');
        winnerCard.className = 'winner-card';

        const img = document.createElement('img');
        img.src = `images/${winner.thumbnail}`;
        img.alt = winner.name;
        winnerCard.appendChild(img);

        const name = document.createElement('p');
        name.innerHTML = `<strong>${winner.name}</strong>`;
        winnerCard.appendChild(name);

        const department = document.createElement('p');
        department.textContent = winner.department;
        winnerCard.appendChild(department);

        const about = document.createElement('p');
        about.textContent = winner.about;
        winnerCard.appendChild(about);

        container.appendChild(winnerCard);
    });
}

let spinningInterval; // Biến để lưu trữ ID của setInterval
let currentSpinIndex = 0; // Index của người đang hiển thị
let spinSpeed = 100; // Tốc độ ban đầu (milliseconds)
const initialSpeed = 50; // Tốc độ nhanh nhất (mỗi 50ms chuyển 1 người)
const maxSpeed = 500; // Tốc độ chậm nhất (0.5 giây chuyển 1 người) - Điều chỉnh để vòng quay nhanh hơn
const totalSpinTime = 10000; // Tổng thời gian quay (10 giây)
let startTime; // Thời điểm bắt đầu quay

async function startSpinning() {
    const grandPrizeData = await fetchData('grand_prize.json');
    if (!grandPrizeData) {
        alert('Không thể tải dữ liệu giải thưởng lớn.');
        return;
    }

    const nominees = grandPrizeData.grand_prize.nominee;
    if (nominees.length === 0) {
        alert('Không có ứng viên cho giải thưởng lớn.');
        return;
    }

    // Ẩn kết quả cũ, hiển thị spinning display
    document.getElementById('game3-winner').innerHTML = '';
    document.getElementById('spinning-display').style.display = 'block';
    
    // Vô hiệu hóa nút quay để tránh click nhiều lần
    document.querySelector('.game-section button').disabled = true;

    currentSpinIndex = 0;
    spinSpeed = maxSpeed; // Bắt đầu chậm
    startTime = Date.now();

    // Lựa chọn người thắng cuộc cuối cùng (ngẫu nhiên)
    const finalWinnerIndex = Math.floor(Math.random() * nominees.length);

    // Hàm để cập nhật hiển thị người đang chạy
    function updateSpinningDisplay() {
        const elapsedTime = Date.now() - startTime;

        // Tính toán tốc độ: tăng dần trong 10% đầu tiên, giảm dần trong 10% cuối cùng
        let speedProgress = elapsedTime / totalSpinTime; // Tiến độ từ 0 đến 1

        let currentCalculatedSpeed;
        if (speedProgress < 0.1) { // 10% thời gian đầu tiên (tăng tốc)
            // Từ maxSpeed giảm tuyến tính về initialSpeed
            currentCalculatedSpeed = maxSpeed - (maxSpeed - initialSpeed) * (speedProgress / 0.1);
        } else if (speedProgress > 0.9) { // 10% thời gian cuối cùng (giảm tốc)
            // Từ initialSpeed tăng tuyến tính về maxSpeed
            currentCalculatedSpeed = initialSpeed + (maxSpeed - initialSpeed) * ((speedProgress - 0.9) / 0.1);
        } else { // Phần giữa (tốc độ nhanh nhất)
            currentCalculatedSpeed = initialSpeed;
        }
        
        spinSpeed = Math.round(currentCalculatedSpeed); // Làm tròn để tránh số thập phân cho setInterval
        // Đảm bảo tốc độ không quá nhanh hoặc quá chậm so với giới hạn
        spinSpeed = Math.max(initialSpeed, Math.min(maxSpeed, spinSpeed));


        const nominee = nominees[currentSpinIndex];
        document.getElementById('spinning-img').src = `images/${nominee.thumbnail}`;
        document.getElementById('spinning-name').innerHTML = `<strong>${nominee.name}</strong>`;
        document.getElementById('spinning-department').textContent = nominee.department;
        document.getElementById('spinning-about').textContent = nominee.about;

        currentSpinIndex = (currentSpinIndex + 1) % nominees.length; // Chuyển sang người tiếp theo

        // Kiểm tra xem đã đến lúc dừng và hiển thị người thắng cuộc cuối cùng chưa
        if (elapsedTime >= totalSpinTime) {
            clearInterval(spinningInterval); // Dừng quay
            // Đảm bảo dừng ở người thắng cuộc cuối cùng trước khi hiển thị
            const finalNominee = nominees[finalWinnerIndex];
            document.getElementById('spinning-img').src = `images/${finalNominee.thumbnail}`;
            document.getElementById('spinning-name').innerHTML = `<strong>${finalNominee.name}</strong>`;
            document.getElementById('spinning-department').textContent = finalNominee.department;
            document.getElementById('spinning-about').textContent = finalNominee.about;

            // Đợi một chút để người dùng nhìn thấy người cuối cùng trước khi công bố
            setTimeout(() => {
                displayFinalWinner(finalNominee);
            }, maxSpeed * 1.5); // Đợi 1.5 lần tốc độ chậm nhất
            
        } else {
            // Lập lại interval với tốc độ mới
            clearInterval(spinningInterval); // Clear interval cũ
            spinningInterval = setInterval(updateSpinningDisplay, spinSpeed); // Set interval mới với tốc độ cập nhật
        }
    }

    // Bắt đầu vòng quay ban đầu
    spinningInterval = setInterval(updateSpinningDisplay, spinSpeed);
}

function displayFinalWinner(winner) {
    clearInterval(spinningInterval); // Đảm bảo interval đã dừng
    document.getElementById('spinning-display').style.display = 'none'; // Ẩn màn hình quay
    displayWinners('game3-winner', [winner]); // Hiển thị người thắng cuộc cuối cùng
    document.querySelector('.game-section button').disabled = false; // Kích hoạt lại nút quay
}

// Ẩn spinning display khi tải trang ban đầu
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('spinning-display').style.display = 'none';
    document.getElementById('game3-winner').innerHTML = '<p>Nhấn "Quay thưởng" để tìm người may mắn!</p>';
});