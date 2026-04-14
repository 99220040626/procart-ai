package com.procart.service;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

@Service
public class EmailService {

    @Autowired
    private JavaMailSender mailSender;

    public void sendHtmlReceipt(String toEmail, String customerName, String cartSummary, double total) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom("sivasanthoshmanyam48@gmail.com");
            helper.setTo(toEmail);
            helper.setSubject("ProCart: Your Premium Order Receipt 🚀");

            String htmlTemplate = """
                <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f1f5f9; padding: 40px 10px;">
                    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.05);">
                        <div style="background: linear-gradient(135deg, #0f172a 0%%, #2563eb 100%%); padding: 40px 20px; text-align: center;">
                            <h1 style="color: #ffffff; margin: 0; font-size: 32px; letter-spacing: -1px; font-weight: 900;">ProCart</h1>
                            <p style="color: #bfdbfe; margin: 10px 0 0 0; font-size: 16px; font-weight: 500; letter-spacing: 1px; text-transform: uppercase;">Order Confirmation</p>
                        </div>
                        <div style="padding: 40px 30px;">
                            <h2 style="margin-top: 0; color: #0f172a; font-size: 24px;">Hi %s,</h2>
                            <p style="color: #475569; font-size: 16px; line-height: 1.6;">Thank you for choosing ProCart. Your payment was successful, and we are preparing your premium gear for shipment right now!</p>
                            <div style="margin: 35px 0; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
                                <div style="background-color: #f8fafc; padding: 15px 20px; border-bottom: 1px solid #e2e8f0;">
                                    <span style="color: #64748b; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px;">Order Summary</span>
                                </div>
                                <div style="padding: 25px 20px;">
                                    <p style="color: #0f172a; font-size: 16px; font-weight: 500; margin: 0 0 20px 0; line-height: 1.8;">%s</p>
                                    <div style="border-top: 2px dashed #e2e8f0; padding-top: 20px; display: table; width: 100%%;">
                                        <div style="display: table-cell; text-align: left; color: #475569; font-size: 16px; font-weight: bold;">Total Amount Paid</div>
                                        <div style="display: table-cell; text-align: right; color: #2563eb; font-size: 28px; font-weight: 900;">₹%.2f</div>
                                    </div>
                                </div>
                            </div>
                            <div style="text-align: center; margin: 40px 0;">
                                <a href="http://localhost:3000/orders" style="background-color: #0f172a; color: #ffffff; padding: 16px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px; display: inline-block;">Track Your Order</a>
                            </div>
                            <p style="color: #475569; font-size: 14px; line-height: 1.6; margin-bottom: 0;">Need support? Just reply directly to this email.</p>
                            <p style="color: #0f172a; font-size: 14px; font-weight: 900; margin-top: 5px;">— The ProCart Team</p>
                        </div>
                        <div style="background-color: #f8fafc; padding: 25px; text-align: center; border-top: 1px solid #e2e8f0;">
                            <p style="color: #94a3b8; font-size: 12px; margin: 0; font-weight: 500;">© 2026 ProCart Inc. All rights reserved.</p>
                        </div>
                    </div>
                </div>
                """;

            String formattedHtml = String.format(htmlTemplate, customerName, cartSummary, total);
            helper.setText(formattedHtml, true);
            mailSender.send(message);
            System.out.println("SUCCESS: Premium Receipt sent to " + toEmail);
        } catch (MessagingException e) {
            System.err.println("FAILED to send email: " + e.getMessage());
        }
    }

    // NEW: Method to send Password Reset Email
    public void sendPasswordResetEmail(String toEmail, String resetLink) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom("sivasanthoshmanyam48@gmail.com");
            helper.setTo(toEmail);
            helper.setSubject("ProCart: Password Reset Request 🔐");

            String htmlTemplate = """
                <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f1f5f9; padding: 40px 10px;">
                    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.05);">
                        <div style="background: linear-gradient(135deg, #0f172a 0%%, #2563eb 100%%); padding: 40px 20px; text-align: center;">
                            <h1 style="color: #ffffff; margin: 0; font-size: 32px; letter-spacing: -1px; font-weight: 900;">ProCart</h1>
                        </div>
                        <div style="padding: 40px 30px; text-align: center;">
                            <h2 style="margin-top: 0; color: #0f172a; font-size: 24px;">Reset Your Password</h2>
                            <p style="color: #475569; font-size: 16px; line-height: 1.6;">You recently requested to reset your password for your ProCart account. Click the button below to proceed.</p>
                            
                            <div style="margin: 40px 0;">
                                <a href="%s" style="background-color: #2563eb; color: #ffffff; padding: 16px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px; display: inline-block;">Reset Password</a>
                            </div>
                            
                            <p style="color: #94a3b8; font-size: 14px;">If you did not request a password reset, please ignore this email or reply to let us know. This password reset is only valid for the next 24 hours.</p>
                        </div>
                    </div>
                </div>
                """;

            String formattedHtml = String.format(htmlTemplate, resetLink);
            helper.setText(formattedHtml, true);
            mailSender.send(message);
            System.out.println("SUCCESS: Reset Link sent to " + toEmail);
        } catch (MessagingException e) {
            System.err.println("FAILED to send reset email: " + e.getMessage());
        }
    }
    // ==========================================
    // NEW: Send Admin 2FA OTP Email
    // ==========================================
    public void sendAdminOtpEmail(String toEmail, String otp) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom("sivasanthoshmanyam48@gmail.com");
            helper.setTo(toEmail);
            helper.setSubject("ProCart Admin: Your Login Verification Code 🔒");

            String htmlTemplate = """
                <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f1f5f9; padding: 40px 10px;">
                    <div style="max-width: 500px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.05);">
                        <div style="background: linear-gradient(135deg, #0f172a 0%%, #ef4444 100%%); padding: 30px 20px; text-align: center;">
                            <h1 style="color: #ffffff; margin: 0; font-size: 28px; letter-spacing: -1px; font-weight: 900;">Admin Security</h1>
                        </div>
                        <div style="padding: 40px 30px; text-align: center;">
                            <h2 style="margin-top: 0; color: #0f172a; font-size: 22px;">Verification Required</h2>
                            <p style="color: #475569; font-size: 16px; line-height: 1.6;">Someone is attempting to log into the ProCart Admin Dashboard. Use the following 6-digit code to verify your identity.</p>
                            
                            <div style="margin: 35px 0; padding: 20px; background-color: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 12px;">
                                <span style="font-size: 36px; font-weight: 900; color: #0f172a; letter-spacing: 8px;">%s</span>
                            </div>
                            
                            <p style="color: #ef4444; font-size: 14px; font-weight: bold;">If this was not you, please secure your account immediately.</p>
                        </div>
                    </div>
                </div>
                """;

            String formattedHtml = String.format(htmlTemplate, otp);
            helper.setText(formattedHtml, true);
            mailSender.send(message);
            System.out.println("SUCCESS: Admin OTP sent to " + toEmail);
        } catch (MessagingException e) {
            System.err.println("FAILED to send OTP email: " + e.getMessage());
        }
    }
    // ==========================================
    // NEW: Guest Checkout Receipt Email
    // ==========================================
    public void sendGuestReceiptAndTracking(String toEmail, String summary, double total, String registerLink) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom("sivasanthoshmanyam48@gmail.com");
            helper.setTo(toEmail);
            helper.setSubject("ProCart: Your Guest Order Receipt 🎉");

            String htmlTemplate = """
                <div style="font-family: Arial, sans-serif; padding: 30px; background-color: #f1f5f9;">
                    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; padding: 40px; text-align: center;">
                        <h1 style="color: #0f172a; margin-top: 0;">Order Confirmed!</h1>
                        <p style="color: #475569; font-size: 16px;">Thank you for shopping as a guest! We are processing your premium gear right now.</p>
                        
                        <div style="margin: 30px 0; padding: 20px; background-color: #f8fafc; border-radius: 8px; text-align: left;">
                            <h3 style="margin-top: 0; color: #334155;">Guest Order Summary:</h3>
                            <p style="color: #0f172a; font-weight: bold;">%s</p>
                            <p style="color: #2563eb; font-size: 24px; font-weight: 900; margin-bottom: 0;">Total Paid: ₹%.2f</p>
                        </div>
                        
                        <div style="background-color: #fffbeb; border: 2px dashed #fcd34d; padding: 20px; border-radius: 8px;">
                            <h3 style="margin-top:0; color: #b45309;">Want to track your package?</h3>
                            <p style="color: #d97706; font-size: 14px;">Because you checked out as a guest, you don't have an order tracking dashboard yet. Create a free account using this exact email address to unlock tracking!</p>
                            <br/>
                            <a href="%s" style="background-color: #d97706; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">Create Account to Track</a>
                        </div>
                    </div>
                </div>
                """;

            String formattedHtml = String.format(htmlTemplate, summary, total, registerLink);
            helper.setText(formattedHtml, true);
            mailSender.send(message);
            System.out.println("SUCCESS: Guest Receipt sent to " + toEmail);
        } catch (MessagingException e) {
            System.err.println("FAILED to send guest email: " + e.getMessage());
        }
    }
}