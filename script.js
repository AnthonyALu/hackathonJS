const QuickChart = require('quickchart-js');

const myChart = new QuickChart();
myChart
  .setConfig({
    type: 'bar',
    data: { labels: ['Hello world', 'Foo bar'], datasets: [{ label: 'Foo', data: [1, 2] }] },
  })
  .setWidth(800)
  .setHeight(400)
  .setBackgroundColor('transparent');

// Print the chart URL
console.log(myChart.getUrl());