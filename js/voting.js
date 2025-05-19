document.addEventListener('DOMContentLoaded', () => {
    const loadingMessage = document.getElementById('loadingMessage');
    const chartContainer = document.querySelector('.chart-container');

    fetch('data/votes.xml')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.text();
        })
        .then(xmlString => {
            loadingMessage.style.display = 'none'; // Hide loading message
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlString, "application/xml");

            // Check for XML parsing errors
            const errorNode = xmlDoc.querySelector('parsererror');
            if (errorNode) {
                console.error('Error parsing XML:', errorNode.textContent);
                chartContainer.innerHTML = '<p style="color: red; text-align: center;">Lỗi khi phân tích dữ liệu bình chọn XML.</p>';
                return;
            }

            const options = xmlDoc.querySelectorAll('option');
            const labels = [];
            const data = [];

            if (options.length === 0) {
                 chartContainer.innerHTML = '<p style="text-align: center;">Không có dữ liệu bình chọn nào được tìm thấy.</p>';
                 return;
            }

            options.forEach(option => {
                labels.push(option.getAttribute('name'));
                data.push(parseInt(option.getAttribute('count'), 10));
            });

            const ctx = document.getElementById('voteChart').getContext('2d');
            new Chart(ctx, {
                type: 'bar', // Có thể đổi thành 'pie', 'doughnut', 'line', etc.
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Số phiếu',
                        data: data,
                        backgroundColor: [
                            'rgba(255, 99, 132, 0.7)',
                            'rgba(54, 162, 235, 0.7)',
                            'rgba(255, 206, 86, 0.7)',
                            'rgba(75, 192, 192, 0.7)',
                            'rgba(153, 102, 255, 0.7)',
                            'rgba(255, 159, 64, 0.7)'
                        ],
                        borderColor: [
                            'rgba(255, 99, 132, 1)',
                            'rgba(54, 162, 235, 1)',
                            'rgba(255, 206, 86, 1)',
                            'rgba(75, 192, 192, 1)',
                            'rgba(153, 102, 255, 1)',
                            'rgba(255, 159, 64, 1)'
                        ],
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false, // Cho phép thay đổi tỷ lệ khung hình
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                precision: 0 // Hiển thị số nguyên trên trục Y
                            }
                        }
                    },
                    plugins: {
                        legend: {
                            display: true // Hiển thị chú giải
                        },
                        title: {
                            display: true,
                            text: 'Kết quả Bình chọn' // Tiêu đề biểu đồ
                        }
                    }
                }
            });
        })
        .catch(error => {
            console.error('Lỗi khi đọc hoặc phân tích XML:', error);
            loadingMessage.style.display = 'none'; // Hide loading message
            chartContainer.innerHTML = '<p style="color: red; text-align: center;">Không thể tải dữ liệu bình chọn.</p>';
        });
});
