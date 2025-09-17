import PyPDF2
import cv2
import numpy as np
import pytesseract
from PIL import Image, ImageDraw, ImageFont
import io
import requests
from config import GEMINI_API_URL, TESSERACT_CMD, TEXT_LENGTH_LIMIT, WORD_THRESHOLD

# Configure Tesseract
pytesseract.pytesseract.tesseract_cmd = TESSERACT_CMD

def extract_text_simple(pdf_bytes):
    """Simple PDF text extraction using PyPDF2"""
    try:
        pdf_file = io.BytesIO(pdf_bytes)
        pdf_reader = PyPDF2.PdfReader(pdf_file)
        
        text = ""
        pages = len(pdf_reader.pages)
        
        for i, page in enumerate(pdf_reader.pages):
            page_text = page.extract_text()
            if page_text:
                text += page_text + "\n\n"
        
        words = len(text.split()) if text else 0
        
        return {
            'success': True,
            'text': text.strip(),
            'pages': pages,
            'words': words,
            'method': 'Text Extraction'
        }
    
    except Exception as e:
        return {
            'success': False,
            'error': str(e),
            'text': '',
            'pages': 0,
            'words': 0
        }

def pdf_to_images_simple(pdf_bytes):
    """Convert PDF to images using available method"""
    try:
        # Try PyMuPDF first
        try:
            import fitz
            pdf_document = fitz.open(stream=pdf_bytes, filetype="pdf")
            images = []
            
            for page_num in range(len(pdf_document)):
                page = pdf_document[page_num]
                mat = fitz.Matrix(2.0, 2.0)
                pix = page.get_pixmap(matrix=mat)
                img_data = pix.tobytes("ppm")
                pil_image = Image.open(io.BytesIO(img_data))
                images.append(pil_image)
            
            pdf_document.close()
            return images
            
        except ImportError:
            pass
        
        # Try pdf2image
        try:
            from pdf2image import convert_from_bytes
            images = convert_from_bytes(pdf_bytes, dpi=200)
            return images
        except ImportError:
            pass
        
        # Fallback: create basic images from text
        pdf_file = io.BytesIO(pdf_bytes)
        pdf_reader = PyPDF2.PdfReader(pdf_file)
        pages = len(pdf_reader.pages)
        
        images = []
        for i in range(pages):
            page = pdf_reader.pages[i]
            page_text = page.extract_text()
            
            img = Image.new('RGB', (2480, 3508), 'white')
            
            if page_text:
                draw = ImageDraw.Draw(img)
                
                try:
                    font = ImageFont.truetype("arial.ttf", 30)
                except:
                    font = ImageFont.load_default()
                
                lines = page_text[:2000].split('\n')[:50]
                y = 100
                for line in lines:
                    if y > 3000:
                        break
                    draw.text((100, y), line[:100], fill='black', font=font)
                    y += 40
            
            images.append(img)
        
        return images
        
    except Exception as e:
        raise Exception(f"Could not convert PDF to images: {e}")

def extract_text_with_ocr(pdf_bytes):
    """Extract text using OCR"""
    try:
        images = pdf_to_images_simple(pdf_bytes)
        
        full_text = ""
        pages = len(images)
        
        for i, image in enumerate(images):
            # Simple OpenCV preprocessing
            try:
                opencv_img = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
                gray = cv2.cvtColor(opencv_img, cv2.COLOR_BGR2GRAY)
                _, thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
                processed_image = Image.fromarray(thresh)
            except:
                processed_image = image
            
            # Perform OCR
            try:
                page_text = pytesseract.image_to_string(processed_image, config='--psm 6')
                
                if page_text.strip():
                    full_text += f"\n=== Page {i+1} ===\n"
                    full_text += page_text.strip() + "\n"
                    
            except Exception:
                continue
        
        words = len(full_text.split()) if full_text else 0
        
        return {
            'success': True,
            'text': full_text.strip(),
            'pages': pages,
            'words': words,
            'method': 'OCR'
        }
        
    except Exception as e:
        return {
            'success': False,
            'error': str(e),
            'text': '',
            'pages': 0,
            'words': 0
        }

def extract_text_auto(pdf_bytes):
    """Auto extraction: Try text first, then OCR automatically"""
    # Try text extraction
    text_result = extract_text_simple(pdf_bytes)
    
    # Check if text extraction was good enough
    if text_result['success'] and text_result['words'] > WORD_THRESHOLD:
        return text_result
    
    # Text extraction poor, try OCR
    ocr_result = extract_text_with_ocr(pdf_bytes)
    
    # Return best result
    if ocr_result['success'] and ocr_result['words'] > 0:
        return ocr_result
    
    # If both failed, return the one with more words
    if text_result['words'] >= ocr_result['words']:
        return text_result
    else:
        return ocr_result

def get_ai_explanation(text, question=None):
    """Get AI explanation"""
    prompt = """You are a Document Demystifier. Make complex documents simple and easy to understand.

Your task:
1. Start with what this document is about (simple summary)
2. List the main points (use bullet points)
3. Explain difficult words or terms in simple language
4. Highlight what's important
5. Use clear, simple language everyone can understand

Make it accessible for anyone, regardless of their background."""

    if question:
        full_prompt = f"{prompt}\n\nDocument:\n{text}\n\nUser's question: {question}\n\nAnswer the question and explain the document."
    else:
        full_prompt = f"{prompt}\n\nDocument:\n{text}"
    
    # Limit length
    if len(full_prompt) > TEXT_LENGTH_LIMIT:
        full_prompt = full_prompt[:TEXT_LENGTH_LIMIT] + "\n\n[Document shortened]"
    
    data = {"contents": [{"parts": [{"text": full_prompt}]}]}
    
    try:
        response = requests.post(GEMINI_API_URL, json=data, timeout=60)
        
        if response.ok:
            result = response.json()
            explanation = result['candidates'][0]['content']['parts'][0]['text']
            return explanation
        else:
            raise Exception(f"AI API error: {response.status_code}")
    
    except Exception as e:
        raise Exception(f"AI failed: {str(e)}")

def check_tesseract_availability():
    """Check if Tesseract is available"""
    try:
        pytesseract.get_tesseract_version()
        return "Available"
    except:
        return "Missing"