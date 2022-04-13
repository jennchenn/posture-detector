export const WHITE = "#FFFFFF";
export const DARK_GREEN = "#00B050";
export const GREEN = "#00F328";
export const LIGHT_GREEN = "#C8FF61";
export const YELLOW = "#F7FB1D";
export const LIGHT_ORANGE = "#F8AE17";
export const DARK_ORANGE = "#D76016";
export const RED = "#9C0E1F";
export const MAGENTA = "#D44288";

export const getPressureColor = (pressureValue) => {
  return pressureValue > 4.9
    ? WHITE
    : pressureValue > 4.8
    ? DARK_GREEN
    : pressureValue > 4.7
    ? GREEN
    : pressureValue > 4.5
    ? LIGHT_GREEN
    : pressureValue > 4
    ? YELLOW
    : pressureValue > 3.5
    ? LIGHT_ORANGE
    : pressureValue > 3
    ? DARK_ORANGE
    : pressureValue > 2
    ? MAGENTA
    : RED;
};
