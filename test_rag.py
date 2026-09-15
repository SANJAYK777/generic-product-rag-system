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
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode('utf-8'))

def get_json(url):
    req = urllib.request.Request(url)
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode('utf-8'))

def run_tests():
    print("--- 1. Testing Backend Health ---")
    health = get_json(f"{BASE_URL}/api/health")
    print("Health response:", health)
    assert health["status"] == "ok"

    print("\n--- 2. Test 1: Admin Adding Knowledge Entry ---")
    admin_payload = {
        "question": "What is the recommended maintenance method?",
        "answer": "Follow the maintenance instructions provided with the product."
    }
    added_item = post_json(f"{BASE_URL}/api/admin/qa", admin_payload)
    print("Added Q&A Item:", added_item)
    assert "id" in added_item

    print("\n--- 3. Test 2: User Direct Question ---")
    q1 = {"question": "What is the recommended maintenance method?"}
    res1 = post_json(f"{BASE_URL}/api/user/ask", q1)
    print("Direct Question Result:", res1)
    assert res1["status"] == "success"
    assert res1["answer"] == "Follow the maintenance instructions provided with the product."
    assert res1["similarity_score"] >= 0.95

    print("\n--- 4. Test 3: User Rephrased / Similar Question ---")
    q2 = {"question": "How should I maintain this product?"}
    res2 = post_json(f"{BASE_URL}/api/user/ask", q2)
    print("Similar Question Result:", res2)
    assert res2["status"] == "success"
    assert res2["answer"] == "Follow the maintenance instructions provided with the product."
    assert res2["similarity_score"] >= 0.50

    print("\n--- 5. Test 4: Unrelated Question (Guardrail Verification) ---")
    q3 = {"question": "Who won the FIFA World Cup?"}
    res3 = post_json(f"{BASE_URL}/api/user/ask", q3)
    print("Unrelated Question Result:", res3)
    assert res3["status"] == "no_match"
    assert res3["answer"] == "I couldn't find a relevant answer in the available knowledge base."

    print("\nALL RAG SYSTEM TESTS PASSED SUCCESSFULLY! [SUCCESS]")

if __name__ == "__main__":
    time.sleep(2)  # Ensure server initialized
    run_tests()
