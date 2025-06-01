# test_llm.py
from utils import call_llm
import os

def test_llm_call():
    system_prompt = "You are a helpful assistant."
    user_prompt = "Say hello world!"
    
    print("Testing LLM call...")
    print(f"OPENAI_API_KEY exists: {bool(os.getenv('OPENAI_API_KEY'))}")
    print(f"OPENAI_API_KEY length: {len(os.getenv('OPENAI_API_KEY') or '')}")
    
    try:
        response = call_llm(system_prompt, user_prompt)
        print("LLM Response:")
        print(response)
        return True
    except Exception as e:
        print(f"Error calling LLM: {e}")
        return False

if __name__ == "__main__":
    test_llm_call()
