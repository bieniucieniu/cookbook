import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function resolve<T, A extends unknown[]>(value: T | ((...args: A) => T), ...args: A) {
  return typeof value === "function" ? (value as (...args: A) => T)(...args) : value
}
