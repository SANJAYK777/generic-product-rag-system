from fastapi import FastAPI, HTTPException, status, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional, Dict
import io
import pandas as pd
import uvicorn

from backend.storage import (
    add_qa, get_all_qa, delete_qa,
    get_all_categories, add_category, delete_category, add_bulk_qa
)
from backend.rag_engine import get_rag_engine

app = FastAPI(
    title="Generic Product RAG API",
    description="Product-independent Knowledge Base RAG Application with Category Management & Excel Import",
    version="2.0.0"
)

# Enable CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Pydantic Schemas
class CategoryCreateSchema(BaseModel):
    name: str = Field(..., min_length=1, description="The category/folder name")


class QACreateSchema(BaseModel):
    question: str = Field(..., min_length=2, description="The knowledge question")
    answer: str = Field(..., min_length=2, description="The knowledge answer")
    category: Optional[str] = Field("General", description="The assigned category/folder")


class QAResponseSchema(BaseModel):
    id: str
    question: str
    answer: str
    category: str
    created_at: str


class AskQuestionSchema(BaseModel):
    category: str = Field(..., min_length=1, description="The selected product/category folder")
    question: str = Field(..., min_length=1, description="The user's query question")


class AskResponseSchema(BaseModel):
    status: str
    answer: str
    similarity_score: float
    matched_question: Optional[str] = None
    matched_id: Optional[str] = None
    category: Optional[str] = None


@app.on_event("startup")
def startup_event():
    # Initialize RAG engine model on server startup
    engine = get_rag_engine()
    print("Backend startup complete. RAG engine ready.")


@app.get("/api/health")
def health_check():
    engine = get_rag_engine()
    return {
        "status": "ok",
        "service": "Generic Product RAG API",
        "indexed_items": len(engine.embeddings_cache)
    }


# Admin Category / Folder Endpoints
@app.get("/api/admin/categories", response_model=List[str])
def list_categories():
    """Returns all created categories/folders."""
    return get_all_categories()


@app.post("/api/admin/categories", status_code=status.HTTP_201_CREATED)
def create_category(payload: CategoryCreateSchema):
    """Creates a new dynamic knowledge category/folder."""
    cat_name = payload.name.strip()
    if not cat_name:
        raise HTTPException(status_code=400, detail="Category/Folder name cannot be empty.")
    created = add_category(cat_name)
    return {"name": created}


@app.delete("/api/admin/categories/{category_name}")
def remove_category(category_name: str):
    """Deletes a category/folder and its associated Q&A items."""
    success = delete_category(category_name)
    engine = get_rag_engine()
    engine.reindex()
    return {"message": f"Category '{category_name}' and associated Q&A deleted successfully."}


# Admin Knowledge Interface Endpoints
@app.get("/api/admin/qa", response_model=List[QAResponseSchema])
def list_knowledge_base():
    """Returns all Q&A items in the Knowledge Base."""
    return get_all_qa()


@app.post("/api/admin/qa", response_model=QAResponseSchema, status_code=status.HTTP_201_CREATED)
def create_knowledge_item(payload: QACreateSchema):
    """
    Validates and adds a new Question & Answer pair to the Knowledge Base under a specific folder,
    generating vector embedding immediately.
    """
    q = payload.question.strip()
    a = payload.answer.strip()
    cat = payload.category.strip() if payload.category else "General"

    if not q or not a:
        raise HTTPException(
            status_code=400,
            detail="Question and answer must both contain non-whitespace text."
        )

    new_item = add_qa(q, a, category=cat)
    # Update RAG Engine index
    engine = get_rag_engine()
    engine.add_or_update_item(new_item)
    return new_item


@app.delete("/api/admin/qa/{qa_id}")
def remove_knowledge_item(qa_id: str):
    """Deletes a Q&A item from the Knowledge Base and updates RAG index."""
    success = delete_qa(qa_id)
    if not success:
        raise HTTPException(status_code=404, detail="Q&A item not found.")

    engine = get_rag_engine()
    engine.remove_item(qa_id)
    return {"message": "Knowledge item deleted successfully.", "id": qa_id}


# Admin Bulk Excel Import Endpoint
@app.post("/api/admin/import-excel")
async def import_excel_qa(
    file: UploadFile = File(...),
    category: str = Form(...)
):
    """
    Imports Q&A entries from an Excel (.xlsx or .xls) file into the specified folder.
    Validates file format, checks required columns ('questions', 'answers'), filters invalid rows,
    generates embeddings, and updates the RAG index.
    """
    category_name = category.strip()
    if not category_name:
        raise HTTPException(status_code=400, detail="Destination folder/category must be specified.")

    filename = file.filename.lower()
    if not (filename.endswith(".xlsx") or filename.endswith(".xls")):
        raise HTTPException(
            status_code=400,
            detail="Unsupported file type. Please upload a valid Excel file (.xlsx or .xls)."
        )

    try:
        contents = await file.read()
        df = pd.read_excel(io.BytesIO(contents))
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid Excel file or failed to read content: {str(e)}"
        )

    # Normalize column names for strict validation
    cols_map = {str(col).strip().lower(): col for col in df.columns}
    
    if "questions" not in cols_map or "answers" not in cols_map:
        raise HTTPException(
            status_code=400,
            detail="Invalid Excel format. Required columns: questions, answers"
        )

    q_col = cols_map["questions"]
    a_col = cols_map["answers"]

    valid_pairs = []
    skipped_details = []
    total_rows = len(df)

    for idx, row in df.iterrows():
        excel_row_num = idx + 2  # Row 1 is headers
        q_val = str(row[q_col]).strip() if pd.notna(row[q_col]) else ""
        a_val = str(row[a_col]).strip() if pd.notna(row[a_col]) else ""

        # Remove string literal 'nan' if converted from pd.notna edge cases
        if q_val.lower() == 'nan':
            q_val = ""
        if a_val.lower() == 'nan':
            a_val = ""

        if not q_val and not a_val:
            skipped_details.append(f"Row {excel_row_num}: Empty row")
        elif not q_val:
            skipped_details.append(f"Row {excel_row_num}: Empty question")
        elif not a_val:
            skipped_details.append(f"Row {excel_row_num}: Empty answer")
        else:
            valid_pairs.append({"question": q_val, "answer": a_val})

    if not valid_pairs:
        return {
            "status": "warning",
            "message": "No valid Q&A rows were found in the uploaded file.",
            "folder": category_name,
            "total_rows": total_rows,
            "successfully_imported": 0,
            "skipped": len(skipped_details),
            "skipped_details": skipped_details
        }

    # Store valid pairs into Knowledge Base under selected folder
    new_items = add_bulk_qa(valid_pairs, category=category_name)

    # Generate embeddings and index in RAG Engine
    engine = get_rag_engine()
    engine.add_bulk_items(new_items)

    return {
        "status": "success",
        "message": "Excel import completed successfully.",
        "folder": category_name,
        "total_rows": total_rows,
        "successfully_imported": len(new_items),
        "skipped": len(skipped_details),
        "skipped_details": skipped_details
    }


# User Interface Endpoints
@app.get("/api/user/categories", response_model=List[str])
def get_user_categories():
    """Returns all available product/category folders for user selection."""
    return get_all_categories()


@app.post("/api/user/ask", response_model=AskResponseSchema)
def ask_question(payload: AskQuestionSchema):
    """
    Performs semantic vector search against knowledge base embeddings filtered strictly by category.
    Returns matching answer or generic 'not found' message if similarity threshold is not met.
    """
    cat = payload.category.strip()
    q = payload.question.strip()

    if not cat:
        raise HTTPException(
            status_code=400,
            detail="Please select a product/category before asking a question."
        )
    if not q:
        raise HTTPException(
            status_code=400,
            detail="Question cannot be empty."
        )

    engine = get_rag_engine()
    result = engine.query(user_question=q, category=cat)
    return result


if __name__ == "__main__":
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8008, reload=True)
