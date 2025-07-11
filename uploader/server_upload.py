from urllib.parse import unquote

# ✅ إصلاح مؤقت لخطأ ANTIALIAS في النسخ الحديثة من Pillow
import PIL.Image
if not hasattr(PIL.Image, 'ANTIALIAS'):
    PIL.Image.ANTIALIAS = PIL.Image.Resampling.LANCZOS


import sys
print("🧪 Python path المستخدم:", sys.executable)

import os
print("📁 ملف القالب موجود؟", os.path.exists("templates/manage_tabs.html"))
print("📁 الملفات داخل templates:", os.listdir("templates"))

import traceback
from flask import Flask, request, jsonify, render_template, send_from_directory
from flask_cors import CORS
import os, uuid, subprocess, multiprocessing, json
import requests

app = Flask(__name__)
CORS(app)  # ✅ هذه السطر مهم جداً





UPLOAD_FOLDER = os.path.abspath("../uploader/uploads")
HLS_FOLDER = os.path.join(UPLOAD_FOLDER, "hls")

os.makedirs(HLS_FOLDER, exist_ok=True)

@app.route("/offerme.html")
def offerme_page():
    return render_template("offerme.html")



@app.route("/offerme-upload", methods=["POST"])
def upload_offerme():
    base_url = request.host_url.rstrip("/")
    user_id = request.form.get("user_id", "غير معروف")
    name = request.form.get("name", "بدون اسم")
    description = request.form.get("description", "")
    post = request.form.get("post", "")
    price = request.form.get("price", "")
    affiliate_link = request.form.get("affiliate_link", "")
    full_name = request.form.get("full_name", "غير معروف")

    file = request.files.get("file")
    montage = request.form.get("montage", "false") == "true"

    if not file:
        return jsonify({"status": "fail", "message": "❌ لا يوجد ملف مرفوع"}), 400

    ext = file.filename.rsplit('.', 1)[-1].lower()
    file_id = str(uuid.uuid4())
    filename = f"{file_id}.{ext}"
    file_path = os.path.join(UPLOAD_FOLDER, filename)
    file.save(file_path)

    json_file = os.path.join(os.path.dirname(__file__), "tiktok_products.json")
    try:
        with open(json_file, "r", encoding="utf-8") as f:
            products = json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        products = []

    def save_and_send(product_data, hls_path=None):
        if hls_path:
            send_files_to_server_5000(hls_folder_path=hls_path)
        elif ext in ['jpg', 'jpeg', 'png', 'webp']:
            send_files_to_server_5000(image_path=file_path)

        product_data["url"] = product_data["url"].replace(":5001", ":5000")
        product_data["poster"] = product_data["poster"].replace(":5001", ":5000")
        send_to_main_server(product_data)

        products.insert(0, product_data)
        with open(json_file, "w", encoding="utf-8") as f:
            json.dump(products, f, ensure_ascii=False, indent=2)

    # ✅ للفيديوهات
    if ext in ['mp4', 'mov', 'webm']:
        product_data = {
            "user_id": user_id,
            "full_name": full_name,
            "name": name,
            "description": description,
            "price": price,
            "post": post,
            "type": "video",
            "url": f"{base_url}/uploads/hls/{file_id}/index.m3u8",
            "poster": f"{base_url}/uploads/hls/{file_id}/thumbnail.jpg",
            "affiliate": affiliate_link , # ✅ رابط الشراء
            "id": str(uuid.uuid4()),  # ✅ توليد ID تلقائي

            
        }
        p = multiprocessing.Process(target=process_video_upload, args=(file_path, file_id, product_data))
        p.start()

    # ✅ للصور
    elif ext in ['jpg', 'jpeg', 'png', 'webp']:
        if montage:
            modified_path = os.path.join(UPLOAD_FOLDER, f"{file_id}_from_image.mp4")
            product_data = {
                "user_id": user_id,
                "full_name": full_name,
                "name": name,
                "description": description,
                "price": price,
                "post": post,
                "type": "video",
                "url": f"/uploads/hls/{file_id}/index.m3u8",
                "poster": f"/uploads/hls/{file_id}/thumbnail.jpg",
                "affiliate": affiliate_link,  # ✅ رابط الشراء
                "id": str(uuid.uuid4()),  # ✅ توليد ID تلقائي

            }
            p = multiprocessing.Process(target=process_montage_upload, args=(file_path, modified_path, name, price, file_id, product_data))
            p.start()
        else:
            product_data = {
                "user_id": user_id,
                "full_name": full_name,
                "name": name,
                "description": description,
                "price": price,
                "post": post,
                "type": "image",
                "url": f"{base_url}/uploads/{filename}",
                "poster": f"{base_url}/uploads/{filename}",
                "affiliate": affiliate_link,  # ✅ رابط الشراء
                "id": str(uuid.uuid4()),  # ✅ توليد ID تلقائي

            }
            save_and_send(product_data)

    else:
        return jsonify({
            "status": "fail",
            "message": "❌ نوع الملف غير مدعوم"
        }), 400

    return jsonify({
    "status": "success",
    "message": "✅ تم رفع الملف بنجاح وجاري معالجته"
  }), 200

  
def process_video_upload(file_path, file_id, product_data):
    convert_and_send(file_path, file_id, product_data)

def process_montage_upload(original_image_path, modified_path, name, price, file_id, product_data):
    create_video_from_image(original_image_path, modified_path, name, price)
    convert_and_send(modified_path, file_id, product_data)


@app.route("/uploads/hls/<path:filename>")
def serve_hls(filename):
    return send_from_directory(HLS_FOLDER, filename)

@app.route("/uploads/<path:filename>")
def serve_uploaded_file(filename):
    return send_from_directory(UPLOAD_FOLDER, filename)


#تحويل الصورة لفيديو
import os
import uuid
import numpy as np
import subprocess

from moviepy.editor import (
    ImageClip, TextClip, CompositeVideoClip,
    AudioFileClip, VideoFileClip, vfx
)
from PIL import Image, ImageDraw

# ✅ مجلد HLS
HLS_FOLDER = os.path.abspath("uploads/hls")
os.makedirs(HLS_FOLDER, exist_ok=True)


def create_video_from_image(image_path, output_path, name, price):
    try:
        duration = 12
        size = (720, 1280)

        def make_gradient(size=size):
            img = Image.new("RGB", size)
            draw = ImageDraw.Draw(img)
            for y in range(size[1]):
                r = int(180 + 50 * y / size[1])
                g = int(100 + 80 * (y / size[1]))
                b = 255
                draw.line([(0, y), (size[0], y)], fill=(r, g, b))
            return np.array(img)

        bg = ImageClip(make_gradient(), duration=duration)

        image = (
            ImageClip(image_path, duration=duration)
            .resize(width=size[0] * 0.9)
            .fx(vfx.resize, lambda t: 1 + 0.01 * t)
            .set_position(("center", "center"))
        )

        text_clip = (
            TextClip(name, fontsize=60, font="Amiri-Bold", color="white", bg_color="black")
            .set_duration(5)
            .set_position(("center", size[1] * 0.7))
            .fadein(1)
            .set_start(1)
        )

        price_text = (
            TextClip(f"بسعر {price} ريال فقط", fontsize=55, color="yellow", font="Amiri-Bold", stroke_color="black", stroke_width=2)
            .set_duration(4)
            .set_start(6)
            .set_position(lambda t: ("center", size[1] * 0.78 + 6 * np.sin(10 * t)))
        )

        # ✅ إضافة الصوت الكامل
        typing_audio_path = "static/typing.mp3"
        audio = None
        if os.path.exists(typing_audio_path):
            audio = AudioFileClip(typing_audio_path).set_duration(duration)

        logo_path = os.path.join("static", "logo.jpeg")
        logo = None
        if os.path.exists(logo_path):
            logo = (
                ImageClip(logo_path)
                .set_duration(duration)
                .resize(height=50)
                .set_position(("right", "top"))
                .margin(right=20, top=20, opacity=0)
                .fadein(1)
            )

        clips = [bg, image, text_clip, price_text]
        if logo:
            clips.append(logo)

        final = CompositeVideoClip(clips, size=size).set_duration(duration)

        if audio:
            final = final.set_audio(audio)

        final.write_videofile(output_path, fps=24, codec="libx264", audio=True)
        print("✅ فيديو موبايل احترافي مع صوت تم بنجاح")

    except Exception as e:
        print(f"❌ خطأ: {e}")
        import traceback
        traceback.print_exc()




import shutil  # تأكد من وجود هذا الاستيراد في أعلى الملف

def convert_to_hls(file_path, file_id):
    try:
        hls_output = os.path.join(HLS_FOLDER, file_id)
        os.makedirs(hls_output, exist_ok=True)

        hls_path = os.path.join(hls_output, "index.m3u8")
        segment_pattern = os.path.join(hls_output, "segment_%03d.ts")

        ffmpeg_path = "ffmpeg"

        if shutil.which(ffmpeg_path) is None:
            print("❌ ffmpeg غير موجود فعليًا في النظام")
            return False

        print(f"📍 FFmpeg absolute path: {ffmpeg_path}")

        if not os.path.exists(file_path):
            print(f"❌ الملف المطلوب غير موجود: {file_path}")
            return False

        # ✅ احسب الحجم قبل
        original_size = os.path.getsize(file_path) / (1024 * 1024)

        # ✅ أمر ffmpeg لتحويل وضغط الفيديو إلى HLS
        ffmpeg_cmd = [
            ffmpeg_path,
            "-i", str(file_path),
            "-vf", "scale=-2:720",
            "-c:v", "libx264",
            "-preset", "fast",
            "-crf", "23",
            "-c:a", "aac",
            "-b:a", "128k",
            "-start_number", "0",
            "-hls_time", "2",
            "-hls_list_size", "0",
            "-hls_segment_filename", segment_pattern,
            "-f", "hls",
            str(hls_path)
        ]

        print("📍 FFmpeg command:", " ".join(ffmpeg_cmd))
        subprocess.run(ffmpeg_cmd, check=True)
        print(f"✅ تم تحويل {file_id} إلى HLS")

        # ✅ احسب الحجم بعد
        total_size = 0
        for root, _, files in os.walk(hls_output):
            for f in files:
                total_size += os.path.getsize(os.path.join(root, f))
        total_size_mb = total_size / (1024 * 1024)
        print(f"📦 الحجم قبل: {original_size:.2f} MB | بعد: {total_size_mb:.2f} MB")

        # ✅ توليد صورة مصغرة
        try:
            from moviepy.video.io.VideoFileClip import VideoFileClip
            thumbnail_path = os.path.join(hls_output, "thumbnail.jpg")
            clip = VideoFileClip(file_path)
            clip.save_frame(thumbnail_path, t=1.0)
            clip.close()
            print("🖼️ تم توليد الصورة المصغرة بنجاح")
        except Exception as thumb_err:
            print(f"❌ خطأ أثناء توليد الصورة المصغرة: {thumb_err}")

        # ✅ حذف الفيديو الأصلي بعد التحويل
        try:
            os.remove(file_path)
            print(f"🗑️ تم حذف الفيديو الأصلي بعد التحويل: {file_path}")
        except Exception as e:
            print(f"⚠️ فشل حذف الفيديو الأصلي: {e}")
        return True

    except Exception as e:
        print(f"❌ خطأ أثناء تحويل {file_id}: {e}")
        return False

def send_to_main_server(product):
    try:
        # ✅ تعديل الروابط قبل الإرسال
        if "url" in product:
            product["url"] = product["url"].replace(":5001", ":5000")
        if "poster" in product:
            product["poster"] = product["poster"].replace(":5001", ":5000")

        res = requests.post("http://127.0.0.1:5000/api/receive-product", json=product)
        if res.status_code == 200:
            print("✅ تم ترحيل المنتج بنجاح إلى السيرفر الأساسي")
        else:
            print("❌ فشل الترحيل:", res.text)
    except Exception as e:
        print("⚠️ خطأ أثناء الترحيل:", str(e))



def send_files_to_server_5000(image_path=None, hls_folder_path=None, original_files_paths=None):
    import requests
    import os

    url = "http://127.0.0.1:5000/upload-file"


    def send_file(file_path, subfolder=""):
      with open(file_path, "rb") as f:
        files = {"file": (os.path.basename(file_path), f)}
        data = {"subfolder": subfolder}
        try:
            res = requests.post(url, files=files, data=data, timeout=60)
            print(f"📤 تم إرسال: {file_path}")
            print("📥 الرد:", res.status_code, res.text)
        except Exception as e:
            print(f"❌ فشل إرسال: {file_path} → {e}")


    # 🖼️ إرسال الصورة الأصلية
    if image_path and os.path.isfile(image_path):
        send_file(image_path, subfolder="")

    # 📂 إرسال ملفات HLS (مثل .m3u8 و .ts)
    if hls_folder_path and os.path.isdir(hls_folder_path):
        folder_name = os.path.basename(hls_folder_path)
        for filename in os.listdir(hls_folder_path):
            file_path = os.path.join(hls_folder_path, filename)
            send_file(file_path, subfolder=f"hls/{folder_name}")

    # 🎞️ إرسال الملفات الأصلية الأخرى (مثل الفيديو، صور إضافية...)
    if original_files_paths:
        for original_file in original_files_paths:
            if os.path.isfile(original_file):
                # 🔄 استخرج المجلد الفرعي من المسار مثل uploads/xyz.jpg → subfolder = ""
                rel_path = os.path.relpath(original_file, "uploads")
                subfolder = os.path.dirname(rel_path)
                send_file(original_file, subfolder=subfolder)

    # ✅ حذف ملفات HLS من سيرفر 5001 بعد الترحيل
    if hls_folder_path and os.path.isdir(hls_folder_path):
        try:
            shutil.rmtree(hls_folder_path)
            print(f"🗑️ تم حذف مجلد HLS من سيرفر 5001: {hls_folder_path}")
        except Exception as e:
            print(f"⚠️ فشل حذف مجلد HLS: {e}")




# ✅ رد على طلب OPTIONS لحل مشكلة CORS
@app.route("/generate-post", methods=["OPTIONS"])
def generate_post_options():
    response = jsonify({"status": "ok"})
    response.headers.add("Access-Control-Allow-Origin", "https://offermeqa.com")
    response.headers.add("Access-Control-Allow-Methods", "POST, OPTIONS")
    response.headers.add("Access-Control-Allow-Headers", "Content-Type, Authorization")
    return response

# ✅ مسار POST لتوليد البوست فعليًا
@app.route("/generate-post", methods=["POST"])
def generate_post():
    try:
        data = request.get_json()
        name = data.get("name", "").strip()
        description = data.get("description", "").strip()

        if not name or not description:
            return jsonify({"status": "fail", "message": "❌ الاسم والوصف مطلوبان"}), 400

        config_path = os.path.join(os.path.dirname(__file__), "config.json")
        if not os.path.exists(config_path):
            return jsonify({"status": "fail", "message": "❌ ملف config.json غير موجود"}), 500

        with open(config_path, "r", encoding="utf-8") as f:
            config = json.load(f)

        api_key = config.get("openrouter_api_key")
        if not api_key:
            return jsonify({"status": "fail", "message": "❌ لم يتم العثور على مفتاح API"}), 500

        prompt = f"""
أنشئ بوست إنستغرام قصير وجذاب عن المنتج التالي:
- الاسم: {name}
- الوصف: {description}

المطلوب:
- سطر أو سطرين فقط
- 3 إيموجي على الأقل
- 4 هاشتاغات (واحد منها يجب أن يكون #{name.replace(" ", "")}, وواحد #قطر, واثنين إضافيين)
- باللهجة العربية البسيطة
"""

        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }

        payload = {
            "model": "openai/gpt-3.5-turbo",
            "messages": [
                {"role": "user", "content": prompt}
            ],
            "max_tokens": 200
        }

        res = requests.post("https://openrouter.ai/api/v1/chat/completions", headers=headers, json=payload)
        print("🧪 Status Code:", res.status_code)
        print("🧪 Raw Response Text:", res.text)

        if res.status_code == 200:
            data = res.json()
            if "choices" in data and data["choices"]:
                reply = data["choices"][0]["message"]["content"]
                return jsonify({"status": "success", "post": reply})
            else:
                return jsonify({
                    "status": "fail",
                    "message": "❌ الرد من OpenRouter لا يحتوي على بوست",
                    "details": data
                }), 500
        else:
            return jsonify({
                "status": "fail",
                "message": "❌ فشل من OpenRouter",
                "details": res.text
            }), 500

    except Exception as e:
        traceback.print_exc()
        return jsonify({
            "status": "fail",
            "message": f"❌ خطأ داخلي: {str(e)}"
        }), 500




@app.route('/settings/<user_id>', methods=['GET', 'POST'])
def manage_settings(user_id):
    settings_file = f"settings_user_{user_id}.json"

    if request.method == 'GET':
        if os.path.exists(settings_file):
            with open(settings_file, 'r', encoding='utf-8') as f:
                return jsonify(json.load(f))
        return jsonify({"tabs": ["إلكترونيات", "ملابس", "ألعاب", "عطور"]})

    elif request.method == 'POST':
        data = request.get_json()
        tabs = data.get('tabs', [])
        phone = data.get('phone', '')
        instagram = data.get('instagram', '')
        whatsapp = data.get('whatsapp', '')

        if not isinstance(tabs, list) or len(tabs) > 4:
            return jsonify({"status": "fail", "message": "أقصى عدد 4 تصنيفات"}), 400

        settings = {
            "tabs": tabs,
            "phone": phone,
            "instagram": instagram,
            "whatsapp": whatsapp
        }

        with open(settings_file, 'w', encoding='utf-8') as f:
            json.dump(settings, f, ensure_ascii=False, indent=2)

        return jsonify({"status": "success", "message": "✅ تم حفظ التصنيفات والمعلومات"})



#دالة تعديل الفيديو الأصلي
def create_ad_video_from_video(input_path, output_path, name, price):
    try:
        from moviepy.editor import VideoFileClip, TextClip, CompositeVideoClip

        # ✅ أولاً حمّل الفيديو
        clip = VideoFileClip(input_path)

        # ✅ ثم حدّد أقصى مدة
        duration = min(10, clip.duration)

        # ✅ قصه وعدّله
        clip = clip.subclip(0, duration).resize(height=720)

        # ✅ النص الإعلاني
        text = f"{name}\nبسعر {price} ريال فقط"
        txt_clip = TextClip(text, fontsize=60, color="white", bg_color="black", size=clip.size)
        txt_clip = txt_clip.set_duration(4).set_position("center")

        # ✅ دمج النص مع الفيديو
        final = CompositeVideoClip([clip, txt_clip.set_start(1)])
        final.write_videofile(output_path, fps=24, codec="libx264", audio_codec="aac")
        print("🎞️ تم توليد فيديو دعائي من الفيديو الأصلي")

    except Exception as e:
        print(f"❌ خطأ أثناء توليد الفيديو الإعلاني: {e}")
        import traceback
        traceback.print_exc()

@app.route('/delete-user-remote/<user_id>', methods=['DELETE'])
def delete_user_remote(user_id):
    import os, shutil, json
    from urllib.parse import unquote, urlparse

    def extract_relative_path(path):
        try:
            parsed = urlparse(path)
            path_only = parsed.path  # يعطينا فقط /uploads/xxx
            if "/uploads/" in path_only:
                return path_only.split("/uploads/")[-1]
            return None
        except:
            return None

    user_id = unquote(user_id).strip().lower()
    tiktok_file = "tiktok_products.json"
    folders_to_delete = set()
    files_to_delete = set()

    # ✅ 1. قراءة المنتجات من الملف
    if os.path.exists(tiktok_file):
        try:
            with open(tiktok_file, "r", encoding="utf-8") as f:
                all_products = json.load(f)
        except Exception as e:
            print(f"❌ خطأ في قراءة الملف: {e}")
            all_products = []

        new_products = []
        for p in all_products:
            uid = p.get("user_id", "").strip().lower()
            if uid == user_id:
                url = p.get("url", "")
                poster = p.get("poster", "")

                # ✅ حذف مجلد HLS وإضافة ملف mp4 إن وجد
                if ".m3u8" in url and "uploads/hls/" in url:
                    try:
                        folder_name = url.split("uploads/hls/")[-1].split("/")[0]
                        folders_to_delete.add(folder_name)

                        mp4_path = os.path.join("uploads", f"{folder_name}.mp4")
                        if os.path.exists(mp4_path):
                            files_to_delete.add(f"{folder_name}.mp4")
                            print(f"🧹 سيُحذف mp4 الأصلي: {mp4_path}")
                    except Exception as e:
                        print(f"⚠️ خطأ في استخراج اسم المجلد أو mp4: {e}")

                # ✅ إضافة الملفات من url و poster
                for path in [url, poster]:
                    relative_path = extract_relative_path(path)
                    if relative_path and not relative_path.endswith("/"):
                        files_to_delete.add(relative_path)

                    if path.endswith(".mp4"):
                        rel_mp4_path = extract_relative_path(path)
                        if rel_mp4_path:
                            files_to_delete.add(rel_mp4_path)
            else:
                new_products.append(p)

        # ✅ حفظ الملف بعد حذف بيانات المستخدم
        try:
            with open(tiktok_file, "w", encoding="utf-8") as f:
                json.dump(new_products, f, ensure_ascii=False, indent=2)
            print("✅ تم حفظ المنتجات بعد الحذف")
        except Exception as e:
            print(f"❌ فشل حفظ الملف: {e}")

    # ✅ 2. حذف مجلدات HLS
    for folder in folders_to_delete:
        hls_path = os.path.join("uploads", "hls", folder)
        if os.path.exists(hls_path):
            try:
                shutil.rmtree(hls_path)
                print(f"🗑️ حذف مجلد HLS: {hls_path}")
            except Exception as e:
                print(f"❌ فشل حذف المجلد {hls_path}: {e}")

    # ✅ 3. حذف الملفات
    for rel_path in files_to_delete:
        full_path = os.path.join("uploads", rel_path)
        if os.path.exists(full_path):
            try:
                os.remove(full_path)
                print(f"🧹 حذف ملف: {full_path}")
            except Exception as e:
                print(f"❌ فشل حذف الملف {full_path}: {e}")

    # ✅ 4. التحقق النهائي من وجود الملفات بعد الحذف
    for rel_path in files_to_delete:
        full_path = os.path.join("uploads", rel_path)
        print(f"📁 التحقق من وجود الملف: {full_path}")
        print(f"📦 موجود؟ {os.path.exists(full_path)}")

    return jsonify({"status": "success", "message": f"✅ تم حذف كل بيانات {user_id} من سيرفر الرفع."})


def convert_and_send(file_path, file_id, product_data):
    convert_to_hls(file_path, file_id)

    hls_path = os.path.join(HLS_FOLDER, file_id)
    send_files_to_server_5000(hls_folder_path=hls_path)

    # بعد التأكد من رفع كل الملفات، عدّل الروابط وأرسل البيانات
    product_data["url"] = product_data["url"].replace(":5001", ":5000")
    product_data["poster"] = product_data["poster"].replace(":5001", ":5000")
    send_to_main_server(product_data)

    # حفظ المنتج محلياً
    json_file = os.path.join(os.path.dirname(__file__), "tiktok_products.json")
    try:
        with open(json_file, "r", encoding="utf-8") as f:
            products = json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        products = []

    products.insert(0, product_data)
    with open(json_file, "w", encoding="utf-8") as f:
        json.dump(products, f, ensure_ascii=False, indent=2)







