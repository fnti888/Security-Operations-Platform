import { LoginPage } from './LoginPage';

interface AuthPageProps {
  onSuccess?: () => void;
}

export function AuthPage({ onSuccess }: AuthPageProps) {
  return <LoginPage onSuccess={onSuccess} />;
}
