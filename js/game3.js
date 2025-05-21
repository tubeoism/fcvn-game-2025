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

async function drawGrandPrize() {
    const grandPrizeData = await fetchData('grand_prize.json'); //
    if (!grandPrizeData) {
        alert('Không thể tải dữ liệu giải thưởng lớn.');
        return;
    }

    const nominees = grandPrizeData.grand_prize.nominee; //
    if (nominees.length === 0) {
        alert('Không có ứng viên cho giải thưởng lớn.');
        return;
    }

    const randomIndex = Math.floor(Math.random() * nominees.length);
    const winner = [nominees[randomIndex]]; // Wrap in array for displayWinners function

    displayWinners('game3-winner', winner);
}