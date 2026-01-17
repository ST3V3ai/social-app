import { redirect } from 'next/navigation';

interface JoinTokenPageProps {
  params: Promise<{ token: string }>;
}

// Redirect /join/[token] to /auth/verify?token=[token]
// The /auth/verify page handles the actual magic link verification
export default async function JoinTokenPage({ params }: JoinTokenPageProps) {
  const { token } = await params;
  redirect(`/auth/verify?token=${token}`);
}
