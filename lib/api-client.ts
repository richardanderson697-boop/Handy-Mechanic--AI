export class ApiClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor(baseUrl: string = '/api') {
    this.baseUrl = baseUrl;
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('token');
    }
  }

  setToken(token: string) {
    this.token = token;
    if (typeof window !== 'undefined') {
      localStorage.setItem('token', token);
    }
  }

  clearToken() {
    this.token = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Request failed' }));
      throw new Error(error.message || 'Request failed');
    }

    return response.json();
  }

  // Auth endpoints
  async register(email: string, password: string, name: string) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    });
  }

  async login(email: string, password: string) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async getUser() {
    return this.request('/auth/me');
  }

  // Diagnostic endpoints
  async createDiagnosis(data: FormData) {
    const headers: HeadersInit = {};
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${this.baseUrl}/diagnose`, {
      method: 'POST',
      headers,
      body: data,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Request failed' }));
      throw new Error(error.message || 'Request failed');
    }

    return response.json();
  }

  // Vehicle endpoints
  async decodeVin(vin: string) {
    return this.request(`/vehicle/decode-vin?vin=${encodeURIComponent(vin)}`);
  }

  async getVehicleHistory(vin: string) {
    return this.request(`/vehicle/history?vin=${encodeURIComponent(vin)}`);
  }

  // Insurance endpoints
  async getInsuranceQuotes(data: any) {
    return this.request('/insurance/quotes', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Payment endpoints
  async createCheckoutSession(tier: 'single' | 'pack') {
    return this.request('/payment/create-checkout', {
      method: 'POST',
      body: JSON.stringify({ tier }),
    });
  }

  // Pricing endpoints
  async getNegotiatedPricing(data: any) {
    return this.request('/pricing/negotiate', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
}

export const apiClient = new ApiClient();
