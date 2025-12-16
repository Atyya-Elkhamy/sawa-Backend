// utils/timePeriods.js

const getStartOfToday = () => {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now;
};

const getStartOfNextDay = () => {
  const now = new Date();
  now.setDate(now.getDate() + 1);
  now.setHours(0, 0, 0, 0);
  return now;
};

const getStartOfWeek = () => {
  const now = new Date();
  const day = now.getDay(); // 0=Sunday, 1=Monday, ..., 5=Friday, 6=Saturday
  let diff;
  if (day >= 5) {
    // For Friday (5) and Saturday (6), subtract the difference from Friday
    diff = now.getDate() - (day - 5);
  } else {
    // For Sunday through Thursday, go back to last Friday
    diff = now.getDate() - (day + 2);
  }
  const startOfWeek = new Date(now.setDate(diff));
  startOfWeek.setHours(0, 0, 0, 0);
  return startOfWeek;
};

const getStartOfNextWeek = () => {
  const now = new Date();
  const day = now.getDay();
  let diff;
  if (day >= 5) {
    // For Friday (5) and Saturday (6), add days until next Friday
    diff = now.getDate() + (12 - day);
  } else {
    // For Sunday through Thursday, add days until next Friday
    diff = now.getDate() + (5 - day);
  }
  const startOfNextWeek = new Date(now.setDate(diff));
  startOfNextWeek.setHours(0, 0, 0, 0);
  return startOfNextWeek;
};

const getStartOfMonth = () => {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  startOfMonth.setHours(0, 0, 0, 0);
  return startOfMonth;
};

const getStartOfNextMonth = () => {
  const now = new Date();
  const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  startOfNextMonth.setHours(0, 0, 0, 0);
  return startOfNextMonth;
};
const getMonthDateRange = () => {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999); // End of the current month
  return { startOfMonth, endOfMonth };
};
const calculateFormattedTimeLeft = (endDate) => {
  const now = new Date();
  const timeLeft = endDate - now;

  // Return all zeros if the time has passed
  if (timeLeft < 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0 };
  }

  const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
  const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

  return { days, hours, minutes, seconds };
};
const weekAgo = () => {
  const now = new Date();
  now.setDate(now.getDate() - 7);
  now.setHours(0, 0, 0, 0);
  return now;
};
module.exports = {
  getStartOfToday,
  getStartOfWeek,
  getStartOfMonth,
  getMonthDateRange,
  calculateFormattedTimeLeft,
  getStartOfNextDay,
  getStartOfNextWeek,
  getStartOfNextMonth,
  weekAgo,
};
