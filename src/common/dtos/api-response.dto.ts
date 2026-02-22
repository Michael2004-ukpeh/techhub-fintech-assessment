export class ApiResponse<T = any> {
  message: string;
  data: T;
}

export class PaginatedResponse<T = any> {
  message: string;
  data: {
    [key: string]: any;
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
