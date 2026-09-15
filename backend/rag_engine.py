import numpy as np
from typing import Dict, List, Optional, Tuple
from sentence_transformers import SentenceTransformer
from backend.storage import get_all_qa

MODEL_NAME = 'all-MiniLM-L6-v2'
SIMILARITY_THRESHOLD = 0.50  # 50% semantic similarity threshold


class RAGEngine:
    def __init__(self):
        print(f"Loading SentenceTransformer model: {MODEL_NAME}...")
        self.model = SentenceTransformer(MODEL_NAME)
        self.embeddings_cache = {}
        self.reindex()

    def reindex(self):
        """Re-generates embeddings for all items in the knowledge base."""
        qa_items = get_all_qa()
        self.embeddings_cache = {}
        if not qa_items:
            return

        questions = [item["question"] for item in qa_items]
        embeddings = self.model.encode(questions, convert_to_numpy=True)

        for item, emb in zip(qa_items, embeddings):
            # Normalize embedding for fast cosine similarity calculation
            norm = np.linalg.norm(emb)
            normalized_emb = emb / norm if norm > 0 else emb
            self.embeddings_cache[item["id"]] = {
                "item": item,
                "embedding": normalized_emb
            }
        print(f"Indexed {len(self.embeddings_cache)} Q&A items.")

    def add_or_update_item(self, item: Dict):
        """Encodes and updates index for a single newly added Q&A item."""
        question = item["question"]
        emb = self.model.encode(question, convert_to_numpy=True)
        norm = np.linalg.norm(emb)
        normalized_emb = emb / norm if norm > 0 else emb
        self.embeddings_cache[item["id"]] = {
            "item": item,
            "embedding": normalized_emb
        }

    def add_bulk_items(self, items: List[Dict]):
        """Encodes and updates index for multiple newly added Q&A items."""
        if not items:
            return
        questions = [item["question"] for item in items]
        embeddings = self.model.encode(questions, convert_to_numpy=True)
        for item, emb in zip(items, embeddings):
            norm = np.linalg.norm(emb)
            normalized_emb = emb / norm if norm > 0 else emb
            self.embeddings_cache[item["id"]] = {
                "item": item,
                "embedding": normalized_emb
            }

    def remove_item(self, item_id: str):
        """Removes an item from the in-memory index."""
        if item_id in self.embeddings_cache:
            del self.embeddings_cache[item_id]

    def query(self, user_question: str, category: Optional[str] = None) -> Dict:
        """
        Performs semantic similarity search for a user question restricted strictly to the selected category.
        First filters knowledge base items by category, then computes cosine similarity on the filtered set.
        """
        user_question = user_question.strip()
        if not user_question:
            return {
                "status": "error",
                "message": "Question cannot be empty.",
                "answer": "Please enter a valid question.",
                "similarity_score": 0.0
            }

        # Filter embeddings cache strictly by category if category is specified
        target_items = {}
        if category and category.strip():
            cat_clean = category.strip()
            for item_id, data in self.embeddings_cache.items():
                if data["item"].get("category", "General") == cat_clean:
                    target_items[item_id] = data
        else:
            target_items = self.embeddings_cache

        if not target_items:
            if category and category.strip():
                return {
                    "status": "no_match",
                    "answer": "No knowledge is currently available for this category.",
                    "similarity_score": 0.0,
                    "matched_question": None
                }
            else:
                return {
                    "status": "no_match",
                    "answer": "I couldn't find a relevant answer in the selected category.",
                    "similarity_score": 0.0,
                    "matched_question": None
                }

        # Encode user query
        query_emb = self.model.encode(user_question, convert_to_numpy=True)
        query_norm = np.linalg.norm(query_emb)
        if query_norm > 0:
            query_emb = query_emb / query_norm

        best_score = -1.0
        best_match_item = None

        for item_id, data in target_items.items():
            doc_emb = data["embedding"]
            score = float(np.dot(query_emb, doc_emb))
            if score > best_score:
                best_score = score
                best_match_item = data["item"]

        # Bound score between 0.0 and 1.0 for UI display
        similarity_score = max(0.0, min(1.0, round(best_score, 4)))

        if best_match_item and similarity_score >= SIMILARITY_THRESHOLD:
            return {
                "status": "success",
                "answer": best_match_item["answer"],
                "similarity_score": similarity_score,
                "matched_question": best_match_item["question"],
                "matched_id": best_match_item["id"],
                "category": best_match_item.get("category", "General")
            }
        else:
            return {
                "status": "no_match",
                "answer": "I couldn't find a relevant answer in the selected category.",
                "similarity_score": similarity_score,
                "matched_question": best_match_item["question"] if best_match_item else None
            }


# Singleton RAG engine instance
rag_engine: Optional[RAGEngine] = None


def get_rag_engine() -> RAGEngine:
    global rag_engine
    if rag_engine is None:
        rag_engine = RAGEngine()
    return rag_engine
