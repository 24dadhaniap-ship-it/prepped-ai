const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('token');
  const geminiKey = localStorage.getItem('gemini_api_key');
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(geminiKey ? { 'X-Gemini-Key': geminiKey } : {}),
    ...options.headers,
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000); // 20s timeout

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
      signal: options.signal || controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      let errorMessage = `API error: ${response.status}`;
      try {
        const errorData = await response.json();
        if (typeof errorData === 'string') {
          errorMessage = errorData;
        } else if (errorData && typeof errorData === 'object') {
          if (errorData.message) {
            errorMessage = errorData.message;
          } else {
            const values = Object.values(errorData).filter(v => typeof v === 'string');
            if (values.length > 0) {
              errorMessage = values.join('. ');
            }
          }
        }
      } catch {
        // Ignore fallback
      }
      throw new Error(errorMessage);
    }

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return response.json() as Promise<T>;
    }
    return {} as T;
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error('Server response timed out. Please check your connection and try again.');
    }
    throw err;
  }
}

export const api = {
  auth: {
    ping: () =>
      request<any>('/auth/health', {
        method: 'GET',
      }),
    login: (credentials: any) =>
      request<any>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
      }),
    signup: (user: any) =>
      request<any>('/auth/signup', {
        method: 'POST',
        body: JSON.stringify(user),
      }),
    google: (credential: string) =>
      request<any>('/auth/google', {
        method: 'POST',
        body: JSON.stringify({ credential }),
      }),
  },
  interviews: {
    create: (data: { type: string; role: string; difficulty: string; questionsCount?: number }) =>
      request<any>('/interviews', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    list: () => request<any[]>('/interviews'),
    get: (id: string) => request<any>(`/interviews/${id}`),
    submitAnswer: (sessionId: string, questionId: string, answer: string) =>
      request<any>(`/interviews/${sessionId}/questions/${questionId}/answer`, {
        method: 'POST',
        body: JSON.stringify({ answer }),
      }),
    complete: (id: string) =>
      request<any>(`/interviews/${id}/complete`, {
        method: 'POST',
      }),
    delete: (id: string) =>
      request<any>(`/interviews/${id}`, {
        method: 'DELETE',
      }),
  },
  dashboard: {
    getStats: () => request<any>('/dashboard/stats'),
  },
};
