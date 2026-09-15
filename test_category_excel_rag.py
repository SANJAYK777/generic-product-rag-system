import urllib.request
import json
import time
import os
import io
import pandas as pd

BASE_URL = "http://localhost:8008"


def post_json(url, data):
    req = urllib.request.Request(
        url,
        data=json.dumps(data).encode('utf-8'),
        headers={'Content-Type': 'application/json'}
    )
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode('utf-8'))


def get_json(url):
    req = urllib.request.Request(url)
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode('utf-8'))


def delete_json(url):
    req = urllib.request.Request(url, method='DELETE')
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode('utf-8'))


def post_multipart(url, fields, files):
    boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW'
    body = []

    for key, value in fields.items():
        body.append(f'--{boundary}'.encode('utf-8'))
        body.append(f'Content-Disposition: form-data; name="{key}"'.encode('utf-8'))
        body.append(b'')
        body.append(value.encode('utf-8'))

    for key, filename, content in files:
        body.append(f'--{boundary}'.encode('utf-8'))
        body.append(f'Content-Disposition: form-data; name="{key}"; filename="{filename}"'.encode('utf-8'))
        body.append(b'Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        body.append(b'')
        body.append(content)

    body.append(f'--{boundary}--'.encode('utf-8'))
    body.append(b'')

    payload = b'\r\n'.join(body)
    req = urllib.request.Request(
        url,
        data=payload,
        headers={'Content-Type': f'multipart/form-data; boundary={boundary}'}
    )
    try:
        with urllib.request.urlopen(req) as resp:
            return resp.status, json.loads(resp.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        err_body = e.read().decode('utf-8')
        try:
            return e.code, json.loads(err_body)
        except Exception:
            return e.code, {"detail": err_body}


def run_all_tests():
    print("==================================================")
    print("STARTING CATEGORY & EXCEL IMPORT RAG SUITE TESTS")
    print("==================================================")

    # Health Check
    health = get_json(f"{BASE_URL}/api/health")
    print("\nBackend Health:", health)
    assert health["status"] == "ok"

    # Test 1: Create folder 'Electronics'
    print("\n--- Test 1: Create Folder 'Electronics' ---")
    res_cat1 = post_json(f"{BASE_URL}/api/admin/categories", {"name": "Electronics"})
    print("Create Category Result:", res_cat1)
    cats = get_json(f"{BASE_URL}/api/admin/categories")
    print("Active Categories:", cats)
    assert "Electronics" in cats

    # Test 2: Create multiple folders 'Clothing', 'Furniture'
    print("\n--- Test 2: Create Multiple Folders 'Clothing', 'Furniture' ---")
    post_json(f"{BASE_URL}/api/admin/categories", {"name": "Clothing"})
    post_json(f"{BASE_URL}/api/admin/categories", {"name": "Furniture"})
    cats = get_json(f"{BASE_URL}/api/admin/categories")
    print("Active Categories:", cats)
    assert "Electronics" in cats
    assert "Clothing" in cats
    assert "Furniture" in cats

    # Test 3: Add Q&A using '+ Add Q&A' under Electronics
    print("\n--- Test 3: Add Q&A under 'Electronics' ---")
    qa1 = {
        "question": "What is the battery capacity?",
        "answer": "The battery capacity is 4000mAh with fast charging support.",
        "category": "Electronics"
    }
    res_qa1 = post_json(f"{BASE_URL}/api/admin/qa", qa1)
    print("Added Q&A Item 1:", res_qa1)
    assert res_qa1["category"] == "Electronics"

    # Test 4: Add another Q&A under Electronics
    print("\n--- Test 4: Add Second Q&A under 'Electronics' ---")
    qa2 = {
        "question": "How do I charge the product?",
        "answer": "Use the supplied USB-C fast charger connected to a wall outlet.",
        "category": "Electronics"
    }
    res_qa2 = post_json(f"{BASE_URL}/api/admin/qa", qa2)
    print("Added Q&A Item 2:", res_qa2)
    assert res_qa2["category"] == "Electronics"

    all_qa = get_json(f"{BASE_URL}/api/admin/qa")
    electronics_qa = [item for item in all_qa if item["category"] == "Electronics"]
    print(f"Total Q&A items under Electronics: {len(electronics_qa)}")
    assert len(electronics_qa) >= 2

    # Test 5: Excel Import into 'Clothing'
    print("\n--- Test 5: Excel Import into 'Clothing' (5+ rows) ---")
    df_small = pd.DataFrame({
        "questions": [
            "What material is used?",
            "How should it be washed?",
            "Is this fabric stretchable?",
            "Does it shrink after washing?",
            "What sizes are available?"
        ],
        "answers": [
            "100% organic cotton material is used.",
            "Machine wash cold with similar colors.",
            "Yes, it has a 5% elastane blend for extra stretch.",
            "Pre-shrunk fabric ensures minimal shrinkage under 2%.",
            "Available sizes range from Small to XXL."
        ]
    })
    excel_buffer = io.BytesIO()
    df_small.to_excel(excel_buffer, index=False)
    excel_bytes = excel_buffer.getvalue()

    status_code, import_res = post_multipart(
        f"{BASE_URL}/api/admin/import-excel",
        fields={"category": "Clothing"},
        files=[("file", "test_clothing.xlsx", excel_bytes)]
    )
    print("Excel Import Status:", status_code)
    print("Excel Import Result:", import_res)
    assert status_code == 200
    assert import_res["status"] == "success"
    assert import_res["successfully_imported"] == 5

    # Test 6: Large Excel Import
    print("\n--- Test 6: Large Excel Import (50+ rows) ---")
    large_q = [f"What is product feature number {i}?" for i in range(1, 51)]
    large_a = [f"Feature {i} provides enhanced performance and reliability." for i in range(1, 51)]
    # Add a couple of invalid rows to test skipped row summary
    large_q.append("")  # Empty question
    large_a.append("Answer without question")
    large_q.append("Question without answer")
    large_a.append("")

    df_large = pd.DataFrame({"questions": large_q, "answers": large_a})
    large_buffer = io.BytesIO()
    df_large.to_excel(large_buffer, index=False)
    large_bytes = large_buffer.getvalue()

    status_code_large, large_res = post_multipart(
        f"{BASE_URL}/api/admin/import-excel",
        fields={"category": "Furniture"},
        files=[("file", "large_furniture.xlsx", large_bytes)]
    )
    print("Large Excel Import Status:", status_code_large)
    print("Large Excel Import Summary:", {
        "successfully_imported": large_res.get("successfully_imported"),
        "skipped": large_res.get("skipped"),
        "skipped_details": large_res.get("skipped_details")
    })
    assert status_code_large == 200
    assert large_res["successfully_imported"] == 50
    assert large_res["skipped"] == 2

    # Test 7: Invalid Excel format validation
    print("\n--- Test 7: Invalid Excel Format Validation ---")
    df_bad = pd.DataFrame({
        "wrong_column_1": ["Data 1", "Data 2"],
        "wrong_column_2": ["Val 1", "Val 2"]
    })
    bad_buffer = io.BytesIO()
    df_bad.to_excel(bad_buffer, index=False)
    bad_bytes = bad_buffer.getvalue()

    status_code_bad, bad_res = post_multipart(
        f"{BASE_URL}/api/admin/import-excel",
        fields={"category": "Electronics"},
        files=[("file", "bad_columns.xlsx", bad_bytes)]
    )
    print("Invalid Excel Response Code:", status_code_bad)
    print("Invalid Excel Response Detail:", bad_res)
    assert status_code_bad == 400
    assert "Required columns: questions, answers" in bad_res["detail"]

    # Test 8: Semantic Retrieval Test
    print("\n--- Test 8: Semantic Retrieval Test ---")
    # Add target Q&A first
    post_json(f"{BASE_URL}/api/admin/qa", {
        "question": "What is the recommended maintenance method?",
        "answer": "Follow the maintenance instructions provided with the product manual.",
        "category": "Electronics"
    })
    query_res = post_json(f"{BASE_URL}/api/user/ask", {"question": "How should I maintain this product?"})
    print("Semantic Query Result:", query_res)
    assert query_res["status"] == "success"
    assert "Follow the maintenance instructions" in query_res["answer"]
    assert query_res["similarity_score"] >= 0.50

    # Test 9: Cross-Category Retrieval Test
    print("\n--- Test 9: Cross-Category Retrieval Test ---")
    # Query for item in Clothing category from generic user search endpoint
    query_clothing = post_json(f"{BASE_URL}/api/user/ask", {"question": "How should I clean or wash this garment?"})
    print("Cross Category Query Result:", query_clothing)
    assert query_clothing["status"] == "success"
    assert "Machine wash cold" in query_clothing["answer"]

    # Test 10: No-match guardrail test (similarity < 0.50)
    print("\n--- Test 10: No-Match Guardrail Test ---")
    query_unrelated = post_json(f"{BASE_URL}/api/user/ask", {"question": "What is the distance from Earth to Jupiter in kilometers?"})
    print("Unrelated Question Result:", query_unrelated)
    assert query_unrelated["status"] == "no_match"
    assert query_unrelated["answer"] == "I couldn't find a relevant answer in the available knowledge base."
    assert query_unrelated["similarity_score"] < 0.50

    print("\n==================================================")
    print("ALL 10 TEST CASES PASSED SUCCESSFULLY! [SUCCESS]")
    print("==================================================")


if __name__ == "__main__":
    time.sleep(2)
    run_all_tests()
