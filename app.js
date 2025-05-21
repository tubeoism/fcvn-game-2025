// Helper function to fetch JSON data
async function fetchData(filePath) {
    try {
        const response = await fetch(filePath);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status} for ${filePath}`);
        }
        return await response.json();
    } catch (error) {
        console.error("Lỗi khi tải dữ liệu:", filePath, error);
        showModal(`Lỗi khi tải dữ liệu từ ${filePath}: ${error.message}. Vui lòng kiểm tra đường dẫn file và cấu trúc JSON.`);
        return null;
    }
}

// --- Gemini API Call Function ---
async function callGeminiAPI(prompt, buttonElement, outputElement) {
    if (buttonElement) {
        buttonElement.disabled = true;
        buttonElement.textContent = 'Đang tạo...';
    }
    if (outputElement) {
        outputElement.style.display = 'block';
        outputElement.textContent = 'Đang suy nghĩ...';
    }

    let chatHistory = [{ role: "user", parts: [{ text: prompt }] }];
    const payload = { contents: chatHistory };
    const apiKey = ""; // For Canvas environment, leave apiKey as ""
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const result = await response.json();

        if (result.candidates && result.candidates.length > 0 &&
            result.candidates[0].content && result.candidates[0].content.parts &&
            result.candidates[0].content.parts.length > 0) {
            const text = result.candidates[0].content.parts[0].text;
            if (outputElement) {
                outputElement.textContent = text;
            }
        } else {
            console.error("Gemini API response error or empty content:", result);
            if (outputElement) {
                outputElement.textContent = "Xin lỗi, không thể tạo nội dung lúc này.";
            }
            showModal("Có lỗi xảy ra khi tạo nội dung từ Gemini: " + (result.error?.message || "Không có nội dung trả về."));
        }
    } catch (error) {
        console.error("Error calling Gemini API:", error);
        if (outputElement) {
            outputElement.textContent = "Lỗi kết nối đến Gemini.";
        }
        showModal("Lỗi kết nối đến Gemini API: " + error.message);
    } finally {
        if (buttonElement) {
            buttonElement.disabled = false;
            if (buttonElement.id.startsWith('generateCongratsBtnG1')) {
                 buttonElement.innerHTML = '✨ Tạo Lời Chúc';
            } else if (buttonElement.id === 'generateSpeechBtn') {
                 buttonElement.innerHTML = '✨ Tạo Lời Phát Biểu';
            }
        }
    }
}


// --- Navigation ---
function showGame(gameId) {
    const gameContents = document.querySelectorAll('.game-content');
    gameContents.forEach(content => content.classList.remove('active'));
    
    const targetGameContent = document.getElementById(gameId);
    if (targetGameContent) {
        targetGameContent.classList.add('active');
    }

    const gameTabs = document.querySelectorAll('.game-tab');
    gameTabs.forEach(tab => tab.classList.remove('active'));

    const targetTabButton = document.getElementById(`tab${gameId.charAt(0).toUpperCase() + gameId.slice(1)}`);
    if (targetTabButton) {
        targetTabButton.classList.add('active');
    }
}

// --- Modal ---
const messageModal = document.getElementById('messageModal');
const modalMessageText = document.getElementById('modalMessageText');

function showModal(message) {
    if (modalMessageText) {
        modalMessageText.textContent = message;
    }
    if (messageModal) {
        messageModal.style.display = 'block';
    }
}

function closeModal() {
    if (messageModal) {
        messageModal.style.display = 'none';
    }
}

// --- Game 1: Voting Game ---
let voteChartInstance = null; 

// Function to extract ID from nominee string like "ID01 - Name - Department"
function extractIdFromString(nomineeString) {
    if (typeof nomineeString !== 'string') return null;
    return nomineeString.split(' ')[0]; // Assumes ID is the first part
}

async function initGame1() {
    const voteRecordsRaw = await fetchData('./data/vote_records.json');
    const votingRefRaw = await fetchData('./data/voting_ref.json');

    if (!voteRecordsRaw || !voteRecordsRaw.records || !voteRecordsRaw.records.vote ||
        !votingRefRaw || !votingRefRaw.voting_ref || !votingRefRaw.voting_ref.nominee) {
        showModal("Cấu trúc dữ liệu cho Trò chơi 1 không đúng hoặc file rỗng. Vui lòng kiểm tra file vote_records.json và voting_ref.json.");
        return;
    }
    
    const actualVoteRecords = voteRecordsRaw.records.vote;
    const actualVotingRef = votingRefRaw.voting_ref.nominee;

    // Create a map for quick lookup of nominee details using extracted ID
    const nomineeDetailsMap = new Map();
    actualVotingRef.forEach(nominee => {
        const id = extractIdFromString(nominee.aggregate); // Extract ID from "aggregate"
        if (id) {
            nomineeDetailsMap.set(id, {
                id: id, // Store the extracted ID
                name: nominee.name,
                department: nominee.department,
                self_intro: nominee.about, // Use 'about' for self_intro
                thumbnail: nominee.thumbnail
            });
        }
    });

    const voteCounts = {};
    actualVoteRecords.forEach(record => {
        const nomineesVotedIds = [
            extractIdFromString(record.nominee_1),
            extractIdFromString(record.nominee_2),
            extractIdFromString(record.nominee_3)
        ].filter(id => id !== null); // Filter out any null IDs if extraction fails

        nomineesVotedIds.forEach(nomineeId => {
            if (nomineeDetailsMap.has(nomineeId)) { 
                 voteCounts[nomineeId] = (voteCounts[nomineeId] || 0) + 1;
            }
        });
    });
    
    const sortedNominees = Object.entries(voteCounts)
        .map(([id, votes]) => {
            const details = nomineeDetailsMap.get(id);
            return { 
                id: id, 
                name: details?.name || 'Không rõ tên', 
                votes: votes,
                department: details?.department || 'Không rõ phòng ban'
            };
        })
        .sort((a, b) => b.votes - a.votes);

    const labels = sortedNominees.map(n => n.name);
    const data = sortedNominees.map(n => n.votes);
    const colors = generateHotToColdColors(sortedNominees.length);

    const voteChartCanvas = document.getElementById('voteChart')
    if (!voteChartCanvas) return; 
    const ctx = voteChartCanvas.getContext('2d');

    if (voteChartInstance) {
        voteChartInstance.destroy(); 
    }
    voteChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Số Phiếu Bầu',
                data: data,
                backgroundColor: colors,
                borderColor: colors.map(color => color.replace('0.8', '1')),
                borderWidth: 1
            }]
        },
        options: { /* ... existing chart options ... */ }
    });

    const voteWinnersDiv = document.getElementById('voteWinners');
    if (!voteWinnersDiv) return; 
    voteWinnersDiv.innerHTML = ''; 
    if (sortedNominees.length > 0) {
        const maxVotes = sortedNominees[0].votes;
        const winners = sortedNominees.filter(n => n.votes === maxVotes);

        if (winners.length > 0) {
            winners.forEach((winner, index) => {
                const nomineeInfo = nomineeDetailsMap.get(winner.id); // Get full info using the ID
                if (nomineeInfo) {
                    const winnerCardId = `winnerCardG1-${index}`;
                    const generatedMessageId = `generatedMessageG1-${index}`;
                    const generateButtonId = `generateCongratsBtnG1-${index}`;

                    const winnerCardHTML = `
                        <div class="winner-card" id="${winnerCardId}">
                            <div class="flex flex-col sm:flex-row items-center sm:items-start space-y-4 sm:space-y-0 sm:space-x-6">
                                <img src="${nomineeInfo.thumbnail}" alt="${nomineeInfo.name}" class="w-24 h-24 md:w-32 md:h-32 object-cover" onerror="this.onerror=null;this.src='https://placehold.co/100x100/CCCCCC/FFFFFF?text=Ảnh';this.style.border='none';">
                                <div class="text-center sm:text-left flex-grow">
                                    <h4 class="text-xl md:text-2xl font-bold text-red-300">${nomineeInfo.name}</h4>
                                    <p class="text-gray-300">${nomineeInfo.department}</p>
                                    <p class="text-gray-400 mt-2 text-sm italic">"${nomineeInfo.self_intro}"</p>
                                </div>
                            </div>
                            <div class="mt-3 text-center sm:text-right">
                                 <button id="${generateButtonId}" class="gemini-btn text-xs py-1 px-3 rounded-md shadow-sm" data-winner-name="${nomineeInfo.name}" data-winner-dept="${nomineeInfo.department}" data-output-id="${generatedMessageId}">✨ Tạo Lời Chúc</button>
                            </div>
                            <div id="${generatedMessageId}" class="generated-text-area mt-2" style="display:none;"></div>
                        </div>`;
                    voteWinnersDiv.innerHTML += winnerCardHTML;
                }
            });
            
            winners.forEach((winner, index) => {
                const generateButtonId = `generateCongratsBtnG1-${index}`;
                const btn = document.getElementById(generateButtonId);
                if (btn) {
                    btn.addEventListener('click', function() {
                        const winnerName = this.dataset.winnerName;
                        const winnerDept = this.dataset.winnerDept;
                        const outputId = this.dataset.outputId;
                        const outputElement = document.getElementById(outputId);
                        const prompt = `Hãy viết một lời chúc mừng ngắn gọn (khoảng 2-3 câu), dí dỏm và đầy nhiệt huyết cho "${winnerName}" từ phòng "${winnerDept}", người vừa thắng giải "Ngôi Sao Bình Chọn" tại Gala Dinner của công ty. Lời chúc nên mang không khí vui vẻ của buổi tiệc.`;
                        callGeminiAPI(prompt, this, outputElement);
                    });
                }
            });

        } else {
            voteWinnersDiv.innerHTML = '<p class="text-gray-400 text-center col-span-full">Không có người thắng cuộc.</p>';
        }
    } else {
         voteWinnersDiv.innerHTML = '<p class="text-gray-400 text-center col-span-full">Chưa có dữ liệu bình chọn hoặc không có ứng viên hợp lệ.</p>';
    }
}

function generateHotToColdColors(count) {
    const colors = [];
    const baseColors = [
        [255, 99, 132],  // Red
        [255, 159, 64],  // Orange
        [255, 205, 86],  // Yellow
        [75, 192, 192],   // Green
        [54, 162, 235],   // Blue
        [153, 102, 255]  // Purple
    ];
    if (count === 0) return ['rgba(200, 200, 200, 0.8)'];
    for (let i = 0; i < count; i++) {
        const colorIndex = Math.floor((i / count) * baseColors.length) % baseColors.length;
        const [r, g, b] = baseColors[colorIndex];
        colors.push(`rgba(${r}, ${g}, ${b}, 0.8)`);
    }
    return colors;
}


// --- Game 2: Lucky Number Game ---
const luckyNumberForm = document.getElementById('luckyNumberForm');
if (luckyNumberForm) {
    luckyNumberForm.addEventListener('submit', async function(event) {
        event.preventDefault();
        const formData = new FormData(event.target);
        const jackpot1Numbers = [
            parseInt(formData.get('jackpot1_1')),
            parseInt(formData.get('jackpot1_2')),
            parseInt(formData.get('jackpot1_3')),
            parseInt(formData.get('jackpot1_4')),
            parseInt(formData.get('jackpot1_5')),
            parseInt(formData.get('jackpot1_6')),
        ];
        const specialNumber = parseInt(formData.get('specialNumber'));

        const allInputNumbers = [...jackpot1Numbers, specialNumber];
        if (allInputNumbers.some(isNaN)) {
            showModal("Vui lòng nhập đủ 7 số hợp lệ.");
            return;
        }
        if (allInputNumbers.some(num => num < 1 || num > 55)) {
            showModal("Các số phải nằm trong khoảng từ 1 đến 55.");
            return;
        }
        if (new Set(allInputNumbers).size !== 7) {
            showModal("Vui lòng không nhập các số trùng nhau trong 7 số đầu vào.");
            return;
        }

        const participantsDataRaw = await fetchData('./data/lucky_number.json'); 

        if (!participantsDataRaw || !participantsDataRaw.lucky_number || !participantsDataRaw.lucky_number.nominee) {
            showModal("Cấu trúc dữ liệu cho người tham gia Trò chơi 2 (lucky_number.json) không đúng hoặc file rỗng.");
            return;
        }
        const participantsData = participantsDataRaw.lucky_number.nominee;

        // Derive luckyNumberChain from the participants' lucky numbers
        const luckyNumberChain = [...new Set(participantsData.map(p => parseInt(p.lucky_number)).filter(n => !isNaN(n)))].sort((a, b) => a - b);

        if (luckyNumberChain.length === 0) {
            showModal("Không có số may mắn hợp lệ nào trong file lucky_number.json để tạo chuỗi tính toán.");
            return;
        }
        
        const sortedInputNumbers = [...allInputNumbers].sort((a, b) => a - b);
        const rankOfS7 = sortedInputNumbers.indexOf(specialNumber) + 1;
        const percentileRank = Math.round(((rankOfS7 - 1) / (7 - 1)) * 100);

        const M = luckyNumberChain.length;
        const percentileValueIndex = Math.round((percentileRank / 100) * (M - 1));
        const V_percentile = luckyNumberChain[Math.min(Math.max(0, percentileValueIndex), M - 1)]; 

        let determinedLuckyNumber = -1; 
        for (let i = luckyNumberChain.length - 1; i >= 0; i--) {
            if (luckyNumberChain[i] < V_percentile) {
                determinedLuckyNumber = luckyNumberChain[i];
                break;
            }
        }
        
        const resultDiv = document.getElementById('luckyNumberResult');
        if(resultDiv){
            if (determinedLuckyNumber !== -1) {
                 resultDiv.innerHTML = `
                    <p>7 số đã nhập: ${allInputNumbers.join(', ')}</p>
                    <p>Số đặc biệt (S7): ${specialNumber}</p>
                    <p>7 số sau khi sắp xếp: ${sortedInputNumbers.join(', ')}</p>
                    <p>Vị trí của S7 trong dãy sắp xếp (k): ${rankOfS7}</p>
                    <p>Vị trí bách phân vị (làm tròn %): ${percentileRank}%</p>
                    <p>Chuỗi số may mắn được tạo từ file: [${luckyNumberChain.join(', ')}]</p>
                    <p>Giá trị bách phân vị tương ứng (V_percentile) từ chuỗi số may mắn: ${V_percentile}</p>
                    <p class="font-bold text-xl text-yellow-300">Số May Mắn Được Xác Định: ${determinedLuckyNumber}</p>
                `;
            } else {
                resultDiv.innerHTML = `
                    <p>7 số đã nhập: ${allInputNumbers.join(', ')}</p>
                    <p>Số đặc biệt (S7): ${specialNumber}</p>
                    <p>7 số sau khi sắp xếp: ${sortedInputNumbers.join(', ')}</p>
                    <p>Vị trí của S7 trong dãy sắp xếp (k): ${rankOfS7}</p>
                    <p>Vị trí bách phân vị (làm tròn %): ${percentileRank}%</p>
                    <p>Chuỗi số may mắn được tạo từ file: [${luckyNumberChain.join(', ')}]</p>
                    <p>Giá trị bách phân vị tương ứng (V_percentile) từ chuỗi số may mắn: ${V_percentile}</p>
                    <p class="font-bold text-xl text-yellow-300">Không tìm thấy số may mắn nào nhỏ hơn ${V_percentile} trong chuỗi.</p>
                `;
            }
        }

        const luckyNumberWinnersDiv = document.getElementById('luckyNumberWinners');
        if(luckyNumberWinnersDiv) {
            luckyNumberWinnersDiv.innerHTML = ''; 

            if (determinedLuckyNumber !== -1) {
                // Filter winners from participantsData (lucky_number.json)
                const winners = participantsData.filter(p => parseInt(p.lucky_number) === determinedLuckyNumber);
                if (winners.length > 0) {
                    winners.forEach(winner => {
                        const winnerCard = `
                            <div class="winner-card flex flex-col sm:flex-row items-center sm:items-start space-y-4 sm:space-y-0 sm:space-x-6">
                                <img src="${winner.thumbnail}" alt="${winner.name}" class="w-24 h-24 md:w-32 md:h-32 object-cover" onerror="this.onerror=null;this.src='https://placehold.co/100x100/CCCCCC/FFFFFF?text=Ảnh';this.style.border='none';">
                                <div class="text-center sm:text-left">
                                    <h4 class="text-xl md:text-2xl font-bold text-red-300">${winner.name}</h4>
                                    <p class="text-gray-300">${winner.department}</p>
                                    <p class="text-gray-400 mt-2 text-sm italic">"${winner.about}"</p>
                                    <p class="text-yellow-400 font-semibold">Số may mắn cá nhân: ${winner.lucky_number}</p>
                                </div>
                            </div>`;
                        luckyNumberWinnersDiv.innerHTML += winnerCard;
                    });
                } else {
                    luckyNumberWinnersDiv.innerHTML = `<p class="text-gray-400 text-center col-span-full">Không có ai sở hữu số may mắn ${determinedLuckyNumber}.</p>`;
                }
            } else {
                 luckyNumberWinnersDiv.innerHTML = `<p class="text-gray-400 text-center col-span-full">Không xác định được số may mắn để tìm người thắng cuộc.</p>`;
            }
        }
    });
}

// --- Game 3: Grand Prize ---
const drawGrandPrizeButton = document.getElementById('drawGrandPrizeButton');
const generateSpeechBtn = document.getElementById('generateSpeechBtn');
const generatedSpeechG3Div = document.getElementById('generatedSpeechG3');

if (drawGrandPrizeButton) {
    drawGrandPrizeButton.addEventListener('click', async function() {
        const grandPrizeParticipantsRaw = await fetchData('./data/grand_prize.json');
        if (!grandPrizeParticipantsRaw || !grandPrizeParticipantsRaw.grand_prize || !grandPrizeParticipantsRaw.grand_prize.nominee || grandPrizeParticipantsRaw.grand_prize.nominee.length === 0) {
            showModal("Cấu trúc dữ liệu cho Giải Đặc Biệt (grand_prize.json) không đúng hoặc không có người tham gia.");
            return;
        }
        const grandPrizeParticipants = grandPrizeParticipantsRaw.grand_prize.nominee;

        const button = this;
        const originalText = button.textContent;
        button.textContent = "Đang quay...";
        button.disabled = true;

        if (generateSpeechBtn) generateSpeechBtn.style.display = 'none';
        if (generatedSpeechG3Div) generatedSpeechG3Div.style.display = 'none';


        setTimeout(() => {
            const randomIndex = Math.floor(Math.random() * grandPrizeParticipants.length);
            const winner = grandPrizeParticipants[randomIndex];

            const grandPrizeWinnerDiv = document.getElementById('grandPrizeWinner');
            if(grandPrizeWinnerDiv) {
                grandPrizeWinnerDiv.innerHTML = `
                    <div class="winner-card inline-block max-w-md mx-auto">
                        <img src="${winner.thumbnail}" alt="${winner.name}" class="w-32 h-32 md:w-40 md:h-40 object-cover mx-auto mb-4" onerror="this.onerror=null;this.src='https://placehold.co/150x150/CCCCCC/FFFFFF?text=Ảnh';this.style.border='none';">
                        <h4 class="text-2xl md:text-3xl font-bold text-yellow-300">${winner.name}</h4>
                        <p class="text-gray-200 text-lg">${winner.department}</p>
                        <p class="text-gray-300 mt-3 text-md italic">"${winner.about}"</p>
                    </div>
                `;
                if (generateSpeechBtn) {
                    generateSpeechBtn.style.display = 'inline-block';
                    generateSpeechBtn.dataset.winnerName = winner.name;
                    generateSpeechBtn.dataset.winnerDept = winner.department;
                }
            }
            button.textContent = originalText;
            button.disabled = false;
            showModal(`Chúc mừng ${winner.name} đã trúng Giải Đặc Biệt!`);
        }, 2000); 
    });
}

if (generateSpeechBtn) {
    generateSpeechBtn.addEventListener('click', function() {
        const winnerName = this.dataset.winnerName;
        const winnerDept = this.dataset.winnerDept;
        if (winnerName && winnerDept && generatedSpeechG3Div) {
            const prompt = `Hãy viết một đoạn phát biểu nhận giải Đặc Biệt ngẫu hứng (khoảng 3-4 câu) cho "${winnerName}" từ phòng "${winnerDept}" tại Gala Dinner. Đoạn phát biểu nên thể hiện sự bất ngờ, vui mừng và một chút hài hước.`;
            callGeminiAPI(prompt, this, generatedSpeechG3Div);
        } else {
            showModal("Không đủ thông tin người thắng cuộc để tạo lời phát biểu.");
        }
    });
}


// --- Initialize ---
document.addEventListener('DOMContentLoaded', () => {
    const tabGame1 = document.getElementById('tabGame1');
    const tabGame2 = document.getElementById('tabGame2');
    const tabGame3 = document.getElementById('tabGame3');

    if (tabGame1) tabGame1.addEventListener('click', () => showGame('game1'));
    if (tabGame2) tabGame2.addEventListener('click', () => showGame('game2'));
    if (tabGame3) tabGame3.addEventListener('click', () => showGame('game3'));

    const modalCloseBtn = document.getElementById('modalCloseButton');
    if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeModal);
    
    if (messageModal) {
        window.addEventListener('click', function(event) {
            if (event.target == messageModal) closeModal();
        });
    }

    if (document.getElementById('voteChart')) initGame1(); 
    
    const currentYearSpan = document.getElementById('currentYear');
    if (currentYearSpan) currentYearSpan.textContent = new Date().getFullYear();
});
