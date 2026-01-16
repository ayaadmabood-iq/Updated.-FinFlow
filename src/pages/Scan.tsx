import { DocumentScanner } from '@/components/mobile/DocumentScanner';
import { useNavigate } from 'react-router-dom';

export default function Scan() {
  const navigate = useNavigate();

  const handleComplete = (documentId: string) => {
    // Navigate to the document detail or show success
    navigate('/projects');
  };

  return (
    <div className="h-[calc(100vh-4rem)] md:h-screen">
      <DocumentScanner onComplete={handleComplete} />
    </div>
  );
}
