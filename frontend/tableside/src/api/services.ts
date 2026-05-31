import { apiRequest, buildQueryString } from "./client";
import type {
  AuthenticatedUser,
  MenuResponse,
  OrderDetail,
  TicketDeliveryResult,
} from "../types";

export interface LoginInput {
  username: string;
  password: string;
}

export interface CreateOrderItemInput {
  menuItemId: number;
  quantity: number;
  selections: Array<{
    optionGroupId: number;
    optionId: number;
  }>;
}

export interface CreateOrderInput {
  sourceApp: "Tableside";
  tableNumber: number;
  items: CreateOrderItemInput[];
}

export interface OrderListFilters {
  status?: "Sent" | "Printed";
  sourceApp?: "POS" | "Tableside";
  tableNumber?: number;
  createdByUserId?: number;
  limit?: number;
}

export const authApi = {
  login(input: LoginInput) {
    return apiRequest<{ user: AuthenticatedUser }>("/api/auth/login", {
      method: "POST",
      body: input,
    });
  },
  me() {
    return apiRequest<{ user: AuthenticatedUser }>("/api/auth/me");
  },
  logout() {
    return apiRequest<null>("/api/auth/logout", {
      method: "POST",
    });
  },
};

export const menuApi = {
  getMenu() {
    return apiRequest<MenuResponse>("/api/menu");
  },
};

export const ordersApi = {
  list(filters: OrderListFilters) {
    return apiRequest<{ orders: OrderDetail[] }>(`/api/orders${buildQueryString(filters)}`);
  },
  get(orderId: number) {
    return apiRequest<{ order: OrderDetail }>(`/api/orders/${orderId}`);
  },
  create(input: CreateOrderInput) {
    return apiRequest<{ order: OrderDetail; deliveryResults: TicketDeliveryResult[] }>("/api/orders", {
      method: "POST",
      body: input,
    });
  },
};