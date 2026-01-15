"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRight } from "lucide-react";
import { Category } from "@/types/mcp";

function CategoryItemSkeleton() {
  return (
    <div className="flex flex-col items-center gap-3 p-6 rounded-xl">
      <Skeleton className="h-12 w-12 rounded-full" />
      <Skeleton className="h-4 w-20" />
      <Skeleton className="h-3 w-28" />
    </div>
  );
}

function HeaderSkeleton() {
  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <Skeleton className="h-6 w-48" />
      </div>
      <Skeleton className="h-4 w-16" />
    </div>
  );
}

export default function Categories() {
  // Use REST API to fetch categories
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch('/api/categories?limit=8', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        const result = await response.json();

        if (!response.ok || result.error) {
          throw new Error(result.error || 'Failed to fetch categories');
        }

        // Extract categories from edges
        const edges = result.data?.categories?.edges || [];
        const cats: Category[] = edges.map((edge: { node: Category }) => edge.node);
        setCategories(cats);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch categories';
        setError(errorMessage);
        console.error('Error fetching categories:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, []);

  // Handle error state - hide section
  if (error) {
    console.error("Failed to load categories:", error);
    return null;
  }

  // Show loading skeletons with header while loading
  if (loading && categories.length === 0) {
    return (
      <div className="w-full">
        <HeaderSkeleton />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <CategoryItemSkeleton />
          <CategoryItemSkeleton />
          <CategoryItemSkeleton />
          <CategoryItemSkeleton />
          <CategoryItemSkeleton />
          <CategoryItemSkeleton />
          <CategoryItemSkeleton />
          <CategoryItemSkeleton />
        </div>
      </div>
    );
  }

  // Hide section if no categories
  if (categories.length === 0) {
    return null;
  }

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl md:text-2xl font-bold">
            Browse by Category
          </h2>
        </div>
        <Link
          href="/mcp"
          className="hidden md:flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors group"
        >
          View All <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {categories.map((category) => (
          <Link key={category.id} href={`/mcp?category=${category.slug}`}>
            <div
              className="group flex flex-col items-center gap-3 p-6 rounded-xl hover:bg-accent/50 transition-all duration-300 cursor-pointer hover:shadow-lg hover:scale-105"
            >
              {/* Icon Container */}
              <div
                className="h-16 w-16 rounded-full flex items-center justify-center text-3xl transition-transform group-hover:scale-110"
                style={{
                  backgroundColor: category.color ? `${category.color}15` : 'hsl(var(--primary) / 0.1)',
                  color: category.color || 'hsl(var(--primary))',
                }}
              >
                <Image
                  src={`/categories/${category.icon}`}
                  alt={category.name}
                  width={48}
                  height={48}
                  className="object-contain"
                />
              </div>

              {/* Category Name */}
              <h3 className="font-semibold text-base text-center group-hover:text-primary transition-colors">
                {category.name}
              </h3>

              {/* Description */}
              {category.description && (
                <p className="text-xs text-muted-foreground text-center line-clamp-2">
                  {category.description}
                </p>
              )}
            </div>
          </Link>
        ))}
      </div>

      {/* Mobile View All Link */}
      <div className="md:hidden mt-6 text-center">
        <Link
          href="/mcp"
          className="inline-flex items-center gap-1 text-sm text-primary hover:text-primary/80 transition-colors"
        >
          Browse All Categories <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
