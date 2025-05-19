document.addEventListener('DOMContentLoaded', () => {
    const drawButton = document.getElementById('drawButton');
    const jackpot1Input = document.getElementById('jackpot1Input');
    const jackpot2Input = document.getElementById('jackpot2Input');
    const resultArea = document.getElementById('resultArea');

    drawButton.addEventListener('click', () => {
        const jackpot1String = jackpot1Input.value;
        const jackpot2Value = parseInt(jackpot2Input.value, 10);

        // Clear previous result
        resultArea.innerHTML = '';

        // Validate Jackpot 2 input
        if (isNaN(jackpot2Value)) {
            resultArea.innerHTML = '<p style="color: red;">Vui lòng nhập số ngẫu nhiên (Jackpot 2) hợp lệ.</p>';
            return;
        }

        // Process and filter Jackpot 1 numbers
        const jackpot1Numbers = jackpot1String
            .split(/[, ]+/) // Split by comma or space
            .map(numStr => parseInt(numStr.trim(), 10)) // Trim whitespace and parse to integer
            .filter(num => !isNaN(num) && num >= 1 && num <= 55); // Filter out invalid numbers and ensure range 1-55

        if (jackpot1Numbers.length !== 6) {
            resultArea.innerHTML = '<p style="color: red;">Vui lòng nhập đúng 6 số Jackpot 1 hợp lệ (từ 1 đến 55).</p>';
            return;
        }

        // Sort Jackpot 1 numbers
        jackpot1Numbers.sort((a, b) => a - b);

        // Calculate percentile of J2 within sorted J1
        let countLessThanJ2 = 0;
        for (const num of jackpot1Numbers) {
            if (num < jackpot2Value) {
                countLessThanJ2++;
            }
        }

        // Simple percentile calculation: (number of values less than J2 / total number of values) * 100
        // Note: There are different definitions of percentile. This is a basic one.
        const percentile = (countLessThanJ2 / jackpot1Numbers.length) * 100;

        // Use floor to get an index-like value for prize lookup (0-99)
        // Or use roundedPercentile for range lookup (0-100) based on XML structure
        const roundedPercentile = Math.round(percentile); // Use rounded for range check in XML

        resultArea.innerHTML += `<p>Bộ số Jackpot 1 đã sắp xếp: ${jackpot1Numbers.join(', ')}</p>`;
        resultArea.innerHTML += `<p>Số ngẫu nhiên (Jackpot 2): ${jackpot2Value}</p>`;
        resultArea.innerHTML += `<p>Bách phân vị tính toán được: ${percentile.toFixed(2)}% (Làm tròn: ${roundedPercentile}%)</p>`;


        // Read prizes XML and find the corresponding prize
        fetch('data/prizes.xml')
            .then(response => {
                 if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.text();
            })
            .then(xmlString => {
                const parser = new DOMParser();
                const xmlDoc = parser.parseFromString(xmlString, "application/xml");

                const errorNode = xmlDoc.querySelector('parsererror');
                if (errorNode) {
                    console.error('Error parsing XML:', errorNode.textContent);
                     resultArea.innerHTML += '<p style="color: red;">Lỗi khi phân tích dữ liệu giải thưởng XML.</p>';
                    return;
                }

                const prizes = xmlDoc.querySelectorAll('prize');
                let winningPrize = 'Không tìm thấy giải thưởng tương ứng.';
                let prizeFound = false;

                if (prizes.length === 0) {
                     resultArea.innerHTML += '<p style="color: red;">Không có dữ liệu giải thưởng nào được tìm thấy trong XML.</p>';
                     return;
                }

                for (const prize of prizes) {
                    const min = parseInt(prize.getAttribute('min'), 10);
                    const max = parseInt(prize.getAttribute('max'), 10);
                    const name = prize.getAttribute('name');

                    // Check if the rounded percentile falls within the prize range (inclusive)
                    if (roundedPercentile >= min && roundedPercentile <= max) {
                        winningPrize = `Chúc mừng! Bạn đã trúng: <strong>${name}</strong>`;
                        prizeFound = true;
                        break; // Found the prize, no need to check further
                    }
                }

                 if (!prizeFound) {
                     winningPrize = `Không tìm thấy giải thưởng cho bách phân vị ${roundedPercentile}%. Vui lòng kiểm tra lại file prizes.xml.`;
                 }

                resultArea.innerHTML += `<p>${winningPrize}</p>`;

            })
            .catch(error => {
                console.error('Lỗi khi đọc hoặc phân tích XML giải thưởng:', error);
                resultArea.innerHTML += '<p style="color: red;">Không thể tải dữ liệu giải thưởng.</p>';
            });

    });
});
