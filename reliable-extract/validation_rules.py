# validation_rules.py
import re

def validate_invoice_number(invoice_data: dict) -> tuple[bool, str]:
    invoice_num = invoice_data.get("invoice_number")
    if not invoice_num:
        return False, "Invoice number is missing."
    if not isinstance(invoice_num, str):
        return False, "Invoice number is not a string."
    # Example: Must be alphanumeric and at least 5 chars long
    if not re.match(r"^[A-Z0-9]{5,}$", invoice_num, re.IGNORECASE):
        return False, "Invoice number format is invalid (must be alphanumeric, min 5 chars)."
    return True, "Invoice number is valid."

def validate_total_amount(invoice_data: dict) -> tuple[bool, str]:
    total_amount = invoice_data.get("total_amount")
    if total_amount is None:
        return False, "Total amount is missing."
    try:
        # Attempt to convert to float
        float(total_amount)
        return True, "Total amount is valid."
    except (ValueError, TypeError):
        return False, "Total amount is not a valid number."

# Map field names to their validation functions
VALIDATION_FUNCTIONS = {
    "invoice_number": validate_invoice_number,
    "total_amount": validate_total_amount,
    # Add more as you expand
}

def validate_extracted_data(extracted_data: dict, required_fields: list) -> tuple[bool, list]:
    """
    Runs all relevant validation rules on the extracted data.
    Returns (is_valid, list_of_errors)
    """
    errors = []
    is_overall_valid = True

    for field in required_fields:
        if field in VALIDATION_FUNCTIONS:
            is_field_valid, error_msg = VALIDATION_FUNCTIONS[field](extracted_data)
            if not is_field_valid:
                errors.append({"field": field, "error": error_msg})
                is_overall_valid = False
        else:
            # Basic check for fields that don't have specific validation functions
            if field not in extracted_data or extracted_data.get(field) is None:
                errors.append({"field": field, "error": f"Required field '{field}' is missing."})
                is_overall_valid = False

    return is_overall_valid, errors