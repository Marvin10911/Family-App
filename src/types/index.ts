import { Timestamp } from 'firebase/firestore';

export type UserRole = 'owner' | 'admin' | 'adult' | 'child';

export interface UserPermissions {
  canManageUsers: boolean;
  canManageShopping: boolean;
  canManageTasks: boolean;
  canManageMeals: boolean;
  canManageCalendar: boolean;
  canManageWaste: boolean;
  canViewAdmin: boolean;
}

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  avatarColor: string; // hex
  familyId: string | null;
  role: UserRole;
  permissions: UserPermissions;
  mood?: string;
  pushToken?: string;
  points: number;
  createdAt: Timestamp | Date;
  lastSeen: Timestamp | Date;
}

export interface Family {
  id: string;
  name: string;
  inviteCode: string;
  ownerId: string;
  members: string[];
  settings: {
    wasteLocation?: {
      city: string;
      zipCode: string;
      state: string;
      country: string;
    };
    weatherLocation?: {
      lat: number;
      lon: number;
      label?: string;
    };
    theme: 'auto' | 'light' | 'dark';
    language: 'de' | 'en';
  };
  createdAt: Timestamp | Date;
}

export type ShoppingCategory =
  | 'Obst & Gemüse'
  | 'Milchprodukte'
  | 'Fleisch & Fisch'
  | 'Backwaren'
  | 'Tiefkühl'
  | 'Getränke'
  | 'Süßwaren'
  | 'Haushalt'
  | 'Drogerie'
  | 'Sonstiges';

export interface ShoppingItem {
  id: string;
  familyId: string;
  name: string;
  quantity: number;
  unit: string;
  category: ShoppingCategory;
  emoji?: string;
  checked: boolean;
  addedBy: string;
  aiSuggested: boolean;
  notes?: string;
  createdAt: Timestamp | Date;
}

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Task {
  id: string;
  familyId: string;
  title: string;
  description?: string;
  assignedTo: string[];
  priority: TaskPriority;
  dueDate?: Timestamp | Date | null;
  completed: boolean;
  completedBy?: string;
  completedAt?: Timestamp | Date;
  category: string;
  recurring?: 'daily' | 'weekly' | 'monthly';
  pointsReward: number;
  aiGenerated: boolean;
  createdBy: string;
  createdAt: Timestamp | Date;
}

export interface MealPlan {
  id: string;
  familyId: string;
  date: string; // YYYY-MM-DD
  breakfast?: string;
  lunch?: string;
  dinner?: string;
  snacks?: string;
  notes?: string;
  aiGenerated: boolean;
  createdAt: Timestamp | Date;
}

export interface CalendarEvent {
  id: string;
  familyId: string;
  title: string;
  description?: string;
  startDate: Timestamp | Date;
  endDate: Timestamp | Date;
  allDay: boolean;
  members: string[];
  color: string;
  reminderMinutes?: number;
  location?: string;
  createdBy: string;
  createdAt: Timestamp | Date;
}

export type WasteType =
  | 'Restmüll'
  | 'Biotonne'
  | 'Gelbe Tonne'
  | 'Altpapier'
  | 'Sperrmüll'
  | 'Glas';

export interface WasteEntry {
  id: string;
  familyId: string;
  date: string; // YYYY-MM-DD
  type: WasteType;
  color: string;
  notified: boolean;
  note?: string;
}

export interface WeatherData {
  temp: number;
  tempMin: number;
  tempMax: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  description: string;
  icon: string;
  main: string;
  precipitation?: number;
  location?: string;
}

export const DEFAULT_PERMISSIONS: Record<UserRole, UserPermissions> = {
  owner: {
    canManageUsers: true,
    canManageShopping: true,
    canManageTasks: true,
    canManageMeals: true,
    canManageCalendar: true,
    canManageWaste: true,
    canViewAdmin: true,
  },
  admin: {
    canManageUsers: true,
    canManageShopping: true,
    canManageTasks: true,
    canManageMeals: true,
    canManageCalendar: true,
    canManageWaste: true,
    canViewAdmin: true,
  },
  adult: {
    canManageUsers: false,
    canManageShopping: true,
    canManageTasks: true,
    canManageMeals: true,
    canManageCalendar: true,
    canManageWaste: false,
    canViewAdmin: false,
  },
  child: {
    canManageUsers: false,
    canManageShopping: true,
    canManageTasks: true,
    canManageMeals: false,
    canManageCalendar: false,
    canManageWaste: false,
    canViewAdmin: false,
  },
};

export type RecipeCategory =
  | 'Frühstück'
  | 'Mittagessen'
  | 'Abendessen'
  | 'Dessert'
  | 'Snack'
  | 'Sonstiges';

export interface RecipeIngredient {
  name: string;
  amount: string;
  emoji?: string;
}

export interface Recipe {
  id: string;
  familyId: string;
  name: string;
  emoji: string;
  category: RecipeCategory;
  duration: number; // minutes
  servings: number;
  ingredients: RecipeIngredient[];
  steps: string[];
  notes?: string;
  favorite: boolean;
  aiGenerated: boolean;
  createdBy: string;
  createdAt: Timestamp | Date;
}

export interface Birthday {
  id: string;
  familyId: string;
  name: string;
  day: number;    // 1–31
  month: number;  // 1–12
  year?: number;  // Geburtsjahr für Altersberechnung (optional)
  emoji?: string;
  note?: string;
  createdBy: string;
  createdAt: Timestamp | Date;
}

export const WASTE_COLORS: Record<WasteType, string> = {
  Restmüll: '#6b7280',
  Biotonne: '#65a30d',
  'Gelbe Tonne': '#eab308',
  Altpapier: '#3b82f6',
  Sperrmüll: '#a16207',
  Glas: '#10b981',
};
