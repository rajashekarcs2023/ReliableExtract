# utils.py
import os
from openai import OpenAI # Or from anthropic import Anthropic
from dotenv import load_dotenv

load_dotenv()

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
# Or client = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

def call_llm(system_prompt: str, user_prompt: str, json_mode: bool = False):
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt},
    ]
    response_format = {"type": "json_object"} if json_mode else {"type": "text"}
    try:
        response = client.chat.completions.create(
            model="gpt-4o", # Or "claude-3-5-sonnet-20240620"
            messages=messages,
            response_format=response_format,
            temperature=0.1 # Keep it deterministic for extraction
        )
        return response.choices[0].message.content
    except Exception as e:
        print(f"LLM call failed: {e}")
        return None

def load_document_text(file_path: str) -> str:
    # For simplicity, start with plain text files in 'data/'
    if file_path.endswith('.txt'):
        with open(file_path, 'r', encoding='utf-8') as f:
            return f.read()
    elif file_path.endswith('.pdf'):
        from PyPDF2 import PdfReader
        text = ""
        try:
            with open(file_path, 'rb') as f:
                reader = PdfReader(f)
                for page in reader.pages:
                    text += page.extract_text() or ""
            return text
        except Exception as e:
            print(f"Error reading PDF: {e}")
            return ""
    # Add more types (docx, etc.) later if needed
    return "Unsupported file type."