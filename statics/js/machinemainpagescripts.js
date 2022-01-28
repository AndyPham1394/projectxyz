const ctx = document.getElementById("chart").getContext("2d");
const ctx2 = document.getElementById("chart2").getContext("2d");
// get current url
var url = window.location.href.replaceAll(/#.*/g, "");
// get esp8266 data
function showChart() {
  if (document.getElementById("chart").hidden === true) {
    document.getElementById("chart").hidden = false;
    document.getElementById("chart2").hidden = false;
    document.getElementById("showchartbutton").innerHTML = "Hide Data Chart";
  } else {
    document.getElementById("chart").hidden = true;
    document.getElementById("chart2").hidden = true;
    document.getElementById("showchartbutton").innerHTML = "Show Data Chart";
  }
}
var esp8266data = [
  {
    hour: 0,
    temp: 0,
    hum: 0,
    lux: 0,
    count: 0,
  },
];
fetch(`${url}/getesp8266data`, {
  method: "GET",
})
  .then((res) => {
    return res.json();
  })
  .then((data) => {
    data.data.forEach((element) => {
      let date = new Date(element.time);
      let x = esp8266data.find((element) => element.hour === date.getHours());
      if (x) {
        x.temp += element.temp;
        x.hum += element.hum;
        x.lux += element.lux;
        x.count++;
      } else {
        esp8266data.push({
          hour: date.getHours(),
          temp: element.temp,
          hum: element.hum,
          lux: element.lux,
          count: 1,
        });
      }
    });
    let label = [];
    let datasheettemp = [];
    let datasheetlux = [];
    esp8266data.forEach((element) => {
      element.temp = Math.round(element.temp / element.count);
      element.hum = Math.round(element.hum / element.count);
      element.lux = element.lux / element.count;
      label.push(element.hour + "h");
      datasheettemp.push(element.temp);
      datasheetlux.push(element.lux);
    });
    const myChart = new Chart(ctx, {
      type: "line",
      data: {
        labels: label,
        datasets: [
          {
            label: "Temperature (°C)",
            data: datasheettemp,
            backgroundColor: ["rgba(105, 0, 132, .2)"],
            borderColor: ["rgba(200, 99, 132, .7)"],
            borderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
      },
    });
    const myChart2 = new Chart(ctx2, {
      type: "line",
      data: {
        labels: label,
        datasets: [
          {
            label: "light intensity (Lux)",
            data: datasheetlux,
            backgroundColor: ["rgba(0, 137, 132, .2)"],
            borderColor: ["rgba(0, 10, 130, .7)"],
            borderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
      },
    });
    return data;
  });
