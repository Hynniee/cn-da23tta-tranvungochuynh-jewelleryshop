// Vietnamese ni sizing, using DOJI's published inner-diameter chart.
export const ringSizeChart = [
  14.7, 15, 15.5, 16, 16.5, 16.7, 17, 17.5, 17.7, 18, 18.5, 18.7, 18.8, 19,
  19.2,
].map((diameter, index) => ({
  size: index + 6,
  diameter,
  circumference: diameter * Math.PI,
}));
