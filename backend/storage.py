import json
import os
import uuid
from datetime import datetime
from typing import List, Dict, Optional

DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data")
KB_FILE = os.path.join(DATA_DIR, "knowledge_base.json")
CATEGORIES_FILE = os.path.join(DATA_DIR, "categories.json")


def ensure_data_dir():
    os.makedirs(DATA_DIR, exist_ok=True)
    if not os.path.exists(KB_FILE):
        with open(KB_FILE, "w", encoding="utf-8") as f:
            json.dump([], f, indent=2)
    if not os.path.exists(CATEGORIES_FILE):
        with open(CATEGORIES_FILE, "w", encoding="utf-8") as f:
            json.dump([], f, indent=2)


def load_categories() -> List[str]:
    ensure_data_dir()
    try:
        with open(CATEGORIES_FILE, "r", encoding="utf-8") as f:
            cats = json.load(f)
            if isinstance(cats, list):
                return cats
            return []
    except Exception as e:
        print(f"Error loading categories: {e}")
        return []


def save_categories(categories: List[str]):
    ensure_data_dir()
    # Deduplicate preserving order
    seen = set()
    unique_cats = []
    for c in categories:
        c_clean = c.strip()
        if c_clean and c_clean not in seen:
            seen.add(c_clean)
            unique_cats.append(c_clean)
    with open(CATEGORIES_FILE, "w", encoding="utf-8") as f:
        json.dump(unique_cats, f, indent=2, ensure_ascii=False)


def get_all_categories() -> List[str]:
    categories = load_categories()
    items = load_kb()
    for item in items:
        cat = item.get("category", "General").strip()
        if cat and cat not in categories:
            categories.append(cat)
    save_categories(categories)
    return categories


def add_category(category_name: str) -> str:
    category_name = category_name.strip()
    if not category_name:
        raise ValueError("Category name cannot be empty.")
    cats = get_all_categories()
    if category_name not in cats:
        cats.append(category_name)
        save_categories(cats)
    return category_name


def delete_category(category_name: str) -> bool:
    category_name = category_name.strip()
    cats = load_categories()
    if category_name in cats:
        cats = [c for c in cats if c != category_name]
        save_categories(cats)
    # Also delete associated Q&As
    items = load_kb()
    filtered_items = [item for item in items if item.get("category", "General") != category_name]
    save_kb(filtered_items)
    return True


def load_kb() -> List[Dict]:
    ensure_data_dir()
    try:
        with open(KB_FILE, "r", encoding="utf-8") as f:
            items = json.load(f)
            # Ensure category field exists for all items
            updated = False
            for item in items:
                if "category" not in item or not item["category"]:
                    item["category"] = "General"
                    updated = True
            if updated:
                save_kb(items)
            return items
    except Exception as e:
        print(f"Error loading knowledge base: {e}")
        return []


def save_kb(items: List[Dict]):
    ensure_data_dir()
    with open(KB_FILE, "w", encoding="utf-8") as f:
        json.dump(items, f, indent=2, ensure_ascii=False)


def add_qa(question: str, answer: str, category: str = "General") -> Dict:
    items = load_kb()
    cat_clean = category.strip() if category and category.strip() else "General"
    add_category(cat_clean)

    new_item = {
        "id": str(uuid.uuid4()),
        "question": question.strip(),
        "answer": answer.strip(),
        "category": cat_clean,
        "created_at": datetime.now().isoformat()
    }
    items.append(new_item)
    save_kb(items)
    return new_item


def add_bulk_qa(qa_pairs: List[Dict[str, str]], category: str) -> List[Dict]:
    items = load_kb()
    cat_clean = category.strip() if category and category.strip() else "General"
    add_category(cat_clean)

    new_items = []
    for pair in qa_pairs:
        new_item = {
            "id": str(uuid.uuid4()),
            "question": pair["question"].strip(),
            "answer": pair["answer"].strip(),
            "category": cat_clean,
            "created_at": datetime.now().isoformat()
        }
        items.append(new_item)
        new_items.append(new_item)

    save_kb(items)
    return new_items


def get_all_qa() -> List[Dict]:
    return load_kb()


def delete_qa(qa_id: str) -> bool:
    items = load_kb()
    initial_len = len(items)
    filtered_items = [item for item in items if item["id"] != qa_id]
    if len(filtered_items) < initial_len:
        save_kb(filtered_items)
        return True
    return False

