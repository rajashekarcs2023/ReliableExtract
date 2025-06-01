# check_env.py
import os
from dotenv import load_dotenv, set_key

def check_and_fix_api_key():
    # Load the current environment variables
    load_dotenv()
    
    # Get the current API key
    api_key = os.getenv("OPENAI_API_KEY")
    
    if not api_key:
        print("No OpenAI API key found in .env file")
        return
    
    # Check for common formatting issues
    if api_key.startswith('"') or api_key.endswith('"'):
        print("API key has quotes that need to be removed")
        # Remove quotes
        api_key = api_key.strip('"')
        
    if api_key.startswith("'") or api_key.endswith("'"):
        print("API key has single quotes that need to be removed")
        # Remove single quotes
        api_key = api_key.strip("'")
    
    # Check if the key starts with "sk-" (standard OpenAI API key format)
    if not api_key.startswith("sk-"):
        print("Warning: API key doesn't start with 'sk-', which is the standard format for OpenAI API keys")
    
    print(f"Current API key format: {api_key[:3]}...{api_key[-3:]} (length: {len(api_key)})")
    print("A valid OpenAI API key should:")
    print("1. Start with 'sk-'")
    print("2. Be approximately 51 characters long")
    print("3. Not have any quotes or extra spaces")
    
    # Provide instructions for fixing
    print("\nTo fix your API key, edit the .env file and ensure it looks like:")
    print("OPENAI_API_KEY=sk-your_actual_key_here_without_quotes")

if __name__ == "__main__":
    check_and_fix_api_key()
