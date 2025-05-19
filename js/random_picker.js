document.addEventListener('DOMContentLoaded', () => {
    const drawNameButton = document.getElementById('drawNameButton');
    const winnerArea = document.getElementById('winnerArea');
    const namesListDiv = document.getElementById('namesList');

    let names = []; // Array to store the list of names

    // Load names from XML when the page loads
    fetch('data/names.xml')
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
                 namesListDiv.innerHTML = '<p style="color: red;">Lỗi khi phân tích dữ liệu tên XML.</p>';
                 drawNameButton.disabled = true; // Disable button on error
                return;
            }

            const nameElements = xmlDoc.querySelectorAll('name');
            names = Array.from(nameElements).map(element => element.textContent.trim()).filter(name => name.length > 0); // Convert NodeList to array, trim whitespace, and filter empty names

            if (names.length === 0) {
                 namesListDiv.innerHTML = '<p style="color: red;">Không có tên nào được tìm thấy trong danh sách XML.</p>';
                 drawNameButton.disabled = true; // Disable button if list is empty
            } else {
                 namesListDiv.innerHTML = `<strong>Danh sách tham gia (${names.length} người):</strong> Đã tải xong.`; // Optional: Indicate list is loaded
                 drawNameButton.disabled = false; // Enable button if names are loaded
            }

        })
        .catch(error => {
            console.error('Lỗi khi đọc hoặc phân tích XML tên:', error);
            namesListDiv.innerHTML = '<p style="color: red;">Không thể tải danh sách tham gia.</p>';
            drawNameButton.disabled = true; // Disable button if loading fails
        });

     // Initially disable the button until names are loaded
     drawNameButton.disabled = true;


    // Add event listener for the button
    drawNameButton.addEventListener('click', () => {
        if (names.length === 0) {
            winnerArea.innerHTML = '<p style="color: red;">Không có tên trong danh sách để bốc thăm.</p>';
            return;
        }

        // Generate random index
        const randomIndex = Math.floor(Math.random() * names.length);

        // Get the winner
        const winner = names[randomIndex];

        // Display the winner
        winnerArea.innerHTML = `<h2>Người may mắn nhất là: <br><strong>${winner}</strong></h2>`;
    });
});
