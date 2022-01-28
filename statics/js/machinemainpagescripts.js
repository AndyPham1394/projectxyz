const ctx = document.getElementById("chart").getContext("2d");
const myChart = new Chart(ctx, {
  type: "line",
  data: {
    labels: [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "haha",
    ],
    datasets: [
      {
        label: "My First dataset",
        data: [65, 59, 80, 81, 56, 55, 40, 77],
        backgroundColor: ["rgba(105, 0, 132, .2)"],
        borderColor: ["rgba(200, 99, 132, .7)"],
        borderWidth: 2,
      },
      {
        label: "My Second dataset",
        data: [28, 48, 40, 19, 86, 27, 90, 102],
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
