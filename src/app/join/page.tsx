import { redirect } from 'next/navigation';

export default function JoinPage() {
  // This page is just a placeholder for /join/[token]
  // Redirect to home if accessed directly
  redirect('/');
  return null;
}
