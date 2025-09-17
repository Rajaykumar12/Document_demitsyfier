import os
from dotenv import load_dotenv

load_dotenv()

# Configuration settings
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')
GEMINI_API_URL = f"https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key={GEMINI_API_KEY}"

# File and processing limits
MAX_CONTENT_LENGTH = 50 * 1024 * 1024  # 50MB
TEXT_LENGTH_LIMIT = 80000
WORD_THRESHOLD = 20

# Tesseract configuration
TESSERACT_CMD = r'C:\Program Files\Tesseract-OCR\tesseract.exe'