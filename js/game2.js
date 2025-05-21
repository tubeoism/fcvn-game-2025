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

// Hàm kiểm tra và giới hạn giá trị input
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

    // Sắp xếp các số để tính bách phân vị
    const allNumbersSorted = [...allNumbersInput].sort((a, b) => a - b);
    
    // Hiển thị bộ 7 số đã nhập
    document.getElementById('entered-numbers').textContent = allNumbersInput.join(', ');
    document.getElementById('jackpot2-display').textContent = jackpot2Number;


    // Tính bách phân vị của số Jackpot 2 (theo công thức Rank-Based)
    let L = 0; // Số lượng giá trị trong tập dữ liệu nhỏ hơn X
    let E = 0; // Số lượng giá trị trong tập dữ liệu bằng X (số lượng lần xuất hiện của Jackpot2Number)
    
    // Đếm số lượng L và E
    for (let i = 0; i < allNumbersSorted.length; i++) {
        if (allNumbersSorted[i] < jackpot2Number) {
            L++;
        } else if (allNumbersSorted[i] === jackpot2Number) {
            E++;
        }
    }
    
    const percentileRank = ((L + 0.5 * E) / allNumbersSorted.length) * 100;
    // Làm tròn đến phần vạn (4 chữ số thập phân)
    const roundedPercentileRank = parseFloat(percentileRank.toFixed(4));

    document.getElementById('percentile-rank-display').textContent = roundedPercentileRank;


    const luckyNumberData = await fetchData('lucky_number.json');
    if (!luckyNumberData) {
        alert('Không thể tải dữ liệu số may mắn.');
        return;
    }

    const luckyNumbers = luckyNumberData.lucky_number.nominee.map(n => parseInt(n.lucky_number)).sort((a, b) => a - b);

    // Tính giá trị ngưỡng bách phân vị tương ứng trong chuỗi lucky numbers
    // Đây là giá trị tại vị trí percentileRank trong tập luckyNumbers, có thể là số lẻ qua nội suy.
    let percentileThresholdValue = 0;
    if (luckyNumbers.length > 0) {
        // Áp dụng công thức index = (K/100) * (N-1)
        const indexFloat = (roundedPercentileRank / 100) * (luckyNumbers.length - 1);

        const indexLower = Math.floor(indexFloat);
        const indexUpper = Math.ceil(indexFloat);

        // Xử lý các trường hợp biên của indexFloat trước khi nội suy
        if (indexFloat < 0) {
            percentileThresholdValue = luckyNumbers[0];
        } else if (indexFloat >= luckyNumbers.length - 1) {
            percentileThresholdValue = luckyNumbers[luckyNumbers.length - 1];
        } else {
            // Nếu indexFloat là số nguyên (hoặc làm tròn), lấy giá trị tại index đó
            if (indexLower === indexUpper) {
                percentileThresholdValue = luckyNumbers[indexLower];
            } else {
                // Thực hiện nội suy tuyến tính nếu indexFloat là số thập phân
                const lowerValue = luckyNumbers[indexLower];
                const upperValue = luckyNumbers[indexUpper];
                const fraction = indexFloat - indexLower; // Phần thập phân của index

                // Công thức nội suy tuyến tính: value = lowerValue + (upperValue - lowerValue) * fraction
                percentileThresholdValue = lowerValue + (upperValue - lowerValue) * fraction;
            }
        }
    }
    
    // Hiển thị percentileThresholdValue làm tròn đến 4 chữ số thập phân
    document.getElementById('calculated-lucky-value-display').textContent = percentileThresholdValue.toFixed(4);


    // Xác định số may mắn là số lớn nhất NHỎ HƠN HOẶC BẰNG giá trị ngưỡng đã tính (percentileThresholdValue).
    // Duyệt ngược từ cuối danh sách `luckyNumbers` đã sắp xếp.
    let finalLuckyNumber = null;
    for (let i = luckyNumbers.length - 1; i >= 0; i--) {
        if (luckyNumbers[i] <= percentileThresholdValue) {
            finalLuckyNumber = luckyNumbers[i]; // Đây chính là số may mắn cần tìm
            break; // Tìm thấy số đầu tiên (lớn nhất) thỏa mãn điều kiện, thoát khỏi vòng lặp
        }
    }

    // Xử lý trường hợp không tìm thấy số nào thỏa mãn (có thể xảy ra nếu threshold quá thấp)
    if (finalLuckyNumber === null && luckyNumbers.length > 0) {
        finalLuckyNumber = luckyNumbers[0]; // Nếu không tìm thấy số nào <= percentileThresholdValue, lấy số nhỏ nhất trong danh sách luckyNumbers
    } else if (finalLuckyNumber === null) {
        finalLuckyNumber = 0; // Trường hợp luckyNumbers rỗng
    }

    document.getElementById('final-lucky-number-display').textContent = finalLuckyNumber;
    document.getElementById('calculation-details').style.display = 'block'; // Hiển thị chi tiết tính toán

    const winners = luckyNumberData.lucky_number.nominee.filter(n => parseInt(n.lucky_number) === finalLuckyNumber);
    displayWinners('game2-winners', winners);
}