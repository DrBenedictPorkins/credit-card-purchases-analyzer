// Ensure the DOM is fully loaded before attaching event listeners
document.addEventListener('DOMContentLoaded', () => {
  console.log("Document loaded, setting up event listeners...");

  const fileInput = document.getElementById('fileUpload');
  if (fileInput) {
    fileInput.addEventListener('change', handleFileUpload);
  } else {
    console.error("File input element not found");
  }

  const resetButton = document.getElementById('resetButton');
  if (resetButton) {
    resetButton.addEventListener('click', resetChart);
  } else {
    console.error("Reset button not found");
  }
});

let originalCSVData = null;
let transactionData = {};

function handleFileUpload(event) {
  const file = event.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = function (e) {
      originalCSVData = e.target.result;
      const transactions = parseCSV(originalCSVData);
      if (transactions) {
        analyzeTransactions(transactions);
      }
    };
    reader.readAsText(file);
  }
}

function parseCSV(csvText) {
  const rows = csvText.trim().split('\n');  // Trim the csvText to remove any trailing newline
  const headers = rows[0].split(',').map(header => header.trim());
  const transactions = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i].split(',');

    // Skip empty rows
    if (row.join('').trim() === '') {
      console.log(`Skipping empty row at line ${i + 1}`);
      continue;
    }

    // Check if row has correct number of fields
    if (row.length !== headers.length) {
      console.warn(`Row ${i + 1} has ${row.length} fields, expected ${headers.length}. Row data:`, row);
      continue;
    }

    const transaction = {};
    let isRowValid = false;

    headers.forEach((header, index) => {
      const value = row[index] ? row[index].trim() : '';
      transaction[header] = value;
      if (value !== '') {
        isRowValid = true;
      }
    });

    if (isRowValid) {
      transactions.push(transaction);
    } else {
      console.warn(`Row ${i + 1} is empty or contains only empty fields. Row data:`, row);
    }
  }

  console.log(`Parsed ${transactions.length} valid transactions out of ${rows.length - 1} data rows`);
  return transactions;
}

function analyzeTransactions(transactions) {
  console.log("Analyzing transactions...");
  let totalPurchases = 0;
  transactionData = transactions.reduce((acc, transaction) => {
    const category = transaction.Category;
    const amount = parseFloat(transaction.Amount);

    if (isNaN(amount) || amount <= 0) {
      console.warn('Invalid or non-positive amount for transaction:', transaction);
      return acc;
    }

    if (!acc[category]) {
      acc[category] = {total: 0, transactions: []};
    }

    acc[category].total += amount;
    acc[category].transactions.push(transaction);
    totalPurchases += amount;
    return acc;
  }, {});

  createOrUpdateChart(transactionData);
  showAllTransactions();

  // Display total purchases
  // const resultsDiv = document.getElementById('results');
  // const formattedTotal = new Intl.NumberFormat('en-US', {
  //   style: 'currency',
  //   currency: 'USD',
  //   minimumFractionDigits: 2,
  //   maximumFractionDigits: 2
  // }).format(totalPurchases);
  // resultsDiv.innerHTML = `<h3>Total Purchases: ${formattedTotal}</h3>` + resultsDiv.innerHTML;
}

/**
 * Transforms a string into its strikethrough version using Unicode combining characters.
 * @param {string} text - The original text.
 * @returns {string} - The strikethrough version of the text.
 */
function toStrikethrough(text) {
  return text.split('').map(char => char + '\u0336').join('');
}

function createOrUpdateChart(categoryTotals) {
  // Convert categoryTotals to an array of [label, total] pairs
  let dataArray = Object.entries(categoryTotals).map(([label, data]) => ({
    label,
    total: data.total
  }));

  // Sort the array by total in descending order
  dataArray.sort((a, b) => b.total - a.total);

  // Separate labels and data
  const labels = dataArray.map(item => item.label);
  const data = dataArray.map(item => item.total);

  console.log("Sorted Chart data:", data); // Debug log

  const ctx = document.getElementById('categoryChart').getContext('2d');

  if (window.myPieChart) {
    window.myPieChart.destroy();
  }

  // Ensure ChartDataLabels is available
  if (typeof ChartDataLabels === 'undefined') {
    console.error('ChartDataLabels plugin is not loaded');
    return;
  }

  Chart.register(ChartDataLabels);

  window.myPieChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: data,
        backgroundColor: [
          'rgba(255, 99, 132, 0.8)',    // Red
          'rgba(54, 162, 235, 0.8)',    // Blue
          'rgba(255, 206, 86, 0.8)',    // Yellow
          'rgba(75, 192, 192, 0.8)',    // Teal
          'rgba(153, 102, 255, 0.8)',   // Purple
          'rgba(255, 159, 64, 0.8)',    // Orange
          'rgba(255, 0, 0, 0.8)',        // Bright Red
          'rgba(0, 255, 0, 0.8)',        // Bright Green
          'rgba(0, 0, 255, 0.8)',        // Bright Blue
          'rgba(128, 0, 128, 0.8)',      // Purple
          'rgba(0, 128, 128, 0.8)',      // Teal
          'rgba(128, 128, 0, 0.8)',      // Olive
          'rgba(255, 105, 180, 0.8)',    // Hot Pink
          'rgba(255, 165, 0, 0.8)',      // Orange
          'rgba(0, 255, 255, 0.8)',      // Cyan
          'rgba(75, 0, 130, 0.8)',       // Indigo
          'rgba(255, 20, 147, 0.8)',     // Deep Pink
          'rgba(154, 205, 50, 0.8)',     // Yellow Green
          'rgba(173, 216, 230, 0.8)',    // Light Blue
          'rgba(34, 139, 34, 0.8)',      // Forest Green
          'rgba(255, 140, 0, 0.8)',      // Dark Orange
          'rgba(0, 191, 255, 0.8)',      // Deep Sky Blue
          'rgba(218, 112, 214, 0.8)',    // Orchid
          'rgba(210, 105, 30, 0.8)',     // Chocolate
          'rgba(255, 215, 0, 0.8)'       // Gold
        ],
        borderWidth: 0,
        hoverOffset: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      onClick: (event, elements) => {
        console.log(`Clicked ${elements.length} elements`);

        if (elements.length > 0) {
          const index = elements[0].index;
          const category = labels[index];
          showTransactionTable(category);
        }
      },
      plugins: {
        datalabels: {
          formatter: (value, ctx) => {
            const dataset = ctx.chart.data.datasets[0];
            const meta = ctx.chart.getDatasetMeta(0);
            const total = dataset.data.reduce((acc, data) => acc + parseFloat(data), 0);
            const percentage = ((value / total) * 100).toFixed(1);
            // Return empty string if slice is hidden
            return meta.data[ctx.dataIndex].hidden || percentage < 3 ? '' : percentage + '%';
          },
          color: 'white',
          font: {
            weight: 'bold',
            size: 14
          },
          textStrokeColor: 'black',
          textStrokeWidth: 1,
          anchor: 'center',
          align: 'center',
          offset: 0,
          clamp: true
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const label = context.label || '';
              const value = context.raw;
              const total = context.dataset.data.reduce((acc, data) => acc + parseFloat(data), 0);
              const percentage = ((value / total) * 100).toFixed(1);
              const formattedValue = new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
              }).format(value);
              return `${formattedValue} (${percentage}%)`;
            }
          },
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          titleColor: 'white',
          bodyColor: 'white',
          borderColor: 'white',
          borderWidth: 1,
          padding: 10,
          displayColors: false // This removes the color box in the tooltip
        },
        legend: {
          position: 'right',
          labels: {
            font: {
              size: 16,
              weight: 'bold',
            },
            generateLabels: (chart) => {
              const data = chart.data;
              if (data.labels.length && data.datasets.length) {
                console.log("Generating labels....");

                return data.labels.map((label, i) => {
                  const dataset = data.datasets[0];
                  const value = dataset.data[i];
                  const total = dataset.data.reduce((acc, data) => acc + parseFloat(data), 0);
                  const percentage = ((value / total) * 100).toFixed(1);
                  // Access metadata based on Chart.js version
                  const meta = chart.getDatasetMeta(0).data[i];

                  // Check if 'hidden' property exists
                  const isHidden = meta.hidden ? meta.hidden : false;
                  console.log(`${isHidden} Metadata for label "${label}":`, meta);
                  return {
                    text: `${label}: ${percentage}%`,
                    fillStyle: dataset.backgroundColor[i],
                    hidden: isHidden,
                    index: i,
                    // // Apply strikethrough if the slice is hidden
                    textWithStrikethrough: isHidden ? toStrikethrough(`${label}: ${percentage}%`) : `${label}: ${percentage}%`,
                    // Explicitly set the color
                    fontColor: 'white', // Some Chart.js versions use 'fontColor'
                    // For Chart.js v3 and above, use 'color'
                    color: 'white',
                  };
                });
              }
              return [];
            }
          },
          onHover: (e) => {
            e.native.target.style.cursor = 'pointer';
          },
          onLeave: (e) => {
            e.native.target.style.cursor = 'default';
          },
          onClick: (e, legendItem, legend) => {
            const index = legendItem.index;
            const chart = legend.chart;
            const meta = chart.getDatasetMeta(0);
            const slice = meta.data[index];

            // Toggle the hidden state
            slice.hidden = !slice.hidden;
            // Update the chart
            chart.update();
          }
        },
        title: {
          display: true,
          text: 'Spending by Category',
          color: 'white',
          font: {size: 18, weight: 'bold'}
        }
      }
    }
  });

  resizeChart();
  console.log('Chart configuration:', window.myPieChart.config);
}

function resetChart() {
  console.log("Resetting chart...");
  if (!originalCSVData) {
    console.error("No original data available to reset");
    return;
  }
  const transactions = parseCSV(originalCSVData);
  if (transactions && transactions.length > 0) {
    if (window.myPieChart) {
      window.myPieChart.destroy();
      window.myPieChart = null;
    }
    analyzeTransactions(transactions);
    showAllTransactions();  // Add this line to show all transactions
    const resultsDiv = document.getElementById('results');
    if (resultsDiv) {
      resultsDiv.innerHTML += '<p>Chart has been reset to its original state.</p>';
      resultsDiv.style.display = 'block';
      resultsDiv.scrollIntoView({behavior: 'smooth'});
    }
  } else {
    console.error("Failed to parse original CSV data or no valid transactions found");
  }
}

function showAllTransactions() {
  showTransactionTable('All Categories');
}

function showTransactionTable(category) {
  let transactions;
  let categoryTotal = 0;
  const overallTotal = Object.values(transactionData).reduce((acc, cat) => acc + cat.total, 0);

  // Get the color for the selected category
  let headerColor = '#3498db'; // Default color
  if (category !== 'All Categories' && window.myPieChart) {
    const categoryIndex = window.myPieChart.data.labels.indexOf(category);
    if (categoryIndex !== -1) {
      headerColor = window.myPieChart.data.datasets[0].backgroundColor[categoryIndex];
    }
  }

  if (category === 'All Categories') {
    transactions = Object.values(transactionData).flatMap(cat => cat.transactions);
    categoryTotal = overallTotal;
  } else {
    transactions = transactionData[category].transactions;
    categoryTotal = transactionData[category].total;
  }

  transactions.sort((a, b) => new Date(b.Date) - new Date(a.Date));

  const percentage = ((categoryTotal / overallTotal) * 100).toFixed(1);

  const formattedTotal = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(categoryTotal);

  const resultsDiv = document.getElementById('results');
  resultsDiv.innerHTML = `
    <style>
      .transaction-table {
        width: 100%;
        border-collapse: separate;
        border-spacing: 0;
        border-radius: 8px;
        overflow: hidden;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        background-color: #2c3e50;
        color: #ecf0f1;
      }
      .transaction-table th,
      .transaction-table td {
        padding: 12px 15px;
        text-align: left;
      }
      .transaction-table thead {
        background-color: #34495e;
        color: #ecf0f1;
      }
      .transaction-table th {
        text-transform: uppercase;
        font-weight: bold;
        letter-spacing: 0.5px;
      }
      .transaction-table tbody tr:nth-child(even) {
        background-color: #34495e;
      }
      .transaction-table tbody tr:hover {
        background-color: #3498db;
        transition: background-color 0.3s ease;
      }
      .transaction-table .amount {
        font-weight: bold;
        color: #2ecc71;
      }
      .transaction-table .category {
        font-style: italic;
        color: #e67e22;
      }
      .table-header {
        background-color: ${headerColor};
        color: #ecf0f1;
        padding: 15px;
        border-radius: 8px 8px 0 0;
        font-size: 1.2em;
        font-weight: bold;
      }
      .table-container {
        margin-top: 20px;
        border-radius: 8px;
        overflow: hidden;
      }
    </style>
    <div class="table-container">
      <div class="table-header">Transactions for ${category} - ${formattedTotal} (${percentage}%)</div>
      <table class="transaction-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Description</th>
            <th>Amount</th>
            <th>Category</th>
          </tr>
        </thead>
        <tbody>
          ${transactions.map(t => `
            <tr>
              <td>${t.Date || 'N/A'}</td>
              <td>${t.Description || 'N/A'}</td>
              <td class="amount">${t.Amount ? '$' + parseFloat(t.Amount).toFixed(2) : 'N/A'}</td>
              <td class="category">${t.Category || 'N/A'}</td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>
  `;
  resultsDiv.style.display = 'block';
  resultsDiv.scrollIntoView({behavior: 'smooth'});
}

function resizeChart() {
  const container = document.getElementById('chartContainer');
  const canvas = document.getElementById('categoryChart');
  if (container && canvas && window.myPieChart) {
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    const aspectRatio = 1; // For a perfect circle
    let chartWidth, chartHeight;

    if (containerWidth / containerHeight > aspectRatio) {
      // Container is wider than needed, height is the limiting factor
      chartHeight = Math.min(containerHeight, 600); // Limit to max height
      chartWidth = chartHeight * aspectRatio;
    } else {
      // Container is taller than needed, width is the limiting factor
      chartWidth = Math.min(containerWidth, 800); // Limit to max width
      chartHeight = chartWidth / aspectRatio;
    }

    canvas.style.width = `${chartWidth}px`;
    canvas.style.height = `${chartHeight}px`;
    canvas.width = chartWidth * window.devicePixelRatio;
    canvas.height = chartHeight * window.devicePixelRatio;

    window.myPieChart.resize();
  }
}
window.addEventListener('resize', () => {
  clearTimeout(window.resizeTimer);
  window.resizeTimer = setTimeout(() => {
    console.log('Window resized, adjusting chart...');
    resizeChart();
  }, 250);
});
