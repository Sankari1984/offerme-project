# otp_whatsapp_clean.py
from flask import Flask, request, session, render_template_string
from twilio.rest import Client

app = Flask(__name__)
app.secret_key = 'otp-secret'

# Twilio credentials
TWILIO_ACCOUNT_SID = 'ACddb420ce5eab8df62490ae18af483eed'
TWILIO_AUTH_TOKEN = 'dcb7ca3b7d43bbd76b763f3d6f1c3c39'
VERIFY_SERVICE_SID = 'VA7ef260979e3acb78d436c7f0cad72bc8'

client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)

# واجهة HTML
HTML_PAGE = """
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head><meta charset="UTF-8"><title>OTP عبر واتساب</title></head>
<body>
  <h2>🔐 التحقق برمز واتساب</h2>
  <form action="/send_otp" method="post">
    رقمك (بدون +): <input type="text" name="phone" required>
    <button type="submit">📩 إرسال الكود</button>
  </form>
  <br>
  <form action="/verify_otp" method="post">
    الرمز: <input type="text" name="otp" required>
    <button type="submit">✅ تحقق</button>
  </form>
  {% if message %}
    <p style="color: green;">{{ message }}</p>
  {% endif %}
</body>
</html>
"""

@app.route('/', methods=['GET'])
def index():
    return render_template_string(HTML_PAGE)

@app.route('/send_otp', methods=['POST'])
def send_otp():
    phone = request.form['phone'].strip()
    to_number = f'whatsapp:+974{phone}'
    session['phone'] = to_number

    try:
        client.verify.services(VERIFY_SERVICE_SID).verifications.create(
            to=to_number,
            channel="whatsapp"
        )
        return render_template_string(HTML_PAGE, message="✅ تم إرسال كود التحقق عبر واتساب")
    except Exception as e:
        print("❌ خطأ أثناء الإرسال:", e)
        return render_template_string(HTML_PAGE, message="❌ فشل إرسال الكود: تأكد من تفعيل القالب.")

@app.route('/verify_otp', methods=['POST'])
def verify_otp():
    otp = request.form['otp'].strip()
    to_number = session.get('phone', '')

    if not to_number:
        return render_template_string(HTML_PAGE, message="❌ لا يوجد رقم محفوظ!")

    try:
        result = client.verify.services(VERIFY_SERVICE_SID).verification_checks.create(
            to=to_number,
            code=otp
        )
        if result.status == "approved":
            return render_template_string(HTML_PAGE, message="🎉 تم التحقق بنجاح!")
        else:
            return render_template_string(HTML_PAGE, message="❌ الكود غير صحيح أو منتهي.")
    except Exception as e:
        print("❌ خطأ في التحقق:", e)
        return render_template_string(HTML_PAGE, message="❌ حدث خطأ أثناء التحقق.")

if __name__ == '__main__':
    app.run(debug=True)
