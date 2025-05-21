let voteChartInstance = null;

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

// --- Trò chơi 1: Bình chọn ---
async function showGame1() {
    document.querySelectorAll('.game-section > div').forEach(div => div.style.display = 'none');
    document.getElementById('game1-content').style.display = 'block';

    const voteRecordsData = await fetchData('vote_records.json');
    const votingRefData = await fetchData('voting_ref.json');

    if (!voteRecordsData || !votingRefData) {
        alert('Không thể tải dữ liệu cho trò chơi 1.');
        return;
    }

    const voteCounts = {};
    voteRecordsData.records.vote.forEach(record => {
        for (let i = 1; i <= 3; i++) {
            const nomineeAggregate = record[`nominee_${i}`];
            const idMatch = nomineeAggregate.match(/^ID(\d+)/);
            if (idMatch) {
                const id = `ID${idMatch[1]}`;
                voteCounts[id] = (voteCounts[id] || 0) + 1;
            }
        }
    });

    // Sắp xếp theo số phiếu giảm dần
    const sortedNominees = Object.entries(voteCounts).sort(([, countA], [, countB]) => countB - countA);

    const labels = [];
    const data = [];
    const backgroundColors = [];

    // Tạo màu sắc gradient từ nóng sang lạnh
    const hotColor = [255, 0, 0]; // Red
    const coldColor = [0, 0, 255]; // Blue

    sortedNominees.forEach(([id, count], index) => {
        const nomineeInfo = votingRefData.voting_ref.nominee.find(n => n.aggregate.startsWith(id));
        if (nomineeInfo) {
            labels.push(nomineeInfo.name);
            data.push(count);

            // Tính toán màu dựa trên vị trí
            const ratio = index / (sortedNominees.length - 1);
            const r = Math.round(hotColor[0] + ratio * (coldColor[0] - hotColor[0]));
            const g = Math.round(hotColor[1] + ratio * (coldColor[1] - hotColor[1]));
            const b = Math.round(hotColor[2] + ratio * (coldColor[2] - hotColor[2]));
            backgroundColors.push(`rgb(${r}, ${g}, ${b})`);
        }
    });

    const ctx = document.getElementById('voteChart').getContext('2d');
    if (voteChartInstance) {
        voteChartInstance.destroy(); // Hủy biểu đồ cũ nếu có
    }
    voteChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Số phiếu bầu',
                data: data,
                backgroundColor: backgroundColors,
                borderColor: backgroundColors.map(color => color.replace('rgb', 'rgba').replace(')', ', 1)')),
                borderWidth: 1
            }]
        },
        options: {
            indexAxis: 'y', // Biểu đồ bar ngang
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Số phiếu bầu'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Người được bình chọn'
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });

    // Công bố người thắng cuộc
    const maxVotes = data.length > 0 ? Math.max(...data) : 0;
    const winners = [];
    sortedNominees.forEach(([id, count]) => {
        if (count === maxVotes) {
            const nomineeInfo = votingRefData.voting_ref.nominee.find(n => n.aggregate.startsWith(id));
            if (nomineeInfo) {
                winners.push(nomineeInfo);
            }
        }
    });
    displayWinners('game1-winners', winners);
}

// --- Trò chơi 2: Con số may mắn ---
async function showGame2() {
    document.querySelectorAll('.game-section > div').forEach(div => div.style.display = 'none');
    document.getElementById('game2-content').style.display = 'block';
    document.getElementById('game2-winners').innerHTML = ''; // Clear previous winners
}

async function calculateLuckyNumber() {
    const jackpot1Numbers = [];
    for (let i = 1; i <= 6; i++) {
        const num = parseInt(document.getElementById(`jackpot1_${i}`).value);
        if (isNaN(num) || num < 1 || num > 99) {
            alert('Vui lòng nhập 6 số Jackpot 1 hợp lệ (từ 1 đến 99).');
            return;
        }
        jackpot1Numbers.push(num);
    }
    const jackpot2Number = parseInt(document.getElementById('jackpot2').value);
    if (isNaN(jackpot2Number) || jackpot2Number < 1 || jackpot2Number > 99) {
        alert('Vui lòng nhập số Jackpot 2 hợp lệ (từ 1 đến 99).');
        return;
    }

    const allNumbers = [...jackpot1Numbers, jackpot2Number].sort((a, b) => a - b);
    const sortedJackpot2Number = allNumbers.indexOf(jackpot2Number) + 1; // Vị trí của số jackpot2 trong dãy đã sắp xếp

    // Tính bách phân vị của số Jackpot 2
    const percentileRank = (sortedJackpot2Number / allNumbers.length) * 100;
    const roundedPercentileRank = Math.round(percentileRank); // Làm tròn đến %

    console.log("All numbers (sorted):", allNumbers);
    console.log("Jackpot 2 number:", jackpot2Number);
    console.log("Percentile Rank:", percentileRank);
    console.log("Rounded Percentile Rank:", roundedPercentileRank);

    const luckyNumberData = await fetchData('lucky_number.json');
    if (!luckyNumberData) {
        alert('Không thể tải dữ liệu số may mắn.');
        return;
    }

    const luckyNumbers = luckyNumberData.lucky_number.nominee.map(n => parseInt(n.lucky_number)).sort((a, b) => a - b);

    // Tính giá trị bách phân vị tương ứng trong chuỗi lucky numbers
    let calculatedLuckyNumberValue = 0;
    if (luckyNumbers.length > 0) {
        const index = Math.floor((roundedPercentileRank / 100) * (luckyNumbers.length - 1));
        calculatedLuckyNumberValue = luckyNumbers[index];
    }
    console.log("Lucky Numbers (sorted):", luckyNumbers);
    console.log("Calculated Lucky Number Value (Percentile based):", calculatedLuckyNumberValue);

    // Xác định số may mắn là số lớn nhất nhỏ hơn hoặc bằng giá trị bách phân vị đã tính ra
    let finalLuckyNumber = 0;
    for (let i = luckyNumbers.length - 1; i >= 0; i--) {
        if (luckyNumbers[i] <= calculatedLuckyNumberValue) {
            finalLuckyNumber = luckyNumbers[i];
            break;
        }
    }

    // Nếu không tìm thấy số nào nhỏ hơn hoặc bằng, lấy số nhỏ nhất trong danh sách luckyNumbers
    if (finalLuckyNumber === 0 && luckyNumbers.length > 0) {
        finalLuckyNumber = luckyNumbers[0];
    }

    console.log("Final Lucky Number (largest <= calculated percentile value):", finalLuckyNumber);

    const winners = luckyNumberData.lucky_number.nominee.filter(n => parseInt(n.lucky_number) === finalLuckyNumber);
    displayWinners('game2-winners', winners);
}

// --- Trò chơi 3: Quay số ngẫu nhiên ---
async function showGame3() {
    document.querySelectorAll('.game-section > div').forEach(div => div.style.display = 'none');
    document.getElementById('game3-content').style.display = 'block';
    document.getElementById('game3-winner').innerHTML = ''; // Clear previous winner
}

async function drawGrandPrize() {
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

    const randomIndex = Math.floor(Math.random() * nominees.length);
    const winner = [nominees[randomIndex]]; // Wrap in array for displayWinners function

    displayWinners('game3-winner', winner);
}

// Ẩn tất cả các nội dung trò chơi khi tải trang
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.game-section > div').forEach(div => div.style.display = 'none');
});