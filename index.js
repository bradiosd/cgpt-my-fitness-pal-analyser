const express = require('express');
const fs = require('fs');
const Papa = require('papaparse');

const app = express();
const port = 3000;

// Set EJS as the view engine
app.set('view engine', 'ejs');

app.get('/', (req, res) => {
  // Read the CSV file
  fs.readFile('./output.csv', 'utf8', (err, csvData) => {
    if (err) {
      return res.status(500).send('Error reading CSV data.');
    }

    // Parse CSV data
    const parsedData = Papa.parse(csvData, {
      header: true,
      dynamicTyping: true,
    });

    const records = parsedData.data;

    // Extract desired data for plotting
    // Helper function to get the month-year identifier
    function getMonthYear(dateString) {
      const date = new Date(dateString);
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    }

    // Initialize an empty object to hold aggregated data
    const aggregatedData = {};

    const metricsMap = {
      Weight: 'weight',
      Calories: 'calories',
      'Exercise Minutes': 'exerciseMinutes',
      'Carbohydrates (g)': 'carbs',
      'Protein (g)': 'proteins',
      'Fat (g)': 'fats',
      Sugar: 'sugars',
    };

    records.forEach((record) => {
      const monthYear = getMonthYear(record['Date']);

      if (!aggregatedData[monthYear]) {
        aggregatedData[monthYear] = {};
        for (let key in metricsMap) {
          aggregatedData[monthYear][`${metricsMap[key]}Sum`] = 0;
          aggregatedData[monthYear][`${metricsMap[key]}Count`] = 0;
        }
      }

      for (let key in metricsMap) {
        if (record[key]) {
          aggregatedData[monthYear][`${metricsMap[key]}Sum`] += record[key];
          aggregatedData[monthYear][`${metricsMap[key]}Count`]++;
        }
      }
    });

    let dates = Object.keys(aggregatedData).sort();
    let datesWeights = dates
      .map((date) => {
        if (aggregatedData[date].weightCount === 0) {
          return null;
        }
        return {
          date: date,
          weight: aggregatedData[date].weightSum / aggregatedData[date].weightCount,
        };
      })
      .filter((item) => item !== null);

    let filteredDates = datesWeights.map((item) => item.date);
    let filteredWeights = datesWeights.map((item) => item.weight);

    let filteredCalories = filteredDates.map((date) => aggregatedData[date].caloriesSum / (aggregatedData[date].caloriesCount || 1));
    let filteredExerciseMinutes = filteredDates.map((date) => aggregatedData[date].exerciseMinutesSum / (aggregatedData[date].exerciseMinutesCount || 1));
    let filteredCarbs = filteredDates.map((date) => aggregatedData[date].carbsSum / (aggregatedData[date].carbsCount || 1));
    let filteredProteins = filteredDates.map((date) => aggregatedData[date].proteinsSum / (aggregatedData[date].proteinsCount || 1));
    let filteredFats = filteredDates.map((date) => aggregatedData[date].fatsSum / (aggregatedData[date].fatsCount || 1));
    let filteredSugars = filteredDates.map((date) => aggregatedData[date].sugarsSum / (aggregatedData[date].sugarsCount || 1));

    // After processing and aggregating your CSV data:
    res.render('dashboard', {
      dates: filteredDates,
      weights: filteredWeights,
      calories: filteredCalories,
      exerciseMinutes: filteredExerciseMinutes,
      carbs: filteredCarbs,
      proteins: filteredProteins,
      fats: filteredFats,
      sugars: filteredSugars,
    });
  });
});

app.listen(port, () => {
  console.log(`Server started at http://localhost:${port}`);
});
