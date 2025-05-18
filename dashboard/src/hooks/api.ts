/**
 * API utilities for fetching data from endpoints
 */

// Default fetch options
const defaultOptions: RequestInit = {
  headers: {
    'Content-Type': 'application/json'
  }
};

/**
 * Wrapper for fetch API with error handling
 * @param url - API endpoint URL
 * @param options - Fetch options
 * @returns Response data
 */
export async function fetchApi<T>(url: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(url, {
    ...defaultOptions,
    ...options
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<T>;
}

/**
 * GET request helper
 * @param url - API endpoint URL
 * @returns Response data
 */
export const get = <T>(url: string): Promise<T> => {
  return fetchApi<T>(url);
};

/**
 * POST request helper
 * @param url - API endpoint URL
 * @param data - Data to be sent
 * @returns Response data
 */
export const post = <T, D>(url: string, data: D): Promise<T> => {
  return fetchApi<T>(url, {
    method: 'POST',
    body: JSON.stringify(data)
  });
};

/**
 * PUT request helper
 * @param url - API endpoint URL
 * @param data - Data to be sent
 * @returns Response data
 */
export const put = <T, D>(url: string, data: D): Promise<T> => {
  return fetchApi<T>(url, {
    method: 'PUT',
    body: JSON.stringify(data)
  });
};

/**
 * DELETE request helper
 * @param url - API endpoint URL
 * @returns Response data
 */
export const del = <T>(url: string): Promise<T> => {
  return fetchApi<T>(url, {
    method: 'DELETE'
  });
}; 