const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const isValidPassword = (password) => {
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
  return passwordRegex.test(password);
};

const isValidDate = (dateString) => {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/; // YYYY-MM-DD 格式
  if (!dateRegex.test(dateString)) return false;

  const date = new Date(dateString);
  return date.toString() !== 'Invalid Date' && !isNaN(date.getTime());
};

export {
  isValidEmail,
  isValidPassword,
  isValidDate,
};