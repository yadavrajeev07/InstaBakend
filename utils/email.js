// Mock email service for development
const sendEmail = async (options) => {
  console.log('\n========== EMAIL NOTIFICATION ==========');
  console.log('To:', options.email);
  console.log('Subject:', options.subject);
  console.log('Message:', options.message);
  console.log('=======================================\n');
  
  return Promise.resolve({ success: true });
};

module.exports = sendEmail;