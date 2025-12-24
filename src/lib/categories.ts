import { DollarSign, Lightbulb, Cpu, Heart, Briefcase, GraduationCap, Palette, Gamepad2, MoreHorizontal, LayoutGrid } from "lucide-react";

// Category definitions with icons
export const CATEGORY_CONFIG: { name: string; icon: React.ElementType }[] = [
  { name: "All", icon: LayoutGrid },
  { name: "Finance", icon: DollarSign },
  { name: "Personal Development", icon: Lightbulb },
  { name: "Technology", icon: Cpu },
  { name: "Health", icon: Heart },
  { name: "Business", icon: Briefcase },
  { name: "Learning", icon: GraduationCap },
  { name: "Creative", icon: Palette },
  { name: "Entertainment", icon: Gamepad2 },
  { name: "Other", icon: MoreHorizontal },
];

export const CATEGORIES = CATEGORY_CONFIG.map(c => c.name);

// Helper function to get category icon
export const getCategoryIcon = (categoryName: string): React.ElementType => {
  const config = CATEGORY_CONFIG.find(c => c.name === categoryName);
  return config?.icon || MoreHorizontal;
};

// Helper function to check if a tag is a category
export const isCategory = (tag: string): boolean => {
  return CATEGORIES.filter(c => c !== "All").includes(tag);
};

// Helper function to get category tags from a tags array
export const getCategoryTags = (tags: string[]): string[] => {
  return tags.filter(tag => isCategory(tag));
};

// Helper function to get non-category tags from a tags array
export const getNonCategoryTags = (tags: string[]): string[] => {
  return tags.filter(tag => !isCategory(tag) && !tag.startsWith('collection:') && !tag.startsWith('pinned'));
};
