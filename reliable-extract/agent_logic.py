# agent_logic.py
import json
from utils import call_llm, load_document_text
from validation_rules import validate_extracted_data

EXTRACTION_SYSTEM_PROMPT = """You are a highly accurate data extraction agent. Your task is to extract specific information from the provided document text.
Respond ONLY with a JSON object containing the extracted fields. Do not include any other text or explanation.
If a field is not found, include it as null.
"""

CORRECTION_SYSTEM_PROMPT = """You are a highly skilled data extraction agent, tasked with correcting errors in previously extracted data.
You will be provided with the original document text, the previously extracted JSON data, and a list of specific errors encountered during validation.
Your goal is to carefully re-examine the document, fix ONLY the identified errors, and return a new, corrected JSON object.
Do not change fields that were not flagged as errors.
Respond ONLY with the corrected JSON object. Do not include any other text or explanation.
"""

def run_reliable_extraction(document_path: str, fields_to_extract: list, max_attempts: int = 3):
    doc_text = load_document_text(document_path)
    if not doc_text:
        return {"status": "error", "message": "Could not load document text."}

    history = []
    extracted_data = {}
    is_valid = False
    attempt_count = 0

    while not is_valid and attempt_count < max_attempts:
        attempt_count += 1
        current_extraction_prompt = ""
        current_extracted_json_str = ""
        current_errors = []

        if attempt_count == 1:
            # Initial extraction prompt
            current_extraction_prompt = f"""
            Extract the following fields from the document text: {', '.join(fields_to_extract)}.
            Document Text:
            ---
            {doc_text}
            ---
            Expected JSON format (example, include all fields even if null):
            {{
                "field1": "value",
                "field2": "value",
                ...
            }}
            """
            print(f"\n--- Attempt {attempt_count}: Initial Extraction ---")
            current_extracted_json_str = call_llm(EXTRACTION_SYSTEM_PROMPT, current_extraction_prompt, json_mode=True)
        else:
            # Self-correction prompt
            error_summary = "\n".join([f"- {err['field']}: {err['error']}" for err in history[-1]['errors']])
            current_extraction_prompt = f"""
            Original Document Text:
            ---
            {doc_text}
            ---
            Previous Extracted Data (JSON):
            {json.dumps(extracted_data, indent=2)}

            Errors to correct (specifically address these fields and issues):
            {error_summary}

            Please re-extract the data, focusing on correcting the identified errors. Return only the corrected JSON.
            """
            print(f"\n--- Attempt {attempt_count}: Self-Correction ---")
            current_extracted_json_str = call_llm(CORRECTION_SYSTEM_PROMPT, current_extraction_prompt, json_mode=True)

        if current_extracted_json_str:
            try:
                extracted_data = json.loads(current_extracted_json_str)
                is_valid, current_errors = validate_extracted_data(extracted_data, fields_to_extract)
            except json.JSONDecodeError:
                is_valid = False
                current_errors = [{"field": "N/A", "error": "LLM returned invalid JSON."}]
        else:
            is_valid = False
            current_errors = [{"field": "N/A", "error": "LLM returned no response."}]

        # Log current attempt
        history.append({
            "attempt": attempt_count,
            "prompt": current_extraction_prompt,
            "raw_llm_output": current_extracted_json_str,
            "extracted_data": extracted_data,
            "is_valid": is_valid,
            "errors": current_errors
        })

        print(f"Extracted Data: {json.dumps(extracted_data, indent=2)}")
        print(f"Validation Errors: {current_errors}")
        print(f"Is Valid: {is_valid}")

        if is_valid:
            print("\n--- Extraction Successful after self-correction! ---")
            break
        elif attempt_count == max_attempts:
            print("\n--- Max attempts reached. Extraction failed to validate. ---")

    return {
        "final_status": "success" if is_valid else "failure",
        "final_data": extracted_data,
        "validation_errors": current_errors,
        "attempt_history": history
    }