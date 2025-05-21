document.addEventListener('DOMContentLoaded', () => {
    // URLs are now hardcoded here
    const VOTE_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSBqkKG8NQUkwILa_A5VgIKMf-r12vdyWmYX72m6u4tTH3nmxlpuVQXhoQ8GQ2KZNqmPz1owrGWN5Sp/pub?gid=1304014145&single=true&output=csv';
    const REF_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSd7KtTAnfNn2swMQzdVs1ejN3L3Kjo76usmlLO_j691PTElqlItdWvsYbye5KcatF8Z7_epOo8IYrJ/pub?gid=1598828659&single=true&output=csv';
    const THUMB_FOLDER = 'thumb/'; // Assuming images are still in a local 'thumb/' folder

    let voteChart = null; // To hold the chart instance

    // --- 1. UTILITY FUNCTIONS ---

    // Basic CSV to Array of Objects parser
    function csvToArray(csvString, csvUrlForContext) { // Added csvUrlForContext
        const lines = csvString.trim().split('\n');
        if (lines.length < 2) {
           console.warn(`CSV from ${csvUrlForContext} has no data or only headers.`);
            return [];
        }

        const headers = lines[0].split(',').map(header => header.trim());
        const array = [];

        for (let i = 1; i < lines.length; i++) {
            const lineContent = lines[i].trim(); // Trim the line itself
            if (lineContent === "") { // Skip completely blank lines
                console.log(`Skipping blank line in ${csvUrlForContext} at CSV line number ${i + 1}`);
                continue;
            }

            const values = lineContent.split(',').map(value => value.trim().replace(/^"|"$/g, ''));
            if (values.length === headers.length) {
                const obj = {};
                headers.forEach((header, index) => {
                    obj[header] = values[index];
                });
                array.push(obj);
            } else {
                // This is approximately line 30 from your error message
                console.warn(`Skipping malformed CSV line in ${csvUrlForContext} at CSV line number ${i + 1}. Expected ${headers.length} columns, got ${values.length}. Line content: "${lineContent}"`);
            }
        }
        return array;
    }

    // Fetch and parse a CSV file from a URL
    async function fetchCsvData(csvUrl) { // csvUrl is already the first parameter
        const response = await fetch(csvUrl);
        if (!response.ok) {
            console.error(`Failed to fetch CSV ${csvUrl}: ${response.status} ${response.statusText}`);
            const errorBody = await response.text().catch(() => "Could not read error body.");
            console.error("Error response body:", errorBody);
            throw new Error(`Failed to fetch CSV ${csvUrl}: ${response.status} ${response.statusText}`);
        }
        const csvText = await response.text();
        // Pass the csvUrl to csvToArray for better context in warnings
        return csvToArray(csvText, csvUrl);
    }

    // --- 2. VOTE PROCESSING ---

    function processVotes(voteData) {
        const voteCounts = {};
        const voteColumns = ['impress_01', 'impress_02', 'impress_03'];

        voteData.forEach(row => {
            voteColumns.forEach(col => {
                const votedItem = row[col];
                if (votedItem && votedItem.trim() !== "") { // Check if there's a vote and it's not an empty string
                    voteCounts[votedItem] = (voteCounts[votedItem] || 0) + 1;
                }
            });
        });

        // Convert to array and sort
        const sortedVotes = Object.entries(voteCounts)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count); // Sort descending

        return sortedVotes;
    }

    // --- 3. CHART DISPLAY ---

    function displayVoteChart(sortedVotes) {
        const ctx = document.getElementById('voteChart').getContext('2d');
        const labels = sortedVotes.map(item => item.name);
        const data = sortedVotes.map(item => item.count);

        if (voteChart) {
            voteChart.destroy(); // Destroy previous chart instance if exists
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
                        title: {
                            display: true,
                            text: 'Number of Votes'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Candidates'
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                    },
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
            topVotedInfoDiv.innerHTML = `<p>Details for "${topItemName}" not found in the reference file. Please check the 'aggregated' column in your reference CSV and the spelling of the top voted name.</p>`;
            console.warn(`Top voted item "${topItemName}" not found in reference data. Available aggregated names:`, refData.map(p => p.aggregated));
        }
    }

    // --- 5. MAIN EXECUTION ---

    async function initGame1() {
        try {
            // Fetch and process data using the hardcoded URLs
            const voteData = await fetchCsvData(VOTE_CSV_URL);
            if (!voteData || voteData.length === 0) {
                console.error("No data found in votes CSV or CSV is empty/malformed. URL:", VOTE_CSV_URL);
                document.getElementById('chart-section').innerHTML = "<p>Error: Could not load or parse voting data. Please check the console and ensure the Google Sheet for votes is correctly published and formatted as CSV.</p>";
                document.getElementById('topVotedInfo').innerHTML = ""; // Clear top voted section
                return;
            }

            const refData = await fetchCsvData(REF_CSV_URL);
            if (!refData || refData.length === 0) {
                console.warn("Reference data CSV is empty or could not be loaded. URL:", REF_CSV_URL, "Top voted person details might not display correctly.");
                // Don't return, try to proceed with votes at least
            }

            const sortedVotes = processVotes(voteData);

            if (sortedVotes.length > 0) {
                displayVoteChart(sortedVotes);
                const topVotedName = sortedVotes[0].name;
                // Ensure refData is available before trying to display top voted
                if (refData && refData.length > 0) {
                    displayTopVoted(topVotedName, refData);
                } else {
                     document.getElementById('topVotedInfo').innerHTML = `<p>Voting results are shown, but details for the top voted person ("${topVotedName}") could not be displayed as reference data is missing or empty.</p>`;
                }
            } else {
                document.getElementById('chart-section').innerHTML = "<p>No votes were processed or no valid votes found in the data. Please check the voting data CSV.</p>";
                document.getElementById('topVotedInfo').innerHTML = "<p>No top voted person to display.</p>";
            }

        } catch (error) {
            console.error("Error initializing Game 1:", error);
            const mainContent = document.querySelector('main');
            // Display a more user-friendly error message but keep details in console
            mainContent.innerHTML = `<p style="color: red; text-align: center;">An error occurred while loading Game 1. Please check the browser console (F12) for more technical details. Common issues include problems accessing the Google Sheets (ensure they are 'Published to web' as CSV and publicly accessible) or incorrect CSV formatting.</p><p style="text-align:center; color: gray;">(Technical: ${error.message})</p>`;
        }
    }

    initGame1();
});