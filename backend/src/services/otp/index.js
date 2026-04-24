const consoleProvider = require('./consoleProvider');

const sendOtp = async (phone, otp) => {
  const mode = process.env.OTP_DELIVERY_MODE;

  if (!mode) {
    throw new Error('OTP_DELIVERY_MODE is not set. Refusing to start OTP service.');
  }

  if (mode === 'console') {
    return consoleProvider.send(phone, otp);
  }

  if (mode === 'sms') {
    throw new Error('SMS provider not implemented yet');
  }

  throw new Error(`Unsupported OTP_DELIVERY_MODE: ${mode}`);
};

module.exports = {
  sendOtp,
};
