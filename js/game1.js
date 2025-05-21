let voteChartInstance = null;
const BAR_HEIGHT = 25; // Chiều cao mong muốn cho mỗi bar

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

async function loadGame1() {
    document.getElementById('game1-content').style.display = 'block';

    const voteRecordsData = await fetchData('vote_records.json'); //
    const votingRefData = await fetchData('voting_ref.json'); //

    if (!voteRecordsData || !votingRefData) {
        alert('Không thể tải dữ liệu cho trò chơi 1.');
        return;
    }

    const voteCounts = {};
    voteRecordsData.records.vote.forEach(record => { //
        for (let i = 1; i <= 3; i++) {
            const nomineeAggregate = record[`nominee_${i}`]; //
            if (nomineeAggregate) { // Đảm bảo nomineeAggregate không null/undefined
                const idMatch = nomineeAggregate.match(/^ID(\d+)/);
                if (idMatch) {
                    const id = `ID${idMatch[1]}`;
                    voteCounts[id] = (voteCounts[id] || 0) + 1;
                }
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
        const nomineeInfo = votingRefData.voting_ref.nominee.find(n => n.aggregate.startsWith(id)); //
        if (nomineeInfo) {
            labels.push(nomineeInfo.name); //
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

    // Tính toán chiều cao canvas dựa trên số lượng bar và chiều cao mong muốn
    const chartHeight = labels.length * BAR_HEIGHT + 100; // 100 là padding/margin cho trục
    ctx.canvas.parentNode.style.height = `${chartHeight}px`;


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
            maintainAspectRatio: false, // Quan trọng để kiểm soát chiều cao
            scales: {
                x: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Số phiếu bầu'
                    },
                    ticks: {
                        precision: 0 // Đảm bảo số nguyên trên trục X
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Người được bình chọn'
                    },
                    barPercentage: 0.8, // Khoảng cách giữa các bar
                    categoryPercentage: 0.8 // Khoảng cách giữa các nhóm bar
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
            const nomineeInfo = votingRefData.voting_ref.nominee.find(n => n.aggregate.startsWith(id)); //
            if (nomineeInfo) {
                winners.push(nomineeInfo);
            }
        }
    });
    displayWinners('game1-winners', winners);
}

// Ẩn nội dung khi tải trang
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('game1-content').style.display = 'none';
});