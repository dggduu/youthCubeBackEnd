const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const isValidPassword = (password) => {
  //密码至少8位，包含大小写字母和数字
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
  return passwordRegex.test(password);
};

const isValidDate = (dateString) => {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/; // YYYY-MM-DD格式
  if (!dateRegex.test(dateString))
    return false;
  
  const date = new Date(dateString);
  return date.toString() !== 'Invalid Date' && !isNaN(date.getTime());
};

module.exports = {
  isValidEmail,
  isValidPassword,
  isValidDate
};