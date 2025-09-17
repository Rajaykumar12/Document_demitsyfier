from flask import Flask, request, jsonify
from flask_cors import CORS
from werkzeug.utils import secure_filename

from config import GEMINI_API_KEY, MAX_CONTENT_LENGTH
from services import extract_text_auto, get_ai_explanation, check_tesseract_availability

app = Flask(__name__)
CORS(app)

# Configuration
app.config['MAX_CONTENT_LENGTH'] = MAX_CONTENT_LENGTH

@app.route('/', methods=['GET'])
def home():
    return jsonify({
        "message": "Document Demystifier - Auto Mode",
        "description": "Automatically tries text extraction first, then OCR if needed",
        "status": "Running",
        "features": [
            "Auto extraction (text then OCR)",
            "OpenCV preprocessing",
            "AI explanations"
        ]
    })

@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        "status": "Running",
        "tesseract": check_tesseract_availability(),
        "opencv": "Available",
        "api_key": "Connected" if GEMINI_API_KEY else "Missing"
    })

@app.route('/analyze', methods=['POST'])
def analyze():
    """Single endpoint: Auto extraction + AI explanation"""
    try:
        # Check file
        if 'file' not in request.files:
            return jsonify({"success": False, "error": "Please upload a PDF file"}), 400
        
        file = request.files['file']
        if not file.filename or not file.filename.lower().endswith('.pdf'):
            return jsonify({"success": False, "error": "Only PDF files allowed"}), 400
        
        question = request.form.get('question', '').strip()
        filename = secure_filename(file.filename)
        
        # Auto extraction
        pdf_bytes = file.read()
        file_size = len(pdf_bytes) / 1024 / 1024
        
        result = extract_text_auto(pdf_bytes)
        
        if not result['success'] or not result['text'].strip():
            return jsonify({
                "success": False, 
                "error": f"Could not extract text: {result.get('error', 'No text found')}"
            }), 400
        
        # Get AI explanation
        explanation = get_ai_explanation(result['text'], question)
        
        return jsonify({
            "success": True,
            "explanation": explanation,
            "extracted_text": result['text'],
            "info": {
                "filename": filename,
                "pages": result['pages'],
                "words": result['words'],
                "method": result['method'],
                "size_mb": round(file_size, 2),
                "has_question": bool(question)
            }
        })
    
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

if __name__ == '__main__':
    if not GEMINI_API_KEY:
        print("ERROR: Need GEMINI_API_KEY in .env file")
        exit(1)
    
    print("Document Demystifier - Auto Mode")
    print("Server: http://localhost:5000")
    print("Endpoint: POST /analyze")
    
    app.run(debug=True, port=5000)