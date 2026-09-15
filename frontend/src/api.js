const API_BASE_URL = '/api';

export async function fetchHealth() {
  const res = await fetch(`${API_BASE_URL}/health`);
  if (!res.ok) throw new Error('Backend health check failed');
  return res.json();
}

export async function fetchCategories() {
  const res = await fetch(`${API_BASE_URL}/admin/categories`);
  if (!res.ok) throw new Error('Failed to fetch categories');
  return res.json();
}

export async function createCategory(name) {
  const res = await fetch(`${API_BASE_URL}/admin/categories`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to create category');
  }
  return res.json();
}

export async function deleteCategory(name) {
  const res = await fetch(`${API_BASE_URL}/admin/categories/${encodeURIComponent(name)}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete category');
  return res.json();
}

export async function fetchKnowledgeBase() {
  const res = await fetch(`${API_BASE_URL}/admin/qa`);
  if (!res.ok) throw new Error('Failed to fetch knowledge base');
  return res.json();
}

export async function addKnowledgeItem(question, answer, category = 'General') {
  const res = await fetch(`${API_BASE_URL}/admin/qa`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ question, answer, category }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to create knowledge item');
  }
  return res.json();
}

export async function deleteKnowledgeItem(id) {
  const res = await fetch(`${API_BASE_URL}/admin/qa/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete knowledge item');
  return res.json();
}

export async function importExcelKnowledge(file, category) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('category', category);

  const res = await fetch(`${API_BASE_URL}/admin/import-excel`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to import Excel file');
  }
  return res.json();
}

export async function askQuestion(question, category) {
  const res = await fetch(`${API_BASE_URL}/user/ask`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ category, question }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to process question');
  }
  return res.json();
}

