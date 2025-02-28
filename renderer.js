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
      let value = row[index] ? row[index].trim() : '';
      
      // Remove double quotes from Description field if present
      if ((header === 'Description' || header === 'Vendor') && value) {
        value = value.replace(/["]/g, '');
      }
      
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

  // Send all transactions to main process for detail view
  if (window.electronAPI) {
    try {
      // Store all transactions in main process
      const allTransactions = Object.values(transactionData).flatMap(cat => cat.transactions);
      window.electronAPI.storeTransactions(allTransactions);
    } catch (error) {
      console.error('Failed to send transactions to main process:', error);
    }
  }

  createOrUpdateChart(transactionData);
  showAllTransactions();
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
            
            // Calculate percentage of visible total (not overall total)
            const visibleTotal = dataset.data.reduce((acc, data, index) => {
              // Only include slices that aren't hidden
              if (!meta.data[index].hidden) {
                return acc + parseFloat(data);
              }
              return acc;
            }, 0);
            
            const percentage = ((value / visibleTotal) * 100).toFixed(1);
            
            // Determine minimum percentage threshold based on number of visible slices
            const visibleSlices = meta.data.filter(slice => !slice.hidden).length;
            const percentageThreshold = visibleSlices > 8 ? 5 : 3; // Lower threshold if fewer slices are visible
            
            // Return empty string if slice is hidden or too small
            return meta.data[ctx.dataIndex].hidden || percentage < percentageThreshold ? '' : percentage + '%';
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
              
              // Get meta to check which slices are visible
              const meta = context.chart.getDatasetMeta(0);
              
              // Calculate visible total for tooltips
              const visibleTotal = context.dataset.data.reduce((acc, data, index) => {
                if (!meta.data[index].hidden) {
                  return acc + parseFloat(data);
                }
                return acc;
              }, 0);
              
              // Show percentage based on visible total
              const percentage = ((value / visibleTotal) * 100).toFixed(1);
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
                  
                  // Always use the overall total for legend percentages
                  // This keeps legend percentages consistent regardless of which slices are hidden
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
            
            // Recalculate percentages based on visible slices
            const dataset = chart.data.datasets[0];
            const visibleTotal = dataset.data.reduce((acc, data, index) => {
              if (!chart.getDatasetMeta(0).data[index].hidden) {
                return acc + parseFloat(data);
              }
              return acc;
            }, 0);
            
            console.log(`Toggled slice visibility. Visible total: ${visibleTotal}`);
            
            // Update the chart with the new percentages
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

// Global variables for sorting state
let currentSortColumn = 'Date';
let currentSortDirection = 'desc';
let currentCategory = 'All Categories';
let currentTransactions = [];

function showTransactionTable(category) {
  currentCategory = category;
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
    currentTransactions = Object.values(transactionData).flatMap(cat => cat.transactions);
    categoryTotal = overallTotal;
  } else {
    currentTransactions = transactionData[category].transactions;
    categoryTotal = transactionData[category].total;
  }

  // Initial sort (Date descending by default)
  currentTransactions.sort((a, b) => new Date(b.Date) - new Date(a.Date));

  const percentage = ((categoryTotal / overallTotal) * 100).toFixed(1);

  const formattedTotal = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(categoryTotal);

  const resultsDiv = document.getElementById('results');
  
  // Create the HTML structure first
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
        cursor: pointer;
        user-select: none;
        position: relative;
      }
      .transaction-table th:hover {
        background-color: #2c3e50;
      }
      .transaction-table th::after {
        content: '';
        position: absolute;
        right: 8px;
        top: 50%;
        transform: translateY(-50%);
        opacity: 0.7;
      }
      .transaction-table th.sort-asc::after {
        content: '▲';
        font-size: 0.7em;
      }
      .transaction-table th.sort-desc::after {
        content: '▼';
        font-size: 0.7em;
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
      .vendor-cell {
        cursor: pointer;
        text-decoration: underline;
        color: #3498db;
      }
      .vendor-cell:hover {
        color: #2980b9;
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
      <table class="transaction-table" id="transaction-table">
        <thead>
          <tr>
            <th data-column="Date">Date</th>
            <th data-column="Vendor">Vendor</th>
            <th data-column="Description">Description</th>
            <th data-column="Amount">Amount</th>
            ${category === 'All Categories' ? '<th data-column="Category">Category</th>' : ''}
          </tr>
        </thead>
        <tbody id="transactions-tbody">
        </tbody>
      </table>
    </div>
  `;
  
  // Then populate the table with rows using DOM methods
  const tbody = document.getElementById('transactions-tbody');
  
  // Clear any existing rows
  tbody.innerHTML = '';
  
  // Add each transaction as a row
  currentTransactions.forEach(t => {
    const row = document.createElement('tr');
    
    // Date cell
    const dateCell = document.createElement('td');
    dateCell.textContent = t.Date || 'N/A';
    row.appendChild(dateCell);
    
    // Vendor cell with click handler
    const vendorCell = document.createElement('td');
    vendorCell.className = 'vendor-cell';
    vendorCell.textContent = t.Vendor || 'N/A';
    vendorCell.addEventListener('click', () => {
      openVendorDetails(t.Vendor);
    });
    row.appendChild(vendorCell);
    
    // Description cell (now not clickable)
    const descCell = document.createElement('td');
    descCell.textContent = t.Description || 'N/A';
    row.appendChild(descCell);
    
    // Amount cell
    const amountCell = document.createElement('td');
    amountCell.className = 'amount';
    amountCell.textContent = t.Amount ? '$' + parseFloat(t.Amount).toFixed(2) : 'N/A';
    row.appendChild(amountCell);
    
    // Category cell - only add if viewing all categories
    if (category === 'All Categories') {
      const catCell = document.createElement('td');
      catCell.className = 'category';
      catCell.textContent = t.Category || 'N/A';
      row.appendChild(catCell);
    }
    
    tbody.appendChild(row);
  });
  
  // Add click event listeners to table headers for sorting
  document.querySelectorAll('.transaction-table th').forEach(th => {
    th.addEventListener('click', () => {
      const column = th.getAttribute('data-column');
      sortTransactions(column);
    });
    
    // Add sort indicator to the current sort column
    if (th.getAttribute('data-column') === currentSortColumn) {
      th.classList.add(currentSortDirection === 'asc' ? 'sort-asc' : 'sort-desc');
    }
  });
  
  resultsDiv.style.display = 'block';
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

/**
 * Sort transactions by the specified column
 * @param {string} column - The column to sort by
 * @param {boolean} initialRender - Whether this is the initial rendering (don't toggle direction)
 */
function sortTransactions(column, initialRender = false) {
  // Remove sort indicators from all headers
  document.querySelectorAll('.transaction-table th').forEach(th => {
    th.classList.remove('sort-asc', 'sort-desc');
  });
  
  // If same column and not initial render, toggle direction
  if (column === currentSortColumn && !initialRender) {
    currentSortDirection = currentSortDirection === 'asc' ? 'desc' : 'asc';
  } else if (!initialRender) {
    currentSortColumn = column;
    // Set default direction based on column type
    if (column === 'Amount') {
      currentSortDirection = 'desc'; // Largest amounts first
    } else if (column === 'Date') {
      currentSortDirection = 'desc'; // Newest dates first
    } else {
      currentSortDirection = 'asc'; // A-Z for text
    }
  }
  
  // Add sort indicator to current sort column (if table exists)
  const th = document.querySelector(`.transaction-table th[data-column="${column}"]`);
  if (th) {
    th.classList.add(currentSortDirection === 'asc' ? 'sort-asc' : 'sort-desc');
  }
  
  // Sort the transactions
  currentTransactions.sort((a, b) => {
    let valueA = a[column] || '';
    let valueB = b[column] || '';
    
    // Special handling for date values
    if (column === 'Date') {
      valueA = new Date(valueA);
      valueB = new Date(valueB);
      return currentSortDirection === 'asc' 
        ? valueA - valueB 
        : valueB - valueA;
    }
    
    // Special handling for amount values
    if (column === 'Amount') {
      valueA = parseFloat(valueA) || 0;
      valueB = parseFloat(valueB) || 0;
      return currentSortDirection === 'asc' 
        ? valueA - valueB 
        : valueB - valueA;
    }
    
    // Case-insensitive string comparison for text
    valueA = valueA.toString().toLowerCase();
    valueB = valueB.toString().toLowerCase();
    
    if (valueA < valueB) return currentSortDirection === 'asc' ? -1 : 1;
    if (valueA > valueB) return currentSortDirection === 'asc' ? 1 : -1;
    return 0;
  });
  
  // Clear and redraw the table with sorted data
  const tbody = document.getElementById('transactions-tbody');
  if (tbody) {
    // Clear existing rows
    tbody.innerHTML = '';
    
    // Add each sorted transaction as a row
    currentTransactions.forEach(t => {
      const row = document.createElement('tr');
      
      // Date cell
      const dateCell = document.createElement('td');
      dateCell.textContent = t.Date || 'N/A';
      row.appendChild(dateCell);
      
      // Vendor cell with click handler
      const vendorCell = document.createElement('td');
      vendorCell.className = 'vendor-cell';
      vendorCell.textContent = t.Vendor || 'N/A';
      vendorCell.addEventListener('click', () => {
        openVendorDetails(t.Vendor);
      });
      row.appendChild(vendorCell);
      
      // Description cell
      const descCell = document.createElement('td');
      descCell.textContent = t.Description || 'N/A';
      row.appendChild(descCell);
      
      // Amount cell
      const amountCell = document.createElement('td');
      amountCell.className = 'amount';
      amountCell.textContent = t.Amount ? '$' + parseFloat(t.Amount).toFixed(2) : 'N/A';
      row.appendChild(amountCell);
      
      // Category cell - only add if viewing all categories
      if (currentCategory === 'All Categories') {
        const catCell = document.createElement('td');
        catCell.className = 'category';
        catCell.textContent = t.Category || 'N/A';
        row.appendChild(catCell);
      }
      
      tbody.appendChild(row);
    });
  }
}

// Function to open a new window showing transactions with the same vendor
function openVendorDetails(vendor) {
  console.log(`Opening detail window for vendor: ${vendor}`);
  window.electronAPI.showVendorDetail(vendor);
}