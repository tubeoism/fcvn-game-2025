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

// Hàm mới để thêm số 0 vào trước nếu giá trị chỉ có 1 chữ số
function padZero(input) {
    let value = parseInt(input.value, 10);
    if (!isNaN(value)) {
        if (value < 0) value = 0; // Đảm bảo không âm
        if (value > 99) value = 99; // Đảm bảo không quá 99
        input.value = value.toString().padStart(2, '0');
    } else {
        input.value = '00'; // Đặt về 00 nếu không phải số
    }
}

async function calculateLuckyNumber() {
    const jackpot1Numbers = [];
    for (let i = 1; i <= 6; i++) {
        const num = parseInt(document.getElementById(`jackpot1_${i}`).value);
        if (isNaN(num)) {
            alert('Vui lòng nhập 6 số Jackpot 1 hợp lệ (từ 00 đến 99).');
            return;
        }
        jackpot1Numbers.push(num);
    }
    const jackpot2Number = parseInt(document.getElementById('jackpot2').value);
    if (isNaN(jackpot2Number)) {
        alert('Vui lòng nhập số Jackpot 2 hợp lệ (từ 00 đến 99).');
        return;
    }

    const allNumbers = [...jackpot1Numbers, jackpot2Number].sort((a, b) => a - b);
    
    // Tính bách phân vị của số Jackpot 2
    let L = 0; // Số lượng giá trị nhỏ hơn X
    let E = 0; // Số lượng giá trị bằng X
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

    const luckyNumberData = await fetchData('lucky_number.json');
    if (!luckyNumberData) {
        alert('Không thể tải dữ liệu số may mắn.');
        return;
    }

    const luckyNumbers = luckyNumberData.lucky_number.nominee.map(n => parseInt(n.lucky_number)).sort((a, b) => a - b);

    // Tính giá trị bách phân vị tương ứng trong chuỗi lucky numbers
    let calculatedLuckyNumberValue = 0;
    if (luckyNumbers.length > 0) {
        const indexFloat = (roundedPercentileRank / 100) * (luckyNumbers.length - 1);
        const index = Math.floor(indexFloat); // Lấy giá trị thấp hơn hoặc bằng

        if (index >= 0 && index < luckyNumbers.length) {
            calculatedLuckyNumberValue = luckyNumbers[index];
        } else if (index < 0) { // Nếu bách phân vị quá thấp, lấy số nhỏ nhất
            calculatedLuckyNumberValue = luckyNumbers[0];
        } else { // Nếu bách phân vị quá cao, lấy số lớn nhất
            calculatedLuckyNumberValue = luckyNumbers[luckyNumbers.length - 1];
        }
    }
    console.log("Lucky Numbers (sorted):", luckyNumbers);
    console.log("Calculated Lucky Number Value (Percentile based, initial guess):", calculatedLuckyNumberValue);

    // Xác định số may mắn là số lớn nhất nhỏ hơn hoặc bằng giá trị bách phân vị đã tính ra.
    let finalLuckyNumber = null;
    for (let i = luckyNumbers.length - 1; i >= 0; i--) {
        if (luckyNumbers[i] <= finalLuckyNumber) { // Changed to <= calculatedLuckyNumberValue
            finalLuckyNumber = luckyNumbers[i];
            break;
        }
    }

    if (finalLuckyNumber === null && luckyNumbers.length > 0) {
        finalLuckyNumber = luckyNumbers[0]; // Nếu không tìm thấy số nào <= calculatedLuckyNumberValue, lấy số nhỏ nhất
    } else if (finalLuckyNumber === null) {
        finalLuckyNumber = 0; // Hoặc một giá trị mặc định khác nếu luckyNumbers rỗng
    }

    console.log("Final Lucky Number (largest <= calculated percentile value):", finalLuckyNumber);

    const winners = luckyNumberData.lucky_number.nominee.filter(n => parseInt(n.lucky_number) === finalLuckyNumber);
    displayWinners('game2-winners', winners);
}