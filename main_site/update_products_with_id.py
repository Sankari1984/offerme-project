from flask import Flask, request, session, render_template_string
from twilio.rest import Client
import random
import os
import json
from datetime import datetime

app = Flask(__name__)
app.secret_key = 'otp-secret'

# بيانات Twilio
TWILIO_ACCOUNT_SID = 'ACddb420ce5eab8df62490ae18af483eed'
TWILIO_AUTH_TOKEN = 'dcb7ca3b7d43bbd76b763f3d6f1c3c39'
TWILIO_WHATSAPP_NUMBER = 'whatsapp:+97450759755'

client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)

# ✅ HTML
HTML_PAGE = """
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head><meta charset="UTF-8"><title>OTP عبر واتساب</title></head>
<body>
  <h2>🔐 التحقق برمز واتساب</h2>
 <form action="/send_otp" method="post">
  <label>📱 رقمك (بدون +):</label>
  <input type="text" name="phone" required><br><br>

  <label>🧑 اسمك الكامل:</label>
  <input type="text" name="name" required><br><br>

  <button type="submit">📩 إرسال الكود</button>
</form>



  <form action="/verify_otp" method="post">
    الرمز: <input type="text" name="otp" required><br>
    <button type="submit">✅ تحقق</button>
  </form>

  {% if message %}
    <p>{{ message }}</p>
  {% endif %}
</body>
</html>
"""

@app.route('/', methods=['GET'])
def index():
    return render_template_string(HTML_PAGE)

@app.route('/send_otp', methods=['POST'])
def send_otp():
    phone = request.form['phone']
    name = request.form.get('name', 'بدون اسم')

    to_number = f'whatsapp:+974{phone}'
    otp = str(random.randint(100000, 999999))

    try:
        msg = client.messages.create(
            from_=TWILIO_WHATSAPP_NUMBER,
            to=to_number,
            body=f"رمز التحقق الخاص بك هو: {otp}"
        )
        print("✅ SID:", msg.sid)
        print("📬 TO:", to_number)
        print("📩 BODY:", msg.body)
        print("📊 STATUS:", msg.status)

        session['otp'] = otp
        session['phone'] = phone
        session['name'] = name
        return render_template_string(HTML_PAGE, message="✅ تم إرسال الكود عبر واتساب")
    except Exception as e:
        print("❌ خطأ في الإرسال:", e)
        return render_template_string(HTML_PAGE, message=f"❌ فشل الإرسال: {e}")

@app.route('/verify_otp', methods=['POST'])
def verify_otp():
    input_otp = request.form['otp']
    saved_otp = session.get('otp')
    phone = session.get('phone')
    name = session.get('name')

    if input_otp == saved_otp:
        # 🟢 حفظ أو تحديث الزائر
        visitor_file = 'visitors.json'
        new_data = {
            "user_id": f"viewer_{phone}",
            "full_name": name,
            "phone": phone,
            "last_updated": datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        }

        try:
            if os.path.exists(visitor_file):
                with open(visitor_file, 'r', encoding='utf-8') as f:
                    visitors = json.load(f)
            else:
                visitors = []

            found = False
            for visitor in visitors:
                if visitor['phone'] == phone:
                    visitor.update(new_data)
                    found = True
                    break

            if not found:
                visitors.append(new_data)

            with open(visitor_file, 'w', encoding='utf-8') as f:
                json.dump(visitors, f, ensure_ascii=False, indent=2)

        except Exception as e:
            print("❌ خطأ في حفظ الزائر:", e)

        session.pop('otp', None)
        return render_template_string(HTML_PAGE, message="🎉 تم التحقق بنجاح!")
    else:
        return render_template_string(HTML_PAGE, message="❌ رمز غير صحيح!")

if __name__ == '__main__':
    app.run(debug=True)
