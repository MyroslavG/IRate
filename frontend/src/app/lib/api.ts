const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

class ApiClient {
  private token: string | null = null;

  constructor() {
    if (typeof window !== "undefined") {
      this.token = localStorage.getItem("token");
    }
  }

  setToken(token: string | null) {
    this.token = token;
    if (typeof window !== "undefined") {
      if (token) {
        localStorage.setItem("token", token);
      } else {
        localStorage.removeItem("token");
      }
    }
  }

  getToken() {
    return this.token;
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers["Authorization"] = `Bearer ${this.token}`;
    }

    const res = await fetch(`${API_URL}${path}`, {
      ...options,
      headers,
    });

    if (res.status === 204) return undefined as T;

    const data = await res.json();

    if (!res.ok) {
      throw new ApiError(data.detail || "Something went wrong", res.status);
    }

    return data;
  }

  // Auth
  async register(username: string, email: string, password: string) {
    const data = await this.request<TokenResponse>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ username, email, password }),
    });
    this.setToken(data.access_token);
    return data;
  }

  async login(username: string, password: string) {
    const data = await this.request<TokenResponse>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
    this.setToken(data.access_token);
    return data;
  }

  async getMe() {
    return this.request<User>("/api/auth/me");
  }

  async googleLogin(credential: string) {
    const data = await this.request<TokenResponse>("/api/auth/google", {
      method: "POST",
      body: JSON.stringify({ credential }),
    });
    this.setToken(data.access_token);
    return data;
  }

  logout() {
    this.setToken(null);
  }

  // Lists
  async getPublicLists(params?: { category?: string; search?: string }) {
    const query = new URLSearchParams();
    if (params?.category) query.set("category", params.category);
    if (params?.search) query.set("search", params.search);
    const qs = query.toString();
    return this.request<ListOut[]>(`/api/lists${qs ? `?${qs}` : ""}`);
  }

  async getMyLists() {
    return this.request<ListOut[]>("/api/lists/mine");
  }

  async getList(username: string, slug: string) {
    return this.request<ListDetail>(`/api/lists/${username}/${slug}`);
  }

  async createList(data: { title: string; description?: string; category?: string; is_public?: boolean }) {
    return this.request<ListDetail>("/api/lists", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateList(listId: number, data: { title?: string; description?: string; category?: string; is_public?: boolean }) {
    return this.request<ListOut>(`/api/lists/${listId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  async deleteList(listId: number) {
    return this.request<void>(`/api/lists/${listId}`, { method: "DELETE" });
  }

  async copyList(listId: number) {
    return this.request<ListDetail>(`/api/lists/${listId}/copy`, { method: "POST" });
  }

  // Items
  async addItem(listId: number, data: { name: string; score?: number; comment?: string }) {
    return this.request<ListItemOut>(`/api/lists/${listId}/items`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateItem(listId: number, itemId: number, data: { name?: string; score?: number; comment?: string }) {
    return this.request<ListItemOut>(`/api/lists/${listId}/items/${itemId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  async deleteItem(listId: number, itemId: number) {
    return this.request<void>(`/api/lists/${listId}/items/${itemId}`, { method: "DELETE" });
  }

  // Comments
  async getComments(listId: number) {
    return this.request<CommentOut[]>(`/api/lists/${listId}/comments`);
  }

  async addComment(listId: number, text: string, itemId?: number) {
    return this.request<CommentOut>(`/api/lists/${listId}/comments`, {
      method: "POST",
      body: JSON.stringify({ text, item_id: itemId }),
    });
  }

  async updateComment(commentId: number, text: string) {
    return this.request<CommentOut>(`/api/comments/${commentId}`, {
      method: "PATCH",
      body: JSON.stringify({ text }),
    });
  }

  async deleteComment(commentId: number) {
    return this.request<void>(`/api/comments/${commentId}`, { method: "DELETE" });
  }

  // Likes
  async toggleLike(data: { list_id?: number; item_id?: number; emoji?: string }) {
    return this.request<LikeOut>("/api/likes", {
      method: "POST",
      body: JSON.stringify({ ...data, emoji: data.emoji || "heart" }),
    });
  }

  async getListLikes(listId: number) {
    return this.request<LikeSummary[]>(`/api/likes/list/${listId}`);
  }

  async getItemLikes(listId: number) {
    return this.request<Record<string, LikeSummary[]>>(`/api/likes/items/${listId}`);
  }

  // Users
  async getUserProfile(username: string) {
    return this.request<User>(`/api/users/${username}`);
  }

  async getUserLists(username: string) {
    return this.request<ListOut[]>(`/api/users/${username}/lists`);
  }

  // Follow
  async followUser(username: string) {
    return this.request<FollowOut>(`/api/follow/${username}`, { method: "POST" });
  }

  async unfollowUser(username: string) {
    return this.request<void>(`/api/follow/${username}`, { method: "DELETE" });
  }

  async getFollowStats(username: string) {
    return this.request<FollowStats>(`/api/follow/${username}/stats`);
  }

  async getFollowers(username: string) {
    return this.request<User[]>(`/api/follow/${username}/followers`);
  }

  async getFollowing(username: string) {
    return this.request<User[]>(`/api/follow/${username}/following`);
  }

  // Notifications
  async getNotifications() {
    return this.request<NotificationOut[]>("/api/notifications");
  }

  async getUnreadCount() {
    return this.request<{ count: number }>("/api/notifications/unread-count");
  }

  async markNotificationsRead() {
    return this.request<void>("/api/notifications/mark-read", { method: "POST" });
  }

  // Categories
  async getCategories() {
    return this.request<string[]>("/api/categories");
  }
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

// Types
export interface User {
  id: number;
  username: string;
  display_name: string | null;
  bio: string | null;
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface ListOut {
  id: number;
  slug: string;
  title: string;
  description: string | null;
  category: string | null;
  is_public: boolean;
  item_count: number;
  like_count: number;
  owner: User;
  created_at: string;
  updated_at: string;
}

export interface ListItemOut {
  id: number;
  name: string;
  score: number;
  comment: string | null;
  position: number;
  created_at: string;
}

export interface ListDetail extends ListOut {
  items: ListItemOut[];
}

export interface CommentOut {
  id: number;
  text: string;
  item_id: number | null;
  author: User;
  created_at: string;
}

export interface LikeOut {
  id: number;
  user_id: number;
  list_id: number | null;
  item_id: number | null;
  emoji: string;
  created_at: string;
}

export interface LikeSummary {
  emoji: string;
  count: number;
  user_liked: boolean;
}

export interface FollowOut {
  id: number;
  follower_id: number;
  following_id: number;
  created_at: string;
}

export interface FollowStats {
  followers_count: number;
  following_count: number;
  is_following: boolean;
}

export interface NotificationOut {
  id: number;
  type: string;
  actor: User;
  list_id: number | null;
  list_title: string | null;
  read: boolean;
  created_at: string;
}

// Singleton
export const api = new ApiClient();
