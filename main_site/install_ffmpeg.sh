#!/bin/bash

# ⬇️ إنشاء مجلد bin إن لم يكن موجود
mkdir -p bin

# ⬇️ تحميل نسخة مصغّرة من ffmpeg
curl -L https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-i686-static.tar.xz | tar -xJ

# ⬇️ نسخ ffmpeg إلى مجلد bin
cp ffmpeg-*-static/ffmpeg bin/
chmod +x bin/ffmpeg

echo "✅ تم تثبيت ffmpeg محلياً في bin/"
