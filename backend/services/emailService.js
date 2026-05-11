const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendBudgetAlert = async (userEmail, userName, category, spent, limit) => {
  const percentage = Math.round((spent / limit) * 100);
  const isExceeded = percentage >= 100;
  const statusColor = isExceeded ? '#ef4444' : '#f59e0b';
  const statusText = isExceeded ? '🚨 BUDGET EXCEEDED!' : '⚠️ Budget Warning';
  const barColor = isExceeded ? '#ef4444' : '#f59e0b';

  const htmlContent = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #1a1a2e; color: #e0e0e0; border-radius: 12px; overflow: hidden;">
      <div style="background: linear-gradient(135deg, ${statusColor}, ${isExceeded ? '#dc2626' : '#d97706'}); padding: 30px; text-align: center;">
        <h1 style="margin: 0; color: #fff; font-size: 24px;">${statusText}</h1>
        <p style="margin: 8px 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">${category} spending at ${percentage}%</p>
      </div>
      
      <div style="padding: 30px;">
        <p style="font-size: 16px; margin-bottom: 20px;">Hi <strong>${userName}</strong>,</p>
        
        <p style="font-size: 15px; line-height: 1.6;">
          Your spending in the <strong style="color: ${statusColor};">${category}</strong> category has reached 
          <strong style="color: ${statusColor};">${percentage}%</strong> of your budget limit.
        </p>

        <div style="background: #16213e; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
            <span>Spent: <strong style="color: ${statusColor};">₹${spent.toLocaleString('en-IN')}</strong></span>
            <span>Limit: <strong>₹${limit.toLocaleString('en-IN')}</strong></span>
          </div>
          
          <div style="background: #0f3460; border-radius: 20px; height: 24px; overflow: hidden;">
            <div style="background: linear-gradient(90deg, ${barColor}, ${isExceeded ? '#ef4444' : '#fbbf24'}); height: 100%; width: ${Math.min(percentage, 100)}%; border-radius: 20px; transition: width 0.5s;"></div>
          </div>
          <p style="text-align: center; margin: 8px 0 0; font-size: 14px; color: #94a3b8;">${percentage}% used</p>
        </div>

        <p style="font-size: 14px; color: #94a3b8; line-height: 1.6;">
          ${isExceeded 
            ? '🔴 You have exceeded your budget! Consider reviewing your expenses and adjusting your spending habits.' 
            : '🟡 You are approaching your budget limit. Be mindful of your upcoming expenses.'}
        </p>

        <div style="text-align: center; margin-top: 24px;">
          <p style="font-size: 14px; color: #94a3b8;">Login to SpendWise to review your expenses</p>
        </div>
      </div>
      
      <div style="background: #16213e; padding: 16px; text-align: center; font-size: 12px; color: #64748b;">
        SpendWise — Your Personal Expense Tracker
      </div>
    </div>
  `;

  const mailOptions = {
    from: `"SpendWise Alerts" <${process.env.EMAIL_USER}>`,
    to: userEmail,
    subject: `Budget Alert: ${category} at ${percentage}%`,
    html: htmlContent,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`📧 Budget alert sent to ${userEmail} for ${category}`);
  } catch (error) {
    console.error('❌ Email send error:', error.message);
  }
};

module.exports = { sendBudgetAlert };
