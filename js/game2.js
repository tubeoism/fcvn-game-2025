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

// Hàm kiểm tra và giới hạn giá trị input, không còn padZero
function validateInput(input) {
    let value = parseInt(input.value, 10);
    if (isNaN(value)) {
        input.value = ''; // Xóa giá trị nếu không phải số
    } else {
        if (value < input.min) value = parseInt(input.min, 10);
        if (value > input.max) value = parseInt(input.max, 10);
        input.value = value; // Gán lại giá trị đã giới hạn
    }
}


async function calculateLuckyNumber() {
    const jackpot1Inputs = [];
    for (let i = 1; i <= 6; i++) {
        const inputElement = document.getElementById(`jackpot1_${i}`);
        const num = parseInt(inputElement.value, 10);
        if (isNaN(num) || num < 1 || num > 55) {
            alert('Vui lòng nhập 6 số Jackpot 1 hợp lệ (từ 1 đến 55).');
            inputElement.focus();
            return;
        }
        jackpot1Inputs.push(num);
    }

    const jackpot2InputElement = document.getElementById('jackpot2');
    const jackpot2Number = parseInt(jackpot2InputElement.value, 10);
    if (isNaN(jackpot2Number) || jackpot2Number < 1 || jackpot2Number > 55) {
        alert('Vui lòng nhập số Jackpot 2 hợp lệ (từ 1 đến 55).');
        jackpot2InputElement.focus();
        return;
    }

    const allNumbersInput = [...jackpot1Inputs, jackpot2Number];

    // Kiểm tra các số có khác nhau không
    const uniqueNumbers = new Set(allNumbersInput);
    if (uniqueNumbers.size !== 7) {
        alert('Vui lòng nhập 7 số khác nhau.');
        return;
    }

    const allNumbers = [...allNumbersInput].sort((a, b) => a - b);
    
    // Hiển thị bộ 7 số đã nhập
    document.getElementById('entered-numbers').textContent = allNumbersInput.join(', ');
    document.getElementById('jackpot2-display').textContent = jackpot2Number;


    // Tính bách phân vị của số Jackpot 2
    let L = 0; // Số lượng giá trị nhỏ hơn X
    let E = 0; // Số lượng giá trị bằng X (số lượng lần xuất hiện của Jackpot2Number trong allNumbersInput)
    
    // Đếm số lượng L và E
    for (let i = 0; i < allNumbers.length; i++) {
        if (allNumbers[i] < jackpot2Number) {
            L++;
        } else if (allNumbers[i] === jackpot2Number) {
            E++;
        }
    }
    
    const percentileRank = ((L + 0.5 * E) / allNumbers.length) * 100;
    const roundedPercentileRank = Math.round(percentileRank); // Làm tròn đến %

    document.getElementById('percentile-rank-display').textContent = roundedPercentileRank;


    const luckyNumberData = await fetchData('lucky_number.json');
    if (!luckyNumberData) {
        alert('Không thể tải dữ liệu số may mắn.');
        return;
    }

    const luckyNumbers = luckyNumberData.lucky_number.nominee.map(n => parseInt(n.lucky_number)).sort((a, b) => a - b);

    // Tính giá trị bách phân vị tương ứng trong chuỗi lucky numbers
    let calculatedLuckyNumberValue = 0;
    if (luckyNumbers.length > 0) {
        // Áp dụng công thức index = (K/100) * (N-1)
        const indexFloat = (roundedPercentileRank / 100) * (luckyNumbers.length - 1);
        const indexLower = Math.floor(indexFloat);
        const indexUpper = Math.ceil(indexFloat);

        if (indexLower === indexUpper) {
            calculatedLuckyNumberValue = luckyNumbers[indexLower];
        } else {
            // Nội suy tuyến tính nếu cần chính xác hơn (ví dụ: bách phân vị rơi giữa 2 số)
            // Tuy nhiên, đề bài chỉ cần "số lớn nhất nhỏ hơn giá trị bách phân vị đã tính ra"
            // Nên ta có thể lấy giá trị của indexLower
            calculatedLuckyNumberValue = luckyNumbers[indexLower];
        }
    }
    
    document.getElementById('calculated-lucky-value-display').textContent = calculatedLuckyNumberValue;


    // Xác định số may mắn là số lớn nhất nhỏ hơn hoặc bằng giá trị bách phân vị đã tính ra.
    let finalLuckyNumber = null;
    for (let i = luckyNumbers.length - 1; i >= 0; i--) {
        if (luckyNumbers[i] <= calculatedLuckyNumberValue) {
            finalLuckyNumber = luckyNumbers[i];
            break;
        }
    }

    if (finalLuckyNumber === null && luckyNumbers.length > 0) {
        finalLuckyNumber = luckyNumbers[0]; // Nếu không tìm thấy số nào <= calculatedLuckyNumberValue, lấy số nhỏ nhất
    } else if (finalLuckyNumber === null) {
        finalLuckyNumber = 0; // Hoặc một giá trị mặc định khác nếu luckyNumbers rỗng
    }

    document.getElementById('final-lucky-number-display').textContent = finalLuckyNumber;
    document.getElementById('calculation-details').style.display = 'block'; // Hiển thị chi tiết tính toán

    const winners = luckyNumberData.lucky_number.nominee.filter(n => parseInt(n.lucky_number) === finalLuckyNumber);
    displayWinners('game2-winners', winners);
}