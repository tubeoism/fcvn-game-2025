document.addEventListener('DOMContentLoaded', () => {
    // Paths to local CSV files in the 'data' folder
    const VOTE_CSV_PATH = 'data/vote.csv';
    const REF_CSV_PATH = 'data/ref.csv';
    const THUMB_FOLDER = 'thumb/'; // Assuming images are still in a local 'thumb/' folder

    let voteChart = null; // To hold the chart instance

    // --- 1. UTILITY FUNCTIONS ---

    // Basic CSV to Array of Objects parser
    function csvToArray(csvString, csvPathForContext) { // csvPathForContext for logging
        const lines = csvString.trim().split('\n');
        if (lines.length < 2) {
            console.warn(`CSV from ${csvPathForContext} has no data or only headers.`);
            return [];
        }

        const headers = lines[0].split(',').map(header => header.trim());
        const array = [];

        for (let i = 1; i < lines.length; i++) {
            const lineContent = lines[i].trim();
            if (lineContent === "") {
                console.log(`Skipping blank line in ${csvPathForContext} at CSV line number ${i + 1}`);
                continue;
            }

            // Simple split by comma. Handles values quoted at the very start/end.
            // Does not handle commas inside quotes robustly without a more complex parser.
            const values = lineContent.split(',').map(value => value.trim().replace(/^"|"$/g, ''));
            
            if (values.length === headers.length) {
                const obj = {};
                headers.forEach((header, index) => {
                    obj[header] = values[index];
                });
                array.push(obj);
            } else {
                console.warn(`Skipping malformed CSV line in ${csvPathForContext} at CSV line number ${i + 1}. Expected ${headers.length} columns, got ${values.length}. Line content: "${lineContent}"`);
            }
        }
        return array;
    }

    // Fetch and parse a CSV file from a local path
    async function fetchCsvData(csvPath) {
        const response = await fetch(csvPath); // fetch() works for local paths when served by a server
        if (!response.ok) {
            console.error(`Failed to fetch CSV ${csvPath}: ${response.status} ${response.statusText}`);
            const errorBody = await response.text().catch(() => "Could not read error body.");
            console.error("Error response body (if any):", errorBody); // Log body for 404s etc.
            throw new Error(`Failed to fetch CSV ${csvPath}: ${response.status} ${response.statusText}. Check if the file exists at this path and the server has permission to access it.`);
        }
        const csvText = await response.text();
        return csvToArray(csvText, csvPath); // Pass csvPath for context
    }

    // --- 2. VOTE PROCESSING ---

    function processVotes(voteData) {
        const voteCounts = {};
        const voteColumns = ['impress_01', 'impress_02', 'impress_03'];

        voteData.forEach(row => {
            voteColumns.forEach(col => {
                const votedItem = row[col];
                if (votedItem && votedItem.trim() !== "") {
                    voteCounts[votedItem] = (voteCounts[votedItem] || 0) + 1;
                }
            });
        });

        const sortedVotes = Object.entries(voteCounts)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count);

        return sortedVotes;
    }

    // --- 3. CHART DISPLAY ---

    function displayVoteChart(sortedVotes) {
        const ctx = document.getElementById('voteChart').getContext('2d');
        const labels = sortedVotes.map(item => item.name);
        const data = sortedVotes.map(item => item.count);

        if (voteChart) {
            voteChart.destroy();
        }

        voteChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: '# of Votes',
                    data: data,
                    backgroundColor: 'rgba(54, 162, 235, 0.7)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        beginAtZero: true,
                        title: { display: true, text: 'Number of Votes' }
                    },
                    y: {
                        title: { display: true, text: 'Candidates' }
                    }
                },
                plugins: {
                    legend: { display: true, position: 'top' },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `${context.dataset.label}: ${context.raw}`;
                            }
                        }
                    }
                }
            }
        });
    }

    // --- 4. TOP VOTED DISPLAY ---

    function displayTopVoted(topItemName, refData) {
        const topVotedInfoDiv = document.getElementById('topVotedInfo');
        if (!topItemName || !refData) {
            topVotedInfoDiv.innerHTML = '<p>Could not determine the top voted person or load reference data.</p>';
            return;
        }

        const personDetails = refData.find(p => p.aggregated === topItemName);

        if (personDetails) {
            topVotedInfoDiv.innerHTML = `
                <img src="${THUMB_FOLDER}${personDetails.image}" alt="Photo of ${personDetails.name}">
                <h4>${personDetails.name}</h4>
                <p class="location"><strong>Location:</strong> ${personDetails.loc}</p>
                <p class="intro"><strong>Self-Introduction:</strong> ${personDetails.self_introduction}</p>
            `;
        } else {
            topVotedInfoDiv.innerHTML = `<p>Details for "${topItemName}" not found in the reference file. Please check the 'aggregated' column in your 'data/ref.csv' and the spelling of the top voted name.</p>`;
            console.warn(`Top voted item "${topItemName}" not found in reference data. Available aggregated names in ref.csv:`, refData.map(p => p.aggregated));
        }
    }

    // --- 5. MAIN EXECUTION ---

    async function initGame1() {
        try {
            const voteData = await fetchCsvData(VOTE_CSV_PATH);
            if (!voteData || voteData.length === 0) {
                console.error("No data found in votes CSV or CSV is empty/malformed. Path:", VOTE_CSV_PATH);
                document.getElementById('chart-section').innerHTML = `<p>Error: Could not load or parse voting data from ${VOTE_CSV_PATH}. Please check the console and ensure the file exists and is correctly formatted.</p>`;
                document.getElementById('topVotedInfo').innerHTML = "";
                return;
            }

            const refData = await fetchCsvData(REF_CSV_PATH);
            if (!refData || refData.length === 0) {
                console.warn("Reference data CSV is empty or could not be loaded. Path:", REF_CSV_PATH, "Top voted person details might not display correctly.");
            }

            const sortedVotes = processVotes(voteData);

            if (sortedVotes.length > 0) {
                displayVoteChart(sortedVotes);
                const topVotedName = sortedVotes[0].name;
                if (refData && refData.length > 0) {
                    displayTopVoted(topVotedName, refData);
                } else {
                     document.getElementById('topVotedInfo').innerHTML = `<p>Voting results are shown, but details for the top voted person ("${topVotedName}") could not be displayed as reference data from ${REF_CSV_PATH} is missing or empty.</p>`;
                }
            } else {
                document.getElementById('chart-section').innerHTML = `<p>No votes were processed or no valid votes found in the data from ${VOTE_CSV_PATH}.</p>`;
                document.getElementById('topVotedInfo').innerHTML = "<p>No top voted person to display.</p>";
            }

        } catch (error) {
            console.error("Error initializing Game 1:", error);
            const mainContent = document.querySelector('main');
            mainContent.innerHTML = `<p style="color: red; text-align: center;">An error occurred while loading Game 1. Please check the browser console (F12) for technical details. Ensure 'data/vote.csv' and 'data/ref.csv' exist and are correctly formatted.</p><p style="text-align:center; color: gray;">(Error: ${error.message})</p>`;
        }
    }

    initGame1();
});