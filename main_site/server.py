# -*- coding: utf-8 -*-

from flask import Flask, request, jsonify, send_from_directory, render_template
from flask_cors import CORS
app = Flask(__name__)
CORS(app, supports_credentials=True)
import json
import os
import uuid
import sqlite3
from werkzeug.utils import secure_filename
from urllib.parse import unquote
import requests
import smtplib
from email.message import EmailMessage
from email import policy
from datetime import datetime
from time import time
last_comment_time = {}
from uuid import uuid4
from urllib.parse import quote


import moviepy.config as mpy_config
import os
import multiprocessing


# ✅ الحصول على المسار المطلق لـ ffmpeg
ffmpeg_path = os.path.abspath("bin/ffmpeg.exe")

# ✅ وضع علامات تنصيص للمسارات التي تحتوي على فراغ
if " " in ffmpeg_path:
    ffmpeg_path = f'"{ffmpeg_path}"'

# ✅ تعيين ffmpeg لـ moviepy
print("📍 FFmpeg absolute path:", ffmpeg_path)

import subprocess

UPLOAD_FOLDER = "uploads"
HLS_FOLDER = os.path.join(UPLOAD_FOLDER, "hls")
os.makedirs(HLS_FOLDER, exist_ok=True)


def compress_video_ffmpeg(input_path, output_path):
    try:
        command = [
            ffmpeg_path,
            "-i", input_path,
            "-vcodec", "libx264",
            "-crf", "28",  # جودة وسط بين 23-30 (كلما زاد الرقم قل الحجم)
            "-preset", "fast",
            "-acodec", "aac",
            "-b:a", "128k",
            output_path
        ]
        subprocess.run(command, check=True)
        return True
    except Exception as e:
        print("❌ فشل ضغط الفيديو:", e)
        return False





with open('config.json', 'r', encoding='utf-8') as f:
    config = json.load(f)
OPENROUTER_API_KEY = config.get("openrouter_api_key", "")
print("🔑 مفتاح OpenRouter:", OPENROUTER_API_KEY)


app = Flask(__name__, template_folder='templates', static_folder='static', static_url_path='/static')

app.config['MAX_CONTENT_LENGTH'] = 300 * 1024 * 1024  # 300MB مثلاً

CORS(app, resources={r"/*": {"origins": "https://offermeqa.com"}})

import os
import json
from flask import request, jsonify

TOKENS_FILE = 'fcm_tokens.json'

# أنشئ الملف إذا ما كان موجود
if not os.path.exists(TOKENS_FILE):
    with open(TOKENS_FILE, 'w', encoding='utf-8') as f:
        json.dump({}, f)

@app.route('/save-token', methods=['POST'])
def save_token():
    data = request.get_json()
    user_id = data.get('user_id')
    token = data.get('token')

    if not user_id or not token:
        return jsonify({"status": "error", "message": "Missing user_id or token"}), 400

    with open(TOKENS_FILE, 'r', encoding='utf-8') as f:
        tokens = json.load(f)

    tokens[user_id] = token

    with open(TOKENS_FILE, 'w', encoding='utf-8') as f:
        json.dump(tokens, f, ensure_ascii=False, indent=2)

    return jsonify({"status": "success", "message": "Token saved ✅"})
import requests

FCM_API_KEY = "AAAAkUu..."  # 🔐 استبدله بمفتاح السيرفر من Firebase console (Server Key)

# 🔁 استبدل دالة send_notification القديمة بالكود التالي في server.py
# ضعه مكان الدالة القديمة مباشرة

from google.oauth2 import service_account
from google.auth.transport.requests import Request as GoogleRequest

def send_fcm_notification(user_id, title, body):
    with open(TOKENS_FILE, 'r', encoding='utf-8') as f:
        tokens = json.load(f)
    token = tokens.get(user_id)
    if not token:
        return

    credentials = service_account.Credentials.from_service_account_file(
        'service_account_key.json',
        scopes=["https://www.googleapis.com/auth/firebase.messaging"]
    )
    credentials.refresh(GoogleRequest())
    access_token = credentials.token

    headers = {
        'Authorization': f'Bearer {access_token}',
        'Content-Type': 'application/json; UTF-8',
    }

    payload = {
        "message": {
            "token": token,
            "notification": {
                "title": title,
                "body": body,
            },
            "webpush": {
                "notification": {
                    "icon": "/icon-192.png"
                }
            }
        }
    }

    requests.post(
        "https://fcm.googleapis.com/v1/projects/offer-me-c0c4b/messages:send",
        headers=headers,
        json=payload
    )


@app.route('/send-notification', methods=['POST'])
def send_notification():
    data = request.get_json()
    user_id = data.get('user_id')
    title = data.get('title', '🛎️ إشعار جديد')
    body = data.get('body', '')

    # تحميل التوكن من الملف
    with open(TOKENS_FILE, 'r', encoding='utf-8') as f:
        tokens = json.load(f)

    token = tokens.get(user_id)
    if not token:
        return jsonify({"status": "error", "message": "🚫 لا يوجد توكن لهذا المستخدم"}), 404

    # تحميل بيانات الخدمة من firebase-adminsdk
    credentials = service_account.Credentials.from_service_account_file(
        'service_account_key.json',  # 🔐 تأكد من وجوده بنفس المجلد
        scopes=["https://www.googleapis.com/auth/firebase.messaging"]
    )
    credentials.refresh(GoogleRequest())
    access_token = credentials.token

    headers = {
        'Authorization': f'Bearer {access_token}',
        'Content-Type': 'application/json; UTF-8',
    }

    payload = {
        "message": {
            "token": token,
            "notification": {
                "title": title,
                "body": body,
            },
            "android": {
                "notification": {
                    "icon": "ic_notification",
                    "color": "#fbc02d"
                }
            },
            "webpush": {
                "notification": {
                    "icon": "/icon-192.png"
                }
            }
        }
    }

    response = requests.post(
        f"https://fcm.googleapis.com/v1/projects/offer-me-c0c4b/messages:send",
        headers=headers,
        json=payload
    )

    return jsonify({
        "status": "sent" if response.status_code == 200 else "failed",
        "response": response.text
    })


UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'mp4', 'webm', 'mov'}
DATABASE_FILE = 'data/products_data.json'

USERS_FILE = 'users.json'

os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(os.path.join(UPLOAD_FOLDER, 'logos'), exist_ok=True)

if not os.path.exists(DATABASE_FILE):
    with open(DATABASE_FILE, 'w', encoding='utf-8') as f:
        json.dump([], f)

if not os.path.exists(USERS_FILE):
    with open(USERS_FILE, 'w', encoding='utf-8') as f:
        json.dump([], f)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


@app.route('/upload-logo/<user_id>', methods=['POST'])
def upload_logo(user_id):
    file = request.files.get('file')
    if not file or not allowed_file(file.filename):
        return jsonify({"status": "fail", "message": "❌ ملف غير صالح"}), 400

    logo_folder = "/var/www/offerme/uploads/avatars/logos"
    os.makedirs(logo_folder, exist_ok=True)

    for ext in ['png', 'jpg', 'jpeg', 'gif']:
        old_path = os.path.join(logo_folder, f"{user_id}_logo.{ext}")
        if os.path.exists(old_path):
            try:
                os.remove(old_path)
            except Exception as e:
                print(f"❌ تعذر حذف الشعار القديم: {e}")

    ext = file.filename.rsplit('.', 1)[1].lower()
    filename = f"{user_id}_logo.{ext}"
    filepath = os.path.join(logo_folder, filename)
    file.save(filepath)
    print("📦 اسم ملف الشعار النهائي:", filename)

    # تحديث ملف الإعدادات
    settings_file = f"settings_user_{user_id}.json"
    settings = {}
    if os.path.exists(settings_file):
        with open(settings_file, 'r', encoding='utf-8') as f:
            settings = json.load(f)

    settings['logo'] = f"/uploads/avatars/logos/{filename}"

    with open(settings_file, 'w', encoding='utf-8') as f:
        json.dump(settings, f, ensure_ascii=False, indent=2)

    return jsonify({
        "status": "success",
        "message": "✅ تم تحديث الشعار",
        "logo": f"/uploads/avatars/logos/{filename}"
    })


from time import time  # ضعه في الأعلى إذا مو موجود

products_cache = {
    "data": [],
    "last_updated": 0
}

def get_cached_products():
    now = time()
    if now - products_cache['last_updated'] > 10:  # يحدث التحديث كل 10 ثواني فقط
        with open(DATABASE_FILE, 'r', encoding='utf-8') as f:
            products_cache['data'] = json.load(f)
        products_cache['last_updated'] = now
    return products_cache['data']

products_cache = {"data": [], "last_updated": 0}
from time import time

def get_cached_products():
    now = time()
    if now - products_cache["last_updated"] > 10:
        with open(DATABASE_FILE, 'r', encoding='utf-8') as f:
            products_cache["data"] = json.load(f)
        products_cache["last_updated"] = now
    return products_cache["data"]

@app.route('/products', methods=['GET'])
def get_products():
    # جلب المنتجات
    products = get_cached_products()

    # جلب المستخدمين
    try:
        with open(USERS_FILE, 'r', encoding='utf-8') as f:
            users = json.load(f)
    except:
        users = []

    # إضافة full_name إلى كل منتج حسب user_id
    for product in products:
        user_id = product.get("user_id", "")
        user_data = next((u for u in users if u["user_id"] == user_id), None)
        product["full_name"] = user_data["full_name"] if user_data else user_id

    return jsonify(products)



@app.route('/store.html')
def store_page():
    user_id = request.args.get('user_id', '')
    highlight = request.args.get('highlight', '')
    return render_template('store.html', user_id=user_id, highlight=highlight)

@app.route('/admin.html')
def admin_page(): return render_template('admin.html')

@app.route('/upload.html')
def upload_page(): return render_template('upload.html')

@app.route('/upload_logo.html')
def upload_logo_page(): return render_template('upload_logo.html')

@app.route('/manage_tabs.html')
def manage_tabs_page(): return render_template('manage_tabs.html')

@app.route('/change_password.html')
def change_password_page(): return render_template('change_password.html')


BASE_DIR = os.path.dirname(os.path.abspath(__file__))  # 🧭 مجلد المشروع
USERS_FILE = os.path.join(BASE_DIR, "users.json")

@app.route('/users', methods=['GET'])
def get_users():
    with open(USERS_FILE, 'r', encoding='utf-8') as f:
        return jsonify(json.load(f))


@app.route('/add-user', methods=['POST'])
def add_user():
    data = request.get_json()

    if not data.get('username') or not data.get('password') or not data.get('full_name'):
        return jsonify({"status": "fail", "message": "الرجاء ملء جميع الحقول"}), 400

    if not data.get('business_type'):
        return jsonify({"status": "fail", "message": "الرجاء اختيار نوع النشاط"}), 400

    with open(USERS_FILE, 'r', encoding='utf-8') as f:
        users = json.load(f)

    if any(u['username'] == data['username'] for u in users):
        return jsonify({"status": "fail", "message": "اسم المستخدم موجود مسبقًا"}), 400

    new_user = {
        "user_id": data['username'],
        "username": data['username'],
        "password": data['password'],
        "full_name": data['full_name'],
        "business_type": data['business_type']
    }

    users.append(new_user)

    with open(USERS_FILE, 'w', encoding='utf-8') as f:
        json.dump(users, f, ensure_ascii=False, indent=4)

            # ✅ حفظ النشاط الجديد إذا غير موجود مسبقاً
    with open('business_types.json', 'r+', encoding='utf-8') as f:
        business_types = json.load(f)
        if data['business_type'] not in business_types:
            business_types.insert(-1, data['business_type'])  # قبل "أخرى"
            f.seek(0)
            json.dump(business_types, f, ensure_ascii=False, indent=4)
            f.truncate()


    return jsonify({"status": "success", "message": "✅ تم إضافة المستخدم بنجاح"})



def generate_instagram_post(user_name, product_name, description):
    prompt = f"""
اكتب بوست إنستغرام تسويقي مشوّق لمنتج اسمه "{product_name}" ووصفه "{description}".
استخدم 2 إيموجي فقط داخل النص بطريقة جذابة.
لا تذكر اسم الزبون في النص أبداً، فقط أضف هاشتاغ #{user_name} في النهاية.
اجعل البوست قصير، واضح، ويحتوي على كلمات قوية مثل: الآن، حصري، لا تفوّت، الأفضل، اكتشف، جرب.
احرص أن يحتوي على 4 هاشتاغات فقط:
- واحد باسم الزبون: #{user_name}
- واحد ثابت: #قطر
- واثنين آخرين حسب محتوى المنتج.
تجنب التكرار والجمل الطويلة.
البوست مخصص للنسخ والنشر على إنستغرام.
    """

    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json"
    }
    data = {
        "model": "openai/gpt-3.5-turbo",
        "max_tokens": 300,  # ✅ قللها لـ 300 أو أقل لتفادي الخطأ

        "messages": [
            {"role": "system", "content": "أنت كاتب محتوى تسويقي محترف في إنستغرام."},
            {"role": "user", "content": prompt}
        ]
    }

    try:
        response = requests.post("https://openrouter.ai/api/v1/chat/completions", headers=headers, json=data)
        result = response.json()
        print("🔵 رد OpenRouter:", result)  # لمراقبة المشكلة

        # ✅ تحقق إن المفتاح موجود
        if "choices" in result and result["choices"]:
            return result["choices"][0]["message"]["content"].strip()
        else:
            print("❌ الرد لا يحتوي على 'choices'")
            return "⚠️ لم يتم توليد بوست تلقائي حالياً."
    except Exception as e:
        print("❌ فشل في توليد البوست:", e)
        return "⚠️ خطأ في الاتصال بالذكاء الاصطناعي."




@app.route('/delete-product/<product_id>', methods=['DELETE'])
def delete_product(product_id):
    import shutil

    # تحميل المنتجات
    with open(DATABASE_FILE, 'r', encoding='utf-8') as f:
        products = json.load(f)

    # إيجاد المنتج المطلوب حذفه
    product_to_delete = next((p for p in products if p.get("id") == product_id), None)
    if not product_to_delete:
        return jsonify({"status": "fail", "message": "❌ المنتج غير موجود"}), 404

    # استخرج مسارات الملفات من الحقول الموجودة
    file_paths = []
    for key in ["url", "poster"]:
        if key in product_to_delete:
            path = product_to_delete[key].replace("http://192.168.18.11:5000/", "").strip("/")
            file_paths.append(path)

    # حذف ملفات HLS إذا كانت فيديوهات
    for path in file_paths:
        if path.endswith(".m3u8") and "uploads/hls/" in path:
            folder_name = path.split("uploads/hls/")[-1].split("/")[0]
            hls_folder = os.path.join("uploads", "hls", folder_name)
            if os.path.exists(hls_folder):
                try:
                    shutil.rmtree(hls_folder)
                    print(f"🗑️ تم حذف مجلد HLS: {hls_folder}")
                except Exception as e:
                    print(f"❌ فشل حذف مجلد HLS: {e}")
        else:
            full_path = os.path.join(os.getcwd(), path)
            if os.path.exists(full_path):
                try:
                    os.remove(full_path)
                    print("🗑️ تم حذف الملف:", full_path)
                except Exception as e:
                    print("⚠️ تعذر حذف الملف:", e)

    # حذف المنتج من القائمة
    products = [p for p in products if p.get("id") != product_id]
    with open(DATABASE_FILE, 'w', encoding='utf-8') as f:
        json.dump(products, f, ensure_ascii=False, indent=4)

    # حذف التعليقات الخاصة بهذا المنتج
    try:
        with open('comments.json', 'r', encoding='utf-8') as f:
            comments = json.load(f)
    except:
        comments = {}

    if product_id in comments:
        del comments[product_id]
        with open('comments.json', 'w', encoding='utf-8') as f:
            json.dump(comments, f, ensure_ascii=False, indent=2)

    return jsonify({"status": "success", "message": "✅ تم حذف المنتج وملفاته وتعليقاته بنجاح"})




@app.route('/delete-user/<user_id>', methods=['DELETE'])
def delete_user(user_id):
    import os, json, shutil
    from urllib.parse import unquote

    user_id = unquote(user_id).strip().lower()

    # حذف من users.json
    with open(USERS_FILE, 'r', encoding='utf-8') as f:
        users = json.load(f)
    users = [u for u in users if u.get('user_id', '').strip().lower() != user_id]
    with open(USERS_FILE, 'w', encoding='utf-8') as f:
        json.dump(users, f, ensure_ascii=False, indent=4)

    # حذف المنتجات والصور/الفيديوهات
    with open(DATABASE_FILE, 'r', encoding='utf-8') as f:
        products = json.load(f)

    try:
        with open('comments.json', 'r', encoding='utf-8') as f:
            comments = json.load(f)
    except:
        comments = {}

    updated_products = []
    for p in products:
        if p.get('user_id', '').strip().lower() == user_id:
            # حذف الصورة
            image_path = p.get('image', '').lstrip('/')
            if os.path.exists(image_path):
                try:
                    os.remove(image_path)
                    print(f"🧹 حذف الصورة: {image_path}")
                except:
                    pass

            # حذف الفيديو
            url = p.get('url', '')
            if "uploads/" in url:
                video_path = url.split("uploads/")[-1]
                full_path = os.path.join("uploads", video_path)
                if os.path.exists(full_path):
                    try:
                        os.remove(full_path)
                        print(f"🧹 حذف الفيديو: {full_path}")
                    except:
                        pass

            # حذف مجلد HLS
            if ".m3u8" in url:
                try:
                    folder_name = url.split("uploads/hls/")[-1].split("/")[0]
                    hls_folder = os.path.join("uploads", "hls", folder_name)
                    if os.path.exists(hls_folder):
                        shutil.rmtree(hls_folder)
                        print(f"🗑️ حذف مجلد HLS: {hls_folder}")

                    # ✅ حذف الفيديو الأصلي mp4 إن وجد
                    original_mp4_path = os.path.join("uploads", f"{folder_name}.mp4")
                    if os.path.exists(original_mp4_path):
                        try:
                            os.remove(original_mp4_path)
                            print(f"🧹 حذف الفيديو الأصلي: {original_mp4_path}")
                        except Exception as e:
                            print(f"⚠️ فشل حذف الفيديو الأصلي: {e}")
                except:
                    pass

            # حذف التعليقات
            product_id = p.get('id')
            if product_id in comments:
                del comments[product_id]
        else:
            updated_products.append(p)

    # حفظ المنتجات والتعليقات
    with open(DATABASE_FILE, 'w', encoding='utf-8') as f:
        json.dump(updated_products, f, ensure_ascii=False, indent=4)
    with open('comments.json', 'w', encoding='utf-8') as f:
        json.dump(comments, f, ensure_ascii=False, indent=4)

    # ✅ حذف ملف إعدادات المستخدم إن وجد
    settings_file = f"settings_user_{user_id}.json"
    if os.path.exists(settings_file):
        try:
            # نحاول جلب اسم اللوجو من ملف الإعدادات قبل حذفه
            with open(settings_file, 'r', encoding='utf-8') as f:
                settings_data = json.load(f)
            logo_path = os.path.join(UPLOAD_FOLDER, 'logos', f"{user_id}_logo.jpg")

            if logo_path and os.path.exists(logo_path):
                try:
                    os.remove(logo_path)
                    print(f"🧹 حذف الشعار: {logo_path}")
                except Exception as e:
                    print(f"⚠️ فشل حذف الشعار: {e}")
        except Exception as e:
            print(f"⚠️ فشل قراءة ملف الإعدادات لحذف الشعار: {e}")

        # بعد حذف الشعار، نحذف ملف الإعدادات نفسه
        try:
            os.remove(settings_file)
            print(f"🧹 حذف ملف الإعدادات: {settings_file}")
        except Exception as e:
            print(f"⚠️ فشل حذف إعدادات المستخدم: {e}")

    return jsonify({"status": "success", "message": f"✅ تم حذف بيانات المستخدم {user_id} من السيرفر."})



@app.route('/change-password/<user_id>', methods=['POST'])
def change_password(user_id):
    data = request.get_json()
    old_password = data.get('old_password')
    new_password = data.get('new_password')
    with open(USERS_FILE, 'r', encoding='utf-8') as f:
        users = json.load(f)
    for user in users:
        if user['user_id'] == user_id:
            if user['password'] == old_password:
                user['password'] = new_password
                with open(USERS_FILE, 'w', encoding='utf-8') as f:
                    json.dump(users, f, ensure_ascii=False, indent=4)
                return jsonify({"status": "success", "message": "✅ تم تغيير كلمة المرور بنجاح"})
            return jsonify({"status": "fail", "message": "❌ كلمة المرور القديمة غير صحيحة"}), 400
    return jsonify({"status": "fail", "message": "❌ المستخدم غير موجود"}), 404

@app.route('/confirm-product', methods=['POST'])
def confirm_product():
    user_id = request.form.get('user_id')
    name = request.form.get('name')
    description = request.form.get('description')
    price = request.form.get('price', '')
    post = request.form.get('post')
    affiliate_link = request.form.get('affiliate_link', '')

    file = request.files.get('file')
    image_url = request.form.get('image')

    if not all([user_id, name, description, post]) or (not file and not image_url):
        return jsonify({"status": "fail", "message": "❌ جميع الحقول مطلوبة"}), 400

    if not allowed_file(file.filename):
        return jsonify({"status": "fail", "message": "❌ نوع الملف غير مدعوم"}), 400

    ext = file.filename.rsplit('.', 1)[1].lower()
    filename = f"{uuid.uuid4()}.{ext}"

    is_video = ext in ['mp4', 'mov', 'webm']
    subfolder = 'stories' if is_video else ''
    save_folder = os.path.join(UPLOAD_FOLDER, subfolder)
    os.makedirs(save_folder, exist_ok=True)

    filepath = os.path.join(save_folder, filename)
    file.save(filepath)

    # ✅ ضغط وتحويل الفيديو إذا كان فيديو
    if is_video:
        try:
            compressed_filename = f"compressed_{filename}"
            compressed_path = os.path.join(save_folder, compressed_filename)

            if compress_video_ffmpeg(filepath, compressed_path):
                os.remove(filepath)
                filename = compressed_filename
                filepath = compressed_path
                print("✅ تم ضغط الفيديو:", filename)

                # ✅ تحويل إلى HLS
                hls_filename = filename.rsplit('.', 1)[0]
                hls_output_path = os.path.join(HLS_FOLDER, hls_filename)
                if convert_to_hls(filepath, hls_filename):

                    print("✅ تم تحويل الفيديو إلى HLS")
                    file_url = f"/{HLS_FOLDER}/{hls_filename}/index.m3u8"
                else:
                    print("❌ فشل التحويل إلى HLS")
                    file_url = f"/{UPLOAD_FOLDER}/stories/{filename}"
            else:
                file_url = f"/{UPLOAD_FOLDER}/stories/{filename}"
        except Exception as e:
            print("❌ فشل ضغط أو تحويل الفيديو:", e)
            file_url = f"/{UPLOAD_FOLDER}/stories/{filename}"
    else:
        file_url = image_url if not file else f"/{UPLOAD_FOLDER}/{filename}"

    # ✅ توليد صورة مصغرة
    if is_video:
        try:
            from moviepy.video.io.VideoFileClip import VideoFileClip
            thumbnail_folder = os.path.join(UPLOAD_FOLDER, 'thumbnails')
            os.makedirs(thumbnail_folder, exist_ok=True)
            thumb_file = os.path.join(thumbnail_folder, f"{user_id}.jpg")
            clip = VideoFileClip(filepath)
            clip.save_frame(thumb_file, t=1.0)
            clip.close()
        except Exception as e:
            print("❌ فشل توليد الصورة المصغرة:", e)

    # ✅ إضافة المنتج
    with open(DATABASE_FILE, 'r', encoding='utf-8') as f:
        products = json.load(f)

    new_product = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "name": name,
        "description": description,
        "price": price,
        "image": file_url,
        "post": post,
        "affiliate_link": affiliate_link
    }

    products.append(new_product)

    with open(DATABASE_FILE, 'w', encoding='utf-8') as f:
        json.dump(products, f, ensure_ascii=False, indent=4)

    return jsonify({"status": "success", "message": "✅ تم حفظ المنتج بنجاح"})


    

@app.route('/generate-post', methods=['POST'])
def generate_post_api():
    data = request.get_json()
    name = data.get('name')
    desc = data.get('description')
    user_id = data.get('user_id', '').replace(" ", "")
    if not name or not desc or not user_id:
        return jsonify({"status": "fail", "message": "البيانات ناقصة"}), 400
    post = generate_instagram_post(user_name=user_id, product_name=name, description=desc)


    return jsonify({"status": "success", "post": post})

@app.route('/pin-product/<product_id>', methods=['POST'])
def pin_product(product_id):
    with open(DATABASE_FILE, 'r', encoding='utf-8') as f:
        products = json.load(f)

    updated = False
    for product in products:
        if product['id'] == product_id:
            product['pinned'] = True
            updated = True
        else:
            product['pinned'] = False  # نزيل التثبيت عن باقي المنتجات

    if not updated:
        return jsonify({'status': 'error', 'message': 'Product not found'}), 404

    with open(DATABASE_FILE, 'w', encoding='utf-8') as f:
        json.dump(products, f, ensure_ascii=False, indent=2)

    return jsonify({'status': 'success', 'message': 'Product pinned successfully'})


@app.route('/likes/<product_id>', methods=['GET'])
def get_likes(product_id):
    conn = sqlite3.connect('likes.db')
    cursor = conn.cursor()
    cursor.execute('SELECT count FROM likes WHERE product_id = ?', (product_id,))
    row = cursor.fetchone()
    conn.close()
    return jsonify({'likes': row[0] if row else 0})

@app.route('/like/<product_id>', methods=['POST'])
def like_product(product_id):
    conn = sqlite3.connect('likes.db')
    cursor = conn.cursor()
    cursor.execute('SELECT count FROM likes WHERE product_id = ?', (product_id,))
    row = cursor.fetchone()

    if row:
        new_count = row[0] + 1
        cursor.execute('UPDATE likes SET count = ? WHERE product_id = ?', (new_count, product_id))
    else:
        new_count = 1
        cursor.execute('INSERT INTO likes (product_id, count) VALUES (?, ?)', (product_id, new_count))

    conn.commit()
    conn.close()
    return jsonify({'status': 'success', 'likes': new_count})



@app.route('/notifications/<user_id>')
def get_notifications(user_id):
    file_path = f'notifications_user_{user_id}.json'
    if os.path.exists(file_path):
        with open(file_path, 'r', encoding='utf-8') as f:
            return jsonify(json.load(f))
    return jsonify([])  # يرجع قائمة فاضية إذا لا يوجد إشعارات

@app.route('/business-types', methods=['GET'])
def get_business_types():
    with open('business_types.json', 'r', encoding='utf-8') as f:
        types = json.load(f)
    return jsonify(types)
from flask import send_from_directory

@app.route('/firebase-messaging-sw.js')
def serve_firebase_sw():
    return send_from_directory('.', 'firebase-messaging-sw.js')

from email.message import EmailMessage

from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

@app.route('/submit-service-request', methods=['POST'])
def submit_service_request():
    data = request.get_json()
    user_id = str(data.get('user_id', 'غير معروف')).strip()
    service_type = str(data.get('type', 'غير محدد')).strip()
    description = str(data.get('desc', '')).replace('\n', '<br>').strip()

    # جلب اسم الزبون من users.json
    full_name = user_id
    try:
        with open('users.json', 'r', encoding='utf-8') as f:
            users = json.load(f)
            user = next((u for u in users if u['user_id'] == user_id), None)
            if user:
                full_name = user.get('full_name', user_id)
    except:
        pass

    # جلب رقم الهاتف والواتساب من settings_user_<user_id>.json
    phone = ""
    whatsapp = ""
    settings_file = f"settings_user_{user_id}.json"
    if os.path.exists(settings_file):
        try:
            with open(settings_file, 'r', encoding='utf-8') as f:
                settings = json.load(f)
                phone = settings.get("phone", "")
                whatsapp = settings.get("whatsapp", "")
        except:
            pass

    # نصوص الإيميل
    clean_description = description.replace('<br>', '\n')
    plain_text = f"""طلب جديد من {full_name}
     المعرف: {user_id}
    رقم الهاتف: {phone}
    رقم الواتساب: {whatsapp}
    نوع الخدمة: {service_type}
    التفاصيل:
    {clean_description}"""
    html_content = f"""<html><body dir="rtl" style="font-family: Arial;">
    <h3>طلب خدمة جديدة</h3>
    <p><strong>👤 الاسم:</strong> {full_name}</p>
    <p><strong>🆔 المعرف:</strong> {user_id}</p>
    <p><strong>📞 رقم الهاتف:</strong> {phone}</p>
    <p><strong>📱 رقم الواتساب:</strong> {whatsapp}</p>
    <p><strong>📌 نوع الخدمة:</strong> {service_type}</p>
    <p><strong>📝 التفاصيل:</strong><br>{description}</p>
    <hr><small>📬 مرسل من منصة Offer ME</small>
    </body></html>"""

    # إعداد الرسالة
    msg = MIMEMultipart("alternative")
    msg['From'] = 'haythamsankari@gmail.com'
    msg['To'] = 'haythamsankari@gmail.com'
    msg['Subject'] = " طلب خدمة جديدة"

    msg.attach(MIMEText(plain_text, "plain", "utf-8"))
    msg.attach(MIMEText(html_content, "html", "utf-8"))

    try:
        with smtplib.SMTP("smtp.gmail.com", 587) as smtp:
            smtp.starttls()
            smtp.login("haythamsankari@gmail.com", "gcis qmpa gqel ciap")
            smtp.sendmail(msg["From"], msg["To"], msg.as_bytes())
    except Exception as e:
        print("❌ فشل إرسال الإيميل:", e)
        return jsonify({"status": "fail", "message": str(e)}), 500

    return jsonify({"status": "success", "message": "✅ تم إرسال الطلب بنجاح"})

@app.route('/user-settings/<user_id>')
def get_user_settings(user_id):
    settings_file = f'settings_user_{user_id}.json'
    settings = {}

    if os.path.exists(settings_file):
        with open(settings_file, 'r', encoding='utf-8') as f:
            settings = json.load(f)

    # جلب الاسم من users.json
    full_name = user_id
    try:
        with open('users.json', 'r', encoding='utf-8') as f:
            users = json.load(f)
            user = next((u for u in users if u['user_id'] == user_id), None)
            if user:
                full_name = user.get('full_name', user_id)
    except:
        pass

    settings['full_name'] = full_name
    return jsonify(settings)


@app.route('/notifications.html')
def notifications_page():
    return render_template('notifications.html')

from flask import jsonify
from datetime import datetime

@app.route('/user-comments/<user_id>')
def get_user_comments(user_id):
    try:
        with open('products_data.json', 'r', encoding='utf-8') as f:
            products = json.load(f)
        with open('comments.json', 'r', encoding='utf-8') as f:
            comments = json.load(f)
    except:
        return jsonify([])

    user_comments = []
    for p in products:
        if p.get("user_id") == user_id:
            product_id = p.get("id")
            product_name = p.get("name", "بدون اسم")
            for c in comments.get(product_id, []):
                user_comments.append({
                    "product_id": product_id,
                    "product_name": product_name,
                    "comment": {
                        "id": c.get("id"),
                        "comment": c.get("comment"),
                        "read": c.get("read", False)
                    }
                })

    return jsonify(user_comments)



@app.route("/mark-comment-read", methods=["POST"])
def mark_comment_read():
    data = request.json
    user_id = data.get("user_id")
    comment_id = data.get("comment_id")

    with open("comments.json", "r", encoding="utf-8") as f:
        comments = json.load(f)

    updated = False
    for product_id, comment_list in comments.items():
        for comment in comment_list:
            if comment.get("id") == comment_id:
                comment["read"] = True
                updated = True
                break

    if updated:
        with open("comments.json", "w", encoding="utf-8") as f:
            json.dump(comments, f, ensure_ascii=False, indent=2)
        return jsonify({"status": "success", "message": "✅ تمت القراءة"})
    else:
        return jsonify({"status": "not_found", "message": "❌ لم يتم العثور على التعليق"})


from flask import render_template

@app.route('/stories.html')
def serve_stories_page():
    return render_template('stories.html')



@app.route('/save-location', methods=['POST'])
def save_location():
    data = request.get_json()
    user_id = data.get("user_id")
    latitude = data.get("latitude")
    longitude = data.get("longitude")

    # اسم ملف الإعدادات الخاص بالمستخدم
    settings_file = f"settings_user_{user_id}.json"

    # قراءة الإعدادات الحالية إن وجدت
    if os.path.exists(settings_file):
        try:
            with open(settings_file, 'r', encoding='utf-8') as f:
                settings = json.load(f)
        except Exception:
            settings = {}
    else:
        settings = {}

    # تحديث موقع المستخدم
    settings['location'] = {
        'lat': latitude,
        'lng': longitude
    }

    # حفظ الإعدادات المحدثة
    with open(settings_file, 'w', encoding='utf-8') as f:
        json.dump(settings, f, ensure_ascii=False, indent=2)

    return jsonify({"message": "✅ تم حفظ موقعك بنجاح"})

@app.route('/categories', methods=['GET'])
def get_categories():
    with open(USERS_FILE, 'r', encoding='utf-8') as f:
        users = json.load(f)
    categories = list(set(user['business_type'] for user in users if 'business_type' in user))
    return jsonify(categories)






with open("config.json", "r", encoding="utf-8") as f:
    config = json.load(f)

ALIEXPRESS_API_KEY = config.get("aliexpress_api_key")
ALIEXPRESS_API_HOST = config.get("aliexpress_api_host")

import urllib.request  # ضيف هذا في أعلى الملف إذا مو موجود

import requests
import json
import os
import uuid
from flask import request, jsonify


@app.route("/track-affiliate-click", methods=["POST"])
def track_affiliate_click():
    data = request.get_json()
    product_id = data.get("product_id")

    if not product_id:
        return jsonify({"status": "error", "message": "Missing product_id"}), 400

    try:
        # تحميل أو إنشاء ملف النقرات
        if os.path.exists("affiliate_clicks.json"):
            with open("affiliate_clicks.json", "r", encoding="utf-8") as f:
                clicks = json.load(f)
        else:
            clicks = {}

        # زيادة عدد النقرات
        clicks[product_id] = clicks.get(product_id, 0) + 1

        # حفظ الملف
        with open("affiliate_clicks.json", "w", encoding="utf-8") as f:
            json.dump(clicks, f, ensure_ascii=False, indent=2)

        return jsonify({"status": "success", "message": "✅ تم تسجيل النقرة"})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500
    
@app.route('/affiliate-clicks/<product_id>')
def get_affiliate_clicks(product_id):
    try:
        with open('affiliate_clicks.json', 'r', encoding='utf-8') as f:
            data = json.load(f)
        return jsonify({"clicks": data.get(product_id, 0)})
    except:
        return jsonify({"clicks": 0})



from flask import request, jsonify
from werkzeug.utils import secure_filename
import os

@app.route("/upload-image", methods=["POST"])
def upload_image():
    image = request.files.get("image")
    if not image:
        return jsonify({"error": "❌ لم يتم اختيار صورة"}), 400

    # تأمين اسم الملف
    filename = secure_filename(image.filename)

    # تحديد مكان الحفظ
    save_path = os.path.join("uploads", filename)

    # تأكد أن مجلد uploads موجود
    if not os.path.exists("uploads"):
        os.makedirs("uploads")

    # حفظ الصورة
    image.save(save_path)

    # إرجاع الاسم فقط
    return jsonify({"success": True, "filename": filename})



@app.route("/upload-golden-product", methods=["POST"])
def upload_golden_product():
    data = request.get_json()
    
    filename = data.get("image", "").strip()
    image_url = f"/uploads/{filename}"


    product = {
        "id": str(uuid4()),
        "title": data.get("title", ""),
        "description": data.get("description", ""),
        "price": data.get("price", ""),
        "image": image_url  # ✅ استخدام الرابط الصحيح
    }

    path = "golden_products.json"
    if os.path.exists(path):
        with open(path, "r", encoding="utf-8") as f:
            products = json.load(f)
    else:
        products = []

    products.append(product)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(products, f, ensure_ascii=False, indent=2)

    return jsonify({"success": True, "message": "✅ تم حفظ المنتج الذهبي بنجاح"})


@app.route("/upload_golden.html")
def upload_golden_page():
    return render_template("upload_golden.html")

@app.route("/golden-products", methods=["GET"])
def get_golden_products():
    file_path = "golden_products.json"
    if os.path.exists(file_path):
        with open(file_path, "r", encoding="utf-8") as f:
            products = json.load(f)
        return jsonify(products)
    else:
        return jsonify([])

from flask import send_from_directory



@app.route('/uploads/logos/<filename>')
def uploaded_logo(filename):
    return send_from_directory('uploads/logos', filename)



from twilio.rest import Client
from threading import Thread

# بيانات Twilio
ACCOUNT_SID = 'ACddb420ce5eab8df62490ae18af483eed'
AUTH_TOKEN = 'dcb7ca3b7d43bbd76b763f3d6f1c3c39'
TWILIO_NUMBER = 'whatsapp:+14155238886'

client = Client(ACCOUNT_SID, AUTH_TOKEN)

def send_whatsapp_twilio(name, phone):
    try:
        message = client.messages.create(
            from_=TWILIO_NUMBER,
            to=f"whatsapp:+{phone}",
            body=f"مرحباً {name}! شكراً لاشتراكك في عروض Offer ME. 🎉"
        )
        print(f"✅ تم الإرسال إلى {name} - SID: {message.sid}")
    except Exception as e:
        print(f"❌ فشل إرسال الرسالة إلى {name}: {e}")

def send_whatsapp_background(name, phone):
    Thread(target=send_whatsapp_twilio, args=(name, phone)).start()


@app.route('/')
def home():
    return render_template('index.html')  # أو أي صفحة رئيسية عندك






@app.route("/offerme-upload", methods=["POST"])
def upload_offerme():
    name = request.form.get("name", "بدون اسم")
    description = request.form.get("description", "")
    file = request.files.get("file")

    if not file:
        return jsonify({"status": "fail", "message": "❌ لا يوجد ملف مرفوع"}), 400

    ext = file.filename.rsplit('.', 1)[-1].lower()
    file_id = str(uuid.uuid4())
    filename = f"{file_id}.{ext}"
    file_path = os.path.join(UPLOAD_FOLDER, filename)
    file.save(file_path)

    if ext in ['mp4', 'mov', 'webm']:
        # ✅ معالجة الفيديو بالخلفية دون تعليق السيرفر
        p = multiprocessing.Process(target=convert_to_hls, args=(file_path, file_id))
        p.start()
        return jsonify({
            "status": "success",
            "message": "✅ تم استلام الفيديو وجاري التحويل بالخلفية"
        })
    else:
        return jsonify({
            "status": "success",
            "message": "✅ تم رفع صورة أو ملف غير فيديو"
        })


@app.route("/uploads/hls/<path:filename>")
def serve_hls(filename):
    return send_from_directory(HLS_FOLDER, filename)


@app.route("/offerme.html")
def offerme_page():
    return render_template("offerme.html")


import os
from flask import jsonify

# ✅ مسار فعلي لمجلد الرفع (uploader/uploads)
UPLOAD_FOLDER_REAL = os.path.abspath("../uploader/uploads")
UPLOADER_BASE = "http://192.168.18.11:5001"  # ← IP السيرفر الثاني مع البورت

@app.route("/api/tiktok-products")
def get_tiktok_products():
    page = int(request.args.get("page", 1))
    limit = int(request.args.get("limit", 3))
    start = (page - 1) * limit
    end = start + limit

    data_path = os.path.join("data", "products_data.json")
    if not os.path.exists(data_path):
        return jsonify([])

    try:
        with open(data_path, "r", encoding="utf-8") as f:
            products = json.load(f)

        # ✅ أضف الشعار لكل منتج من إعدادات الزبون
        for product in products:
            user_id = product.get("user_id", "").strip()
            settings_file = f"settings_user_{user_id}.json"
            if os.path.exists(settings_file):
                try:
                    with open(settings_file, "r", encoding="utf-8") as sf:
                        settings = json.load(sf)
                        logo = settings.get("logo", "")
                        if logo and not logo.startswith("http"):
                            logo = f"/uploads{logo}" if logo.startswith("/logos") else logo
                        product["logo"] = logo
                except Exception as inner_e:
                    print(f"⚠️ خطأ أثناء قراءة إعدادات {user_id}: {inner_e}")
                    product["logo"] = ""

        paginated = products[start:end]
        return jsonify(paginated)

    except Exception as e:
        return jsonify({"error": "فشل قراءة المنتجات", "details": str(e)})


@app.route("/upload-file", methods=["POST"])
def receive_file():
    file = request.files.get("file")
    subfolder = request.form.get("subfolder", "")

    if not file:
        return jsonify({"status": "fail", "message": "لا يوجد ملف"}), 400

    BASE_UPLOAD_FOLDER = "/var/www/offerme/uploads"
    save_dir = os.path.join(BASE_UPLOAD_FOLDER, subfolder)

    os.makedirs(save_dir, exist_ok=True)

    save_path = os.path.join(save_dir, file.filename)
    file.save(save_path)
    print(f"✅ تم استلام الملف: {save_path}")
    return jsonify({"status": "success", "path": save_path})



@app.route("/tiktok")
def tiktok_page():
    return render_template("tiktok.html")



def convert_to_hls(file_path, file_id):
    try:
        hls_output = os.path.join(HLS_FOLDER, file_id)
        os.makedirs(hls_output, exist_ok=True)
        hls_path = os.path.join(hls_output, "index.m3u8")
        ffmpeg_path = os.path.abspath("bin/ffmpeg.exe")

        ffmpeg_cmd = [
            ffmpeg_path,
            "-i", file_path,
            "-c:v", "libx264",
            "-c:a", "aac",
            "-start_number", "0",
            "-hls_time", "5",
            "-hls_list_size", "0",
            "-f", "hls",
            hls_path
        ]
        subprocess.run(ffmpeg_cmd, check=True)
        print(f"✅ تم تحويل {file_id} إلى HLS")
    except Exception as e:
        print(f"❌ خطأ أثناء تحويل {file_id}: {e}")

@app.route('/api/upload-hls', methods=['POST'])
def upload_hls_files():
    folder = request.form.get('folder')
    if not folder:
        return jsonify({"status": "fail", "message": "Missing folder name"}), 400

    save_path = os.path.join("uploads", "hls", folder)
    os.makedirs(save_path, exist_ok=True)

    for f in request.files.getlist("files"):
        f.save(os.path.join(save_path, f.filename))

    return jsonify({"status": "ok", "message": "Files uploaded successfully"})


from flask import request, jsonify
import json
import os

# ✅ تأكد من وجود الملف
DATA_FILE = os.path.join("data", "products_data.json")
os.makedirs("data", exist_ok=True)
if not os.path.exists(DATA_FILE):
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump([], f, ensure_ascii=False, indent=2)

# ✅ مسار استقبال منتج جديد
@app.route("/api/receive-product", methods=["POST"])
def receive_product():
    try:
        new_product = request.get_json()

        if not new_product:
            return jsonify({"status": "fail", "message": "❌ لم يتم استلام أي بيانات"}), 400

        with open(DATA_FILE, "r", encoding="utf-8") as f:
            products = json.load(f)

        products.insert(0, new_product)

        with open(DATA_FILE, "w", encoding="utf-8") as f:
            json.dump(products, f, ensure_ascii=False, indent=2)

        print("✅ تم استقبال منتج جديد وتخزينه بنجاح")
        return jsonify({"status": "success", "message": "✅ تم حفظ المنتج بنجاح"})

    except Exception as e:
        print("❌ خطأ أثناء التخزين:", str(e))
        return jsonify({"status": "fail", "message": "❌ فشل في تخزين المنتج"}), 500

@app.route('/api/products_data/<user_id>')
def serve_user_products(user_id):
    with open('data/products_data.json', 'r', encoding='utf-8') as f:
        all_data = json.load(f)

    # تصفية المنتجات حسب user_id
    user_products = [p for p in all_data if (p.get("user_id") or "").lower() == user_id.lower()]
    return jsonify(user_products)


@app.route('/login.html')
def login_html(): return render_template('login.html')


@app.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')

    with open("users.json", 'r', encoding='utf-8') as f:
        users = json.load(f)

    for user in users:
        if user['username'] == username and user['password'] == password:
            settings_file = f"settings_user_{user['user_id']}.json"

            if not os.path.exists(settings_file):
                with open(settings_file, 'w', encoding='utf-8') as f:
                    json.dump({
                        "tabs": ["إلكترونيات", "ملابس", "ألعاب", "عطور"],
                        "phone": "",
                        "instagram": "",
                        "whatsapp": "",
                        "logo": f"/uploads/logos/{user['user_id']}_logo.jpg"
                    }, f, ensure_ascii=False, indent=2)

            return jsonify({
                "status": "success",
                "user_id": user['user_id'],
                "full_name": user['full_name']
            })

    return jsonify({"status": "fail"}), 401





@app.route("/products_data.json")
def get_products_data_file():
    return send_from_directory("data", "products_data.json")



@app.route('/api/tiktok-products-by-business', methods=['GET'])
def get_products_by_business_type():
    business_type = request.args.get('type')
    if not business_type:
        return jsonify([])

    try:
        with open("tiktok_products.json", "r", encoding="utf-8") as f:
            products = json.load(f)

        filtered = []
        for p in products:
            if p.get("business_type") == business_type:
                # ✅ إذا ما فيه رابط affiliate، جيب رقم الواتساب من إعدادات المستخدم
                if not p.get("affiliate") or p.get("affiliate").strip() == "":
                    user_id = p.get("user_id", "").strip()
                    settings_file = f"settings_user_{user_id}.json"

                    if os.path.exists(settings_file):
                        try:
                            with open(settings_file, 'r', encoding='utf-8') as s:
                                settings = json.load(s)
                                whatsapp = settings.get("whatsapp", "").strip()
                                if whatsapp:
                                    p["whatsapp"] = whatsapp
                        except Exception as e:
                            print(f"⚠️ خطأ في قراءة {settings_file}: {e}")
                            p["whatsapp"] = ""
                    else:
                        p["whatsapp"] = ""

                filtered.append(p)

        return jsonify(filtered)

    except Exception as e:
        print("❌ خطأ في تحميل المنتجات:", e)
        return jsonify([])


@app.route('/settings/<user_id>', methods=['POST'])
def save_settings(user_id):
    data = request.get_json()

    settings_file = f"/var/www/offerme/uploads/settings_user_{user_id}.json"
    if os.path.exists(settings_file):
        with open(settings_file, 'r', encoding='utf-8') as f:
            settings = json.load(f)
    else:
        settings = {}

    # ✅ تحديث فقط الحقول الموجودة في الطلب
    for key in ['phone', 'instagram', 'whatsapp', 'facebook', 'tiktok', 'website']:
        if key in data:
            settings[key] = data[key]

    with open(settings_file, 'w', encoding='utf-8') as f:
        json.dump(settings, f, ensure_ascii=False, indent=2)

    return jsonify({"status": "success"})

@app.route('/settings/<user_id>', methods=['GET'])
def get_settings(user_id):
    settings_file = f"settings_user_{user_id}.json"
    if os.path.exists(settings_file):
        with open(settings_file, 'r', encoding='utf-8') as f:
            return jsonify(json.load(f))
    else:
        return jsonify({})


@app.route('/products-data')
def get_products_data():
    try:
        with open('data/products_data.json', 'r', encoding='utf-8') as f:
            data = json.load(f)
        return jsonify(data)
    except Exception as e:
        return jsonify({"error": f"فشل في تحميل البيانات: {str(e)}"}), 500

@app.route('/api/tiktok-products-full', methods=['GET'])
def get_all_tiktok_products_full():
    try:
        data_path = os.path.join("data", "products_data.json")
        if not os.path.exists(data_path):
            print("❌ الملف غير موجود:", data_path)
            return jsonify([])

        with open(data_path, "r", encoding="utf-8") as f:
            products = json.load(f)

        for p in products:
            if not p.get("affiliate") or p.get("affiliate").strip() == "":
                user_id = p.get("user_id", "").strip()
                settings_file = f"settings_user_{user_id}.json"

                if os.path.exists(settings_file):
                    try:
                        with open(settings_file, 'r', encoding='utf-8') as s:
                            settings = json.load(s)
                            whatsapp = settings.get("whatsapp", "").strip()
                            if whatsapp:
                                p["whatsapp"] = whatsapp
                    except Exception as e:
                        print(f"⚠️ خطأ في قراءة {settings_file}: {e}")
                        p["whatsapp"] = ""
                else:
                    p["whatsapp"] = ""

        print("📦 عدد المنتجات النهائي:", len(products))
        return jsonify(products)

    except Exception as e:
        print("❌ خطأ في تحميل المنتجات:", e)
        return jsonify([])




@app.route('/viewer_login')
def viewer_login():
    return render_template('viewer_login.html')

@app.route('/my_profile')
def my_profile():
    return render_template('my_profile.html')



@app.route('/register-viewer', methods=['POST'])
def register_viewer():
    import os
    data = request.get_json()
    user_id = data.get("user_id")
    full_name = data.get("full_name")
    phone = data.get("phone")

    if not user_id or not full_name or not phone:
        return jsonify({"status": "fail", "message": "بيانات ناقصة"}), 400

    file_path = "visitors.json"
    visitors = []

    if os.path.exists(file_path):
        with open(file_path, "r", encoding="utf-8") as f:
            try:
                visitors = json.load(f)
            except:
                visitors = []

    # تحقق إذا الزائر مسجل مسبقًا
    if not any(v["user_id"] == user_id for v in visitors):
        visitors.append({
            "user_id": user_id,
            "full_name": full_name,
            "phone": phone
        })

        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(visitors, f, ensure_ascii=False, indent=2)

    return jsonify({"status": "success"})




@app.route('/update-visitor', methods=['POST'])
def update_visitor():
    data = request.get_json()
    user_id = data.get("user_id")
    full_name = data.get("full_name")
    phone = data.get("phone")

    if not user_id or not full_name or not phone:
        return jsonify({"status": "fail", "message": "بيانات ناقصة"}), 400

    try:
        with open("visitors.json", "r", encoding="utf-8") as f:
            visitors = json.load(f)
    except:
        visitors = []

    updated = False
    for visitor in visitors:
        if visitor["user_id"] == user_id:
            visitor["full_name"] = full_name
            visitor["phone"] = phone
            visitor["last_updated"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            updated = True
            break

    if updated:
        with open("visitors.json", "w", encoding="utf-8") as f:
            json.dump(visitors, f, ensure_ascii=False, indent=2)
        return jsonify({"status": "success"})
    else:
        return jsonify({"status": "fail", "message": "المستخدم غير موجود"}), 404


@app.route('/save-product', methods=['POST'])
def save_product():
    try:
        data = request.get_json()
        user_id = data.get("user_id")
        product_url = data.get("product_url")

        if not user_id or not product_url:
            return jsonify({"status": "fail", "message": "بيانات ناقصة"}), 400

        saved_file = "data/savedProducts.json"  # ✅ تم التعديل

        if not os.path.exists(saved_file):
            with open(saved_file, "w", encoding="utf-8") as f:
                json.dump({}, f)

        with open(saved_file, "r", encoding="utf-8") as f:
            saved_data = json.load(f)

        if user_id not in saved_data:
            saved_data[user_id] = []

        if product_url not in saved_data[user_id]:
            saved_data[user_id].append(product_url)

        with open(saved_file, "w", encoding="utf-8") as f:
            json.dump(saved_data, f, ensure_ascii=False, indent=2)

        return jsonify({"status": "success"})

    except Exception as e:
        print(f"❌ خطأ في الحفظ: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route('/unsave-product', methods=['POST'])
def unsave_product():
    data = request.get_json()
    user_id = data.get('user_id')
    product_url = data.get('product_url')

    saved_file = "data/savedProducts.json"  # ✅ تم التعديل
    try:
        with open(saved_file, "r", encoding="utf-8") as f:
            saved = json.load(f)

        if user_id in saved and product_url in saved[user_id]:
            saved[user_id].remove(product_url)

            with open(saved_file, "w", encoding="utf-8") as f:
                json.dump(saved, f, ensure_ascii=False, indent=2)

        return jsonify({'status': 'success'})
    except Exception as e:
        return jsonify({'status': 'fail', 'message': str(e)}), 500



@app.route("/saved")
def saved_view():
    return render_template("saved.html")




@app.route('/data/<path:filename>')
def serve_data_files(filename):
    return send_from_directory('data', filename)

@app.route('/add_reply', methods=['POST'])
def add_reply():
    data = request.get_json()
    product_id = data.get("product_id")
    comment_id = data.get("parent_id")
    reply_text = data.get("comment")
    user_id = data.get("user_id")

    # ✅ استخدم القيم المرسلة من الجافاسكربت مباشرة
    full_name = data.get("full_name", "مستخدم")
    profile_image = data.get("profile_image", "/static/img/default-user.png")

    try:
        with open("comments.json", "r", encoding="utf-8") as f:
            all_comments = json.load(f)
    except:
        all_comments = {}

    comments = all_comments.get(product_id, [])

    for comment in comments:
        if comment["id"] == comment_id:
            if "replies" not in comment:
                comment["replies"] = []
            comment["replies"].append({
                "id": str(uuid4()),
                "user_id": user_id,
                "full_name": full_name,
                "profile_image": profile_image,
                "comment": reply_text
            })
            break

    all_comments[product_id] = comments

    with open("comments.json", "w", encoding="utf-8") as f:
        json.dump(all_comments, f, ensure_ascii=False, indent=2)

    return jsonify({"success": True})






import os
from flask import Flask, request, jsonify
from werkzeug.utils import secure_filename
import json

UPLOAD_FOLDER = 'static/uploads/avatars'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

@app.route('/upload-visitor-avatar', methods=['POST'])
def upload_visitor_avatar():
    file = request.files.get('file')
    user_id = request.form.get('user_id')

    if not file or not user_id:
        return jsonify({"status": "error", "message": "بيانات غير مكتملة"}), 400

    filename = secure_filename(f"{user_id}_avatar.png")
    upload_dir = os.path.join("static", "uploads", "avatars")
    os.makedirs(upload_dir, exist_ok=True)
    filepath = os.path.join(upload_dir, filename)
    file.save(filepath)

    # ✅ تحويل المسار إلى URL باستخدام "/" بدل "\"
    image_url = "/" + filepath.replace("\\", "/")

    # ✅ تحديث visitors.json
    try:
        with open('visitors.json', 'r', encoding='utf-8') as f:
            visitors = json.load(f)
    except:
        visitors = []

    updated = False
    for v in visitors:
        if v['user_id'] == user_id:
            v['profile_image'] = image_url
            updated = True
            break

    if not updated:
        visitors.append({
            "user_id": user_id,
            "full_name": "مستخدم",
            "phone": "",
            "profile_image": image_url
        })

    with open('visitors.json', 'w', encoding='utf-8') as f:
        json.dump(visitors, f, ensure_ascii=False, indent=2)

    return jsonify({"status": "success", "image_url": image_url})


@app.route('/like-comment', methods=['POST'])
def like_comment():
    data = request.get_json()
    comment_id = data['comment_id']
    user_id = data['user_id']

    try:
        with open('comments.json', 'r', encoding='utf-8') as f:
            comments_data = json.load(f)
    except:
        comments_data = {}

    updated = False

    # دور على الكومنت المطلوب
    for product_comments in comments_data.values():
        for comment in product_comments:
            if comment["id"] == comment_id:
                if "likes" not in comment:
                    comment["likes"] = []
                if user_id in comment["likes"]:
                    comment["likes"].remove(user_id)  # إلغاء الإعجاب
                else:
                    comment["likes"].append(user_id)  # إضافة إعجاب
                updated = True
                likes_count = len(comment["likes"])
                break

    if updated:
        with open('comments.json', 'w', encoding='utf-8') as f:
            json.dump(comments_data, f, ensure_ascii=False, indent=2)

        return jsonify({"success": True, "likes_count": likes_count})
    else:
        return jsonify({"success": False, "message": "🔍 لم يتم العثور على التعليق"}), 404



@app.route('/user-settings-all')
def get_all_user_settings():
    import glob
    settings_files = glob.glob('settings_user_*.json')
    all_settings = []

    for file_path in settings_files:
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                settings = json.load(f)
                user_id = os.path.basename(file_path).split('_', 2)[-1].rsplit('.', 1)[0]
                settings['user_id'] = user_id
                all_settings.append(settings)
        except Exception as e:
            print(f"❌ خطأ في قراءة الملف {file_path}: {e}")

    return jsonify(all_settings)



from twilio.rest import Client

TWILIO_ACCOUNT_SID = 'ACddb420ce5eab8df62490ae18af483eed'
TWILIO_AUTH_TOKEN = 'dcb7ca3b7d43bbd76b763f3d6f1c3c39'
VERIFY_SERVICE_SID = 'VA7ef260979e3acb78d436c7f0cad72bc8'

client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)

@app.route('/send_otp', methods=['POST'])
def send_otp():
    data = request.get_json()
    phone = data.get('phone', '').strip()
    to_number = f'whatsapp:+974{phone}'

    try:
        client.verify.v2.services(VERIFY_SERVICE_SID).verifications.create(
            to=to_number,
            channel="whatsapp"
        )
        return jsonify({"success": True})
    except Exception as e:
        print("❌ فشل الإرسال:", e)
        return jsonify({"success": False})


@app.route('/verify_otp', methods=['POST'])
def verify_otp():
    data = request.get_json()
    phone = data.get('phone', '').strip()
    code = data.get('otp', '').strip()
    to_number = f'whatsapp:+974{phone}'

    try:
        result = client.verify.v2.services(VERIFY_SERVICE_SID).verification_checks.create(
            to=to_number,
            code=code
        )
        if result.status == "approved":
            return jsonify({"success": True})
        else:
            return jsonify({"success": False})
    except Exception as e:
        print("❌ فشل التحقق:", e)
        return jsonify({"success": False})






from flask import request, jsonify
import json
import os  # ⬅️ مهم لإحضار المسار الكامل
from uuid import uuid4

@app.route('/get_product_comments/<product_id>')
def get_product_comments(product_id):
    try:
        
        with open('comments.json', 'r', encoding='utf-8') as f:
            comments = json.load(f)
    except:
        comments = {}

    product_comments = comments.get(product_id, [])
    return jsonify(product_comments)


from flask import request, jsonify
import json
import os
from uuid import uuid4
from datetime import datetime

@app.route('/submit_product_comment', methods=['POST'])
def submit_product_comment():
    data = request.get_json()

    product_id = data.get('product_id')
    comment = data.get('comment', '').strip()
    full_name = data.get('full_name', 'مستخدم')
    profile_image = data.get('profile_image', '').strip()
    reply_to = data.get('reply_to')
    user_id = data.get('user_id', '').strip()

    # ✅ إذا ما تم إرسال صورة، نحاول جلبها من settings
    if (not profile_image or profile_image == 'static/img/default-user.png') and user_id:
        settings_file = f"settings_user_{user_id}.json"
        if os.path.exists(settings_file):
            try:
                with open(settings_file, 'r', encoding='utf-8') as f:
                    settings = json.load(f)
                    profile_image = settings.get('logo', profile_image)
            except Exception as e:
                print("⚠️ خطأ في قراءة إعدادات المستخدم:", e)

    if not product_id or not comment:
        return jsonify({"success": False, "message": "❌ بيانات ناقصة"}), 400

    # قراءة التعليقات من الملف
    comments = {}
    try:
        with open('comments.json', 'r', encoding='utf-8') as f:
            comments = json.load(f)
    except Exception as e:
        print("❌ خطأ في قراءة الملف:", e)

    # إنشاء التعليق الجديد
    new_comment = {
        "id": str(uuid4()),
        "comment": comment,
        "full_name": full_name,
        "profile_image": profile_image,
        "timestamp": datetime.now().isoformat()
    }

    # إضافة التعليق أو الرد
    if reply_to:
        found = False
        for comment_obj in comments.get(product_id, []):
            if comment_obj["id"] == reply_to:
                if "replies" not in comment_obj:
                    comment_obj["replies"] = []
                comment_obj["replies"].append(new_comment)
                found = True
                break
        if not found:
            print("⚠️ لم يتم العثور على التعليق للرد عليه")
    else:
        comments.setdefault(product_id, []).append(new_comment)

    # حفظ الملف
    with open('comments.json', 'w', encoding='utf-8') as f:
        json.dump(comments, f, ensure_ascii=False, indent=2)

    return jsonify({"success": True})




from flask import render_template, request

@app.route("/product_comments_sheet")
def product_comments_sheet():
    return render_template("product_comments_sheet.html")


@app.route("/get_comment_count/<product_id>")
def get_comment_count(product_id):
    try:
        with open("comments.json", "r", encoding="utf-8") as f:
            comments_data = json.load(f)
    except:
        comments_data = {}

    comments = comments_data.get(product_id, [])
    total_count = 0

    for comment in comments:
        total_count += 1  # احتساب التعليق الأساسي
        if "replies" in comment:
            total_count += len(comment["replies"])  # احتساب الردود

    return jsonify({"count": total_count})


from flask import send_from_directory




@app.route('/uploads/<path:filename>')
def uploaded_file(filename):
    return send_from_directory('uploads', filename)





@app.route("/fetch-aliexpress", methods=["POST"])
def fetch_aliexpress():
    data = request.get_json()
    link = data.get("link", "").strip()
    affiliate_link = data.get("affiliate_link", "").strip()
   
    try:
        item_id = None
        if "item/" in link:
            item_id = link.split("item/")[1].split(".")[0]
        elif "product/" in link:
            item_id = link.split("product/")[1].split(".")[0]
        else:
            return jsonify({"error": "❌ لم يتم العثور على معرف المنتج في الرابط"}), 400
    except Exception:
        return jsonify({"error": "❌ رابط غير صالح"}), 400

    url = "https://aliexpress-datahub.p.rapidapi.com/item_detail_2"
    querystring = {"itemId": item_id}
    headers = {
        "x-rapidapi-key": ALIEXPRESS_API_KEY,
        "x-rapidapi-host": "aliexpress-datahub.p.rapidapi.com"
    }

    try:
        response = requests.get(url, headers=headers, params=querystring)
        result = response.json()

        if not result.get("result") or not result["result"].get("item"):
            print("📛 الرد الكامل من API:", json.dumps(result, indent=2, ensure_ascii=False))
            return jsonify({"error": "❌ فشل في جلب بيانات المنتج"}), 400

        item = result["result"]["item"]
        title = item.get("title", "")
        description = item.get("breadcrumbs", [])
        images = item.get("images", [])
        usd_price = item.get("sku", {}).get("def", {}).get("promotionPrice", "")

        try:
            price_qr = round(float(usd_price) * 3.65, 2)
        except:
            price_qr = "غير متوفر"

        store = result["result"].get("seller", {}).get("storeTitle", "")

        # ✅ تحميل أول صورة
        image_url = images[0] if images else ""
        local_filename = ""
        if image_url:
            if image_url.startswith("//"):
                image_url = "https:" + image_url
            local_filename = f"{uuid.uuid4()}.jpg"
            local_path = os.path.join("uploads", local_filename)
            try:
                img_response = requests.get(image_url, headers={"User-Agent": "Mozilla/5.0"})
                if img_response.status_code == 200:
                    with open(local_path, "wb") as f:
                        f.write(img_response.content)
                else:
                    print("❌ فشل تحميل الصورة بكود:", img_response.status_code)
                    local_filename = ""
            except Exception as e:
                print("❌ فشل تحميل الصورة:", e)
                local_filename = ""

        post = f"📦 {title}\n\n... \n\n#منتجات_مميزة #عروض #قطر #AliExpress"

        return jsonify({
            "title_en": title,
            "description_en": " / ".join([b.get("title", "") for b in description if "title" in b]),
            "images": [f"/uploads/{local_filename}"] if local_filename else [],
            "price": price_qr,
            "store": store,
            "post": post,
            "affiliate_link": affiliate_link
        })

    except Exception as e:
        print("❌ خطأ داخلي:", e)
        return jsonify({"error": "❌ حدث خطأ أثناء الاتصال بالخادم"}), 500


@app.route('/featured')
def featured_page():
    return render_template('featured.html')


@app.route('/featured-products')
def get_featured_products():
    try:
        with open('data/products_data.json', 'r', encoding='utf-8') as f:  # ✅ لازم يكون data/
            products = json.load(f)
    except:
        products = []

    featured = [p for p in products if p.get("featured") == True]
    return jsonify(featured)




#  عرض صفحة الأدمن
@app.route('/admin')
def admin_panel():
    return render_template('admin_panel.html')

# جلب كل المنتجات
import os
@app.route('/all-products')
def all_products():
    try:
        with open(os.path.join('data', 'products_data.json'), 'r', encoding='utf-8') as f:
            products = json.load(f)
    except Exception as e:
        print("❌ خطأ:", e)
        products = []
    return jsonify(products)


#فعيل المنتج كمميز 
@app.route('/mark-featured/<product_id>', methods=['POST'])
def mark_featured(product_id):
    try:
        with open('data/products_data.json', 'r', encoding='utf-8') as f:
            products = json.load(f)
    except:
        products = []

    data = request.get_json()
    new_state = data.get("featured", True)

    for product in products:
        if product['id'] == product_id:
            product['featured'] = new_state

    with open('data/products_data.json', 'w', encoding='utf-8') as f:
        json.dump(products, f, ensure_ascii=False, indent=2)

    return jsonify({"status": "success"})

import os
from flask import jsonify

@app.route('/api/last-products-update')
def get_last_products_update():
    try:
        last_modified = int(os.path.getmtime('data/products_data.json'))
        return jsonify({"timestamp": last_modified})
    except:
        return jsonify({"timestamp": 0})



@app.route('/test')
def test_page():
    return render_template('test.html')


@app.route('/upload-new.html')
def upload_combined_page():
    return render_template('upload_combined.html')















