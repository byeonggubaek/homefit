import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const lang = navigator.language || 'ko-KR';
let currency = 'KRW';

const currencyFormatter = new Intl.NumberFormat(lang, {
  currency: currency,
  style: 'currency',
  currencyDisplay: 'narrowSymbol'  // $만 표시
});
const numberFormatter = new Intl.NumberFormat(lang, {
  style: 'decimal'
});
let dateFormatter = new Intl.DateTimeFormat(lang);
switch (currency) {
  case 'USD':
    dateFormatter = new Intl.DateTimeFormat('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
    break;
  default:
    dateFormatter = new Intl.DateTimeFormat('sv');
    break;
}
const timeFormatter = new Intl.DateTimeFormat(lang, {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit'
});

export const formatCurrency = (value: number) => 
  currencyFormatter.format(value)

export const formatNumber = (value: number) => 
  numberFormatter.format(value) 

export const formatPrice = (value: number) => 
  currencyFormatter.format(value)

export const formatDate = (value: Date | number | string) => {
  const dateValue = new Date(value);
  return dateFormatter.format(dateValue);
};

export const formatTime = (value: Date | number | string) => {
  const dateValue = new Date(value);
  return timeFormatter.format(dateValue);
};  