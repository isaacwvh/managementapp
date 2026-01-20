#contains all email utils
from jose import jwt
from datetime import datetime, timedelta
import os
from email.message import EmailMessage
from aiosmtplib import send
import asyncio

SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM")
EMAIL_TOKEN_EXPIRE_MINUTES = int(os.getenv("EMAIL_TOKEN_EXPIRE_MINUTES"))
BACKEND = os.getenv("BACKEND_API_URL")
SMTP_USER = os.getenv("SMTP_USER")
SMTP_PASS = os.getenv("SMTP_PASS")

async def send_verification_email_async(to_email: str, verification_link: str):
    message = EmailMessage()
    message["From"] = "no-reply@yourdomain.com"
    message["To"] = to_email
    message["Subject"] = "Verify your email address"
    message.set_content(
        f"Thank you for registering!\n\n"
        f"Please verify your email by clicking the following link:\n{verification_link}\n\n"
        f"If you didn't sign up, please ignore this message."
    )

    await send(
        message,
        hostname="smtp.gmail.com",
        port=587,
        username="",
        password="",
        start_tls=True,
    )



def create_email_token(email: str):
    expire = datetime.utcnow() + timedelta(minutes=EMAIL_TOKEN_EXPIRE_MINUTES)
    to_encode = {"sub": email, "exp": expire}
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def send_verification_email(to_email: str, token: str):
    link = f"{BACKEND}/auth/verify-email?token={token}"
    print("Verification link:", link)
    # Replace print with real email sending logic.
    asyncio.run(send_verification_email_async(to_email, link))



