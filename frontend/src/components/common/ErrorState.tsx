import { Alert } from '@/components/ui/alert'

export function ErrorState({ message }: { message: string }) {
  return <Alert variant="error">{message}</Alert>
}
