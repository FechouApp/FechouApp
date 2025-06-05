import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export const apiRequest = async (method: string, url: string, data?: any) => {
  const requestOptions: RequestInit = {
    method: method.toUpperCase(),
    headers: {
      'Content-Type': 'application/json',
    },
  };

  if (data && (method.toUpperCase() === 'POST' || method.toUpperCase() === 'PUT' || method.toUpperCase() === 'PATCH')) {
    requestOptions.body = JSON.stringify(data);
  }

  const response = await fetch(url, requestOptions);

  if (!response.ok) {
    const errorData = await response.text();
    let errorMessage;
    try {
      const parsed = JSON.parse(errorData);
      errorMessage = parsed.message || parsed.error || `HTTP error! status: ${response.status}`;
    } catch {
      errorMessage = errorData || `HTTP error! status: ${response.status}`;
    }
    throw new Error(errorMessage);
  }

  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return response.json();
  }

  return response.text();
};

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey[0] as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});