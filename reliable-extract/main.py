# main.py
from fastapi import FastAPI, UploadFile, File, Form
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from starlette.requests import Request
import os
from agent_logic import run_reliable_extraction

app = FastAPI()
templates = Jinja2Templates(directory="templates") # Create a 'templates' folder

# Ensure 'data' folder exists for uploads
if not os.path.exists("data"):
    os.makedirs("data")

@app.get("/", response_class=HTMLResponse)
async def read_root(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

@app.post("/extract/")
async def extract_data(request: Request, document_file: UploadFile = File(...), fields: str = Form(...)):
    file_location = f"data/{document_file.filename}"
    with open(file_location, "wb+") as file_object:
        file_object.write(document_file.file.read())

    fields_list = [f.strip() for f in fields.split(',')]

    print(f"Starting extraction for {document_file.filename} with fields: {fields_list}")
    result = run_reliable_extraction(file_location, fields_list)

    return templates.TemplateResponse("results.html", {"request": request, "result": result, "document_name": document_file.filename})

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)