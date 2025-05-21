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

let spinningInterval = null; // Khởi tạo là null
let currentSpinIndex = 0;
const totalSpinTime = 10000; // Tổng thời gian quay (10 giây)
const initialDelay = 500; // Độ trễ ban đầu giữa các lần chuyển (chậm nhất)
const finalDelay = 50; // Độ trễ cuối cùng giữa các lần chuyển (nhanh nhất)

let nomineesList = []; // Danh sách nominee được tải một lần
let finalWinnerChosen = null; // Lưu người thắng cuộc cuối cùng

async function startSpinning() {
    // Nếu đang quay, không làm gì cả
    if (spinningInterval !== null) {
        return;
    }

    const grandPrizeData = await fetchData('grand_prize.json');
    if (!grandPrizeData) {
        alert('Không thể tải dữ liệu giải thưởng lớn.');
        return;
    }

    nomineesList = grandPrizeData.grand_prize.nominee;
    if (nomineesList.length === 0) {
        alert('Không có ứng viên cho giải thưởng lớn.');
        return;
    }

    // Ẩn kết quả cũ, hiển thị spinning display
    document.getElementById('game3-winner').innerHTML = '';
    document.getElementById('spinning-display').style.display = 'block';
    
    // Vô hiệu hóa nút quay để tránh click nhiều lần
    document.querySelector('.game-section button').disabled = true;

    currentSpinIndex = 0;
    // Chọn người thắng cuộc ngay từ đầu
    finalWinnerChosen = nomineesList[Math.floor(Math.random() * nomineesList.length)];

    let startTime = Date.now();

    function animateSpin() {
        const elapsedTime = Date.now() - startTime;

        if (elapsedTime >= totalSpinTime) {
            // Đã hết thời gian quay, dừng và hiển thị người thắng cuộc
            clearInterval(spinningInterval);
            spinningInterval = null; // Reset interval handle
            displayFinalWinner(finalWinnerChosen);
            return;
        }

        // Tính toán tốc độ dựa trên thời gian đã trôi qua
        // Ánh xạ thời gian từ [0, totalSpinTime] sang khoảng tốc độ [initialDelay, finalDelay]
        let currentDelay;
        const accelerationPhase = 0.1; // 10% thời gian đầu tăng tốc
        const decelerationPhase = 0.1; // 10% thời gian cuối giảm tốc

        if (elapsedTime < totalSpinTime * accelerationPhase) {
            // Tăng tốc: từ initialDelay giảm về finalDelay
            const progress = elapsedTime / (totalSpinTime * accelerationPhase);
            currentDelay = initialDelay - (initialDelay - finalDelay) * progress;
        } else if (elapsedTime > totalSpinTime * (1 - decelerationPhase)) {
            // Giảm tốc: từ finalDelay tăng về initialDelay
            const progress = (elapsedTime - totalSpinTime * (1 - decelerationPhase)) / (totalSpinTime * decelerationPhase);
            currentDelay = finalDelay + (initialDelay - finalDelay) * progress;
        } else {
            // Giữa: tốc độ nhanh nhất
            currentDelay = finalDelay;
        }

        currentDelay = Math.max(finalDelay, Math.min(initialDelay, currentDelay)); // Đảm bảo nằm trong khoảng

        // Cập nhật hiển thị người đang chạy
        const nominee = nomineesList[currentSpinIndex];
        document.getElementById('spinning-img').src = `images/${nominee.thumbnail}`;
        document.getElementById('spinning-name').innerHTML = `<strong>${nominee.name}</strong>`;
        document.getElementById('spinning-department').textContent = nominee.department;
        document.getElementById('spinning-about').textContent = nominee.about;

        currentSpinIndex = (currentSpinIndex + 1) % nomineesList.length;

        // Tính toán độ trễ cho lần gọi tiếp theo
        const nextDelay = Math.round(currentDelay);
        spinningInterval = setTimeout(animateSpin, nextDelay); // Sử dụng setTimeout thay vì setInterval
    }

    // Bắt đầu vòng quay ban đầu
    spinningInterval = setTimeout(animateSpin, initialDelay);
}

function displayFinalWinner(winner) {
    clearInterval(spinningInterval); // Đảm bảo interval/timeout đã dừng
    spinningInterval = null; // Reset handle
    document.getElementById('spinning-display').style.display = 'none'; // Ẩn màn hình quay
    displayWinners('game3-winner', [winner]); // Hiển thị người thắng cuộc cuối cùng
    document.querySelector('.game-section button').disabled = false; // Kích hoạt lại nút quay
}

// Ẩn spinning display khi tải trang ban đầu
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('spinning-display').style.display = 'none';
    document.getElementById('game3-winner').innerHTML = '<p>Nhấn "Quay thưởng" để tìm người may mắn!</p>';
});