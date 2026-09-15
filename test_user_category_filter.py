import urllib.request
import json
import time

BASE_URL = "http://localhost:8008"


def post_json(url, data):
    req = urllib.request.Request(
        url,
        data=json.dumps(data).encode('utf-8'),
        headers={'Content-Type': 'application/json'}
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


def get_json(url):
    req = urllib.request.Request(url)
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode('utf-8'))


def run_tests():
    print("==================================================")
    print("STARTING USER CATEGORY FILTER RAG SUITE TESTS")
    print("==================================================")

    # Health Check
    health = get_json(f"{BASE_URL}/api/health")
    print("\nBackend Health:", health)
    assert health["status"] == "ok"

    # Test 1: Create folders 'Jerkin' and 'Shirts' with overlapping questions
    print("\n--- Test 1: Setup Folders 'Jerkin' and 'Shirts' ---")
    post_json(f"{BASE_URL}/api/admin/categories", {"name": "Jerkin"})
    post_json(f"{BASE_URL}/api/admin/categories", {"name": "Shirts"})

    # Add Jerkin Q&A
    post_json(f"{BASE_URL}/api/admin/qa", {
        "question": "Is this product warm?",
        "answer": "Yes, the jerkin is designed to provide warmth during cold weather.",
        "category": "Jerkin"
    })

    # Add Shirts Q&A
    post_json(f"{BASE_URL}/api/admin/qa", {
        "question": "Is this product warm?",
        "answer": "This shirt is lightweight and intended for regular wear.",
        "category": "Shirts"
    })

    cats = get_json(f"{BASE_URL}/api/user/categories")
    print("Available User Categories:", cats)
    assert "Jerkin" in cats
    assert "Shirts" in cats

    # Test 2: Jerkin filtering
    print("\n--- Test 2: Jerkin Filtering ---")
    status, res_jerkin = post_json(f"{BASE_URL}/api/user/ask", {
        "category": "Jerkin",
        "question": "Is that warm?"
    })
    print("Jerkin Query Result:", res_jerkin)
    assert status == 200
    assert res_jerkin["status"] == "success"
    assert "jerkin is designed to provide warmth" in res_jerkin["answer"]

    # Test 3: Shirts filtering
    print("\n--- Test 3: Shirts Filtering ---")
    status, res_shirts = post_json(f"{BASE_URL}/api/user/ask", {
        "category": "Shirts",
        "question": "Is that warm?"
    })
    print("Shirts Query Result:", res_shirts)
    assert status == 200
    assert res_shirts["status"] == "success"
    assert "shirt is lightweight" in res_shirts["answer"]

    # Test 4: Cross-category protection
    print("\n--- Test 4: Cross-Category Protection ---")
    # Ask a question matching only Shirts while selecting Jerkin category
    status, res_cross = post_json(f"{BASE_URL}/api/user/ask", {
        "category": "Jerkin",
        "question": "Is this lightweight for regular wear?"
    })
    print("Cross Category Query Result under Jerkin:", res_cross)
    assert status == 200
    assert res_cross["status"] == "no_match"
    assert "shirt is lightweight" not in res_cross.get("answer", "")
    assert "couldn't find a relevant answer in the selected category" in res_cross["answer"]

    # Test 5: Semantic matching inside category
    print("\n--- Test 5: Semantic Matching inside 'Jerkin' ---")
    post_json(f"{BASE_URL}/api/admin/qa", {
        "question": "What is the recommended maintenance method?",
        "answer": "Follow the jerkin care manual for leather conditioning.",
        "category": "Jerkin"
    })
    status, res_sem = post_json(f"{BASE_URL}/api/user/ask", {
        "category": "Jerkin",
        "question": "How should I maintain this product?"
    })
    print("Semantic Query Result under Jerkin:", res_sem)
    assert status == 200
    assert res_sem["status"] == "success"
    assert "jerkin care manual" in res_sem["answer"]
    assert res_sem["similarity_score"] >= 0.50

    # Test 6: Empty category handling
    print("\n--- Test 6: Empty Category Handling ---")
    post_json(f"{BASE_URL}/api/admin/categories", {"name": "TestEmptyFolder"})
    status, res_empty = post_json(f"{BASE_URL}/api/user/ask", {
        "category": "TestEmptyFolder",
        "question": "Is that warm?"
    })
    print("Empty Category Query Result:", res_empty)
    assert status == 200
    assert res_empty["status"] == "no_match"
    assert "No knowledge is currently available for this category." in res_empty["answer"]

    # Test 7: No category selected
    print("\n--- Test 7: No Category Selected Validation ---")
    status, res_no_cat = post_json(f"{BASE_URL}/api/user/ask", {
        "category": "",
        "question": "Is that warm?"
    })
    print("No Category Response Status:", status)
    print("No Category Response Detail:", res_no_cat)
    assert status in (400, 422)

    # Test 8: Category Switching Test
    print("\n--- Test 8: Dynamic Category Switching ---")
    status1, q1 = post_json(f"{BASE_URL}/api/user/ask", {"category": "Jerkin", "question": "Is that warm?"})
    status2, q2 = post_json(f"{BASE_URL}/api/user/ask", {"category": "Shirts", "question": "Is that warm?"})
    print("Jerkin query:", q1["answer"])
    print("Shirts query:", q2["answer"])
    assert "jerkin" in q1["answer"].lower()
    assert "shirt" in q2["answer"].lower()

    print("\n==================================================")
    print("ALL USER CATEGORY FILTER TESTS PASSED! [SUCCESS]")
    print("==================================================")


if __name__ == "__main__":
    time.sleep(2)
    run_tests()
