const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');

const argv = yargs(hideBin(process.argv))
  .option('output', {
    alias: 'o',
    type: 'string',
    description: 'Output file name',
    default: 'mergedOutput.xlsx'
  })
  .help()
  .argv;

const serialDateToISODate = (serialDate) => {
  const excelStartDate = new Date(1899, 11, 31);
  const correctDate = new Date(excelStartDate.getTime() + serialDate * 24 * 60 * 60 * 1000);
  return correctDate.toISOString().slice(0, 10);  // Return date in YYYY-MM-DD format
}

const sumColumns = (data) => {
    return data.reduce((accum, row) => {
        Object.keys(row).forEach(key => {
            if (key !== 'Date' && typeof row[key] === 'number') {
                accum[key] = (accum[key] || 0) + row[key];
            }
        });
        return accum;
    }, { 'Date': data[0]['Date'] });
};

const mergeData = (files) => {
  let mergedData = [];

  files.forEach(file => {
    const workbook = XLSX.readFile(file, {type: 'file'});
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    let data = XLSX.utils.sheet_to_json(sheet);

    // Convert Excel serial date numbers to standard date strings
    data = data.map(row => {
        if (typeof row['Date'] === 'number') {
            row['Date'] = serialDateToISODate(row['Date']);
        }
        return row;
    });

    // Group by date and sum columns for nutrition data
    if (file.includes('Nutrition')) {  // Assuming the nutrition files have 'nutrition' in their name
        const grouped = {};
        data.forEach(row => {
            if (!grouped[row['Date']]) {
                grouped[row['Date']] = [];
            }
            grouped[row['Date']].push(row);
        });
        data = Object.values(grouped).map(group => sumColumns(group));
    }

    if (mergedData.length === 0) {
      mergedData = data;
    } else {
      data.forEach(row => {
        const dateValue = row['Date'];
        const existingRow = mergedData.find(r => r['Date'] === dateValue);

        if (existingRow) {
          Object.keys(row).forEach(key => {
            if (key !== 'Date') existingRow[key] = row[key];
          });
        } else {
          mergedData.push(row);
        }
      });
    }
  });

  return mergedData;
};

const writeMergedDataToFile = (data, outputFile) => {
  const newWorkbook = XLSX.utils.book_new();
  const newWorksheet = XLSX.utils.json_to_sheet(data);
  
  XLSX.utils.book_append_sheet(newWorkbook, newWorksheet, "Merged Data");
  XLSX.writeFile(newWorkbook, outputFile);
};

// Get all CSV files in the "raw" folder
const filesDir = path.join(__dirname, 'raw');
const allFiles = fs.readdirSync(filesDir);
const csvFiles = allFiles.filter(file => path.extname(file) === '.csv').map(file => path.join(filesDir, file));

// Using the functions
const mergedData = mergeData(csvFiles);
writeMergedDataToFile(mergedData, argv.output);
