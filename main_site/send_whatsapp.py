import requests

url = "https://graph.facebook.com/v19.0/638706609333099/messages"  # تأكد أن الرقم ID صحيح (Phone Number ID)

headers = {
    "Authorization": "Bearer EAAJt7LjZAVWEBO4VFNhqt0eRYlGcXz915hvQoONoPKVZCoZBKC16hqVie6DEHARpZAV5iGvrg8HHK0EVUfjmRCbO6B5ZBhtNnLgVmFz5aZBlRXUYZA9WZAplX3z8SaSerEZBzg1dSZBVvRAXAoO7QpArBxWZBgjO46bCGZBAnBGmUQc2Mv9bZABWC0tsQmhZBxScCPqJXXRzYRBrdlMz2ODsU1W8k70ZCnOqQ4ZD",
    "Content-Type": "application/json"
}

data = {
    "messaging_product": "whatsapp",
    "to": "97433665466",  # رقم المستقبل بدون +
    "type": "template",
    "template": {
        "name": "newsubscription",  # اسم القالب في واتساب
        "language": { "code": "en" }
    }
}

response = requests.post(url, headers=headers, json=data)
print("Status:", response.status_code)
print("Response:", response.json())
