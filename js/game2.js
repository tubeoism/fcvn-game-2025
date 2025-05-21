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
    const sortedJackpot2NumberPosition = allNumbers.indexOf(jackpot2Number); // Vị trí dựa trên 0-index

    // Tính bách phân vị của số Jackpot 2
    // Công thức rank-based percentile: P = (L + 0.5E) / N * 100
    // L = số lượng giá trị nhỏ hơn X
    // E = số lượng giá trị bằng X
    // N = tổng số giá trị
    let L = 0;
    let E = 0;
    for (let i = 0; i < allNumbers.length; i++) {
        if (allNumbers[i] < jackpot2Number) {
            L++;
        } else if (allNumbers[i] === jackpot2Number) {
            E++;
        }
    }

    const percentileRank = ((L + 0.5 * E) / allNumbers.length) * 100;
    const roundedPercentileRank = Math.round(percentileRank); // Làm tròn đến %

    console.log("All numbers (sorted):", allNumbers);
    console.log("Jackpot 2 number:", jackpot2Number);
    console.log("L (less than X):", L);
    console.log("E (equal to X):", E);
    console.log("Percentile Rank (raw):", percentileRank);
    console.log("Rounded Percentile Rank:", roundedPercentileRank);

    const luckyNumberData = await fetchData('lucky_number.json'); //
    if (!luckyNumberData) {
        alert('Không thể tải dữ liệu số may mắn.');
        return;
    }

    const luckyNumbers = luckyNumberData.lucky_number.nominee.map(n => parseInt(n.lucky_number)).sort((a, b) => a - b); //

    // Tính giá trị bách phân vị tương ứng trong chuỗi lucky numbers
    let calculatedLuckyNumberValue = 0;
    if (luckyNumbers.length > 0) {
        // Sử dụng công thức để tìm giá trị tại bách phân vị K: index = (K/100) * (N-1)
        const indexFloat = (roundedPercentileRank / 100) * (luckyNumbers.length - 1);
        const indexLower = Math.floor(indexFloat);
        const indexUpper = Math.ceil(indexFloat);

        if (indexLower === indexUpper) {
            calculatedLuckyNumberValue = luckyNumbers[indexLower];
        } else {
            // Nội suy tuyến tính (nếu cần độ chính xác cao hơn, nhưng thường chỉ cần lấy giá trị gần nhất)
            // Hiện tại, đề bài không yêu cầu nội suy, chỉ cần "số lớn nhất nhỏ hơn giá trị bách phân vị"
            calculatedLuckyNumberValue = luckyNumbers[indexLower]; // Lấy giá trị thấp hơn
        }
    }
    console.log("Lucky Numbers (sorted):", luckyNumbers);
    console.log("Calculated Lucky Number Value (Percentile based, initial guess):", calculatedLuckyNumberValue);

    // Xác định số may mắn là số lớn nhất nhỏ hơn hoặc bằng giá trị bách phân vị đã tính ra.
    // Duyệt ngược từ cuối danh sách `luckyNumbers` đã sắp xếp để tìm số đầu tiên thỏa mãn.
    let finalLuckyNumber = null;
    for (let i = luckyNumbers.length - 1; i >= 0; i--) {
        if (luckyNumbers[i] <= calculatedLuckyNumberValue) {
            finalLuckyNumber = luckyNumbers[i];
            break;
        }
    }

    // Nếu không tìm thấy số nào nhỏ hơn hoặc bằng giá trị tính toán,
    // và danh sách luckyNumbers có phần tử, lấy phần tử nhỏ nhất.
    if (finalLuckyNumber === null && luckyNumbers.length > 0) {
        finalLuckyNumber = luckyNumbers[0];
    } else if (finalLuckyNumber === null) {
        // Trường hợp luckyNumbers rỗng
        finalLuckyNumber = 0; // Hoặc một giá trị mặc định khác
    }

    console.log("Final Lucky Number (largest <= calculated percentile value):", finalLuckyNumber);

    const winners = luckyNumberData.lucky_number.nominee.filter(n => parseInt(n.lucky_number) === finalLuckyNumber); //
    displayWinners('game2-winners', winners);
}