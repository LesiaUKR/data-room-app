import { Upload } from 'lucide-react';
import { useRef, type ChangeEvent, type ReactElement } from 'react';

import { Button } from '@/components/ui/button';

type UploadButtonProperties = {
  onFiles: (files: File[]) => void;
};

const UploadButton = ({ onFiles }: UploadButtonProperties): ReactElement => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (event: ChangeEvent<HTMLInputElement>): void => {
    const files = Array.from(event.target.files ?? []);

    if (files.length > 0) {
      onFiles(files);
    }

    // Cleared so picking the same file twice fires change again
    event.target.value = '';
  };

  return (
    <>
      <Button type="button" variant="outline" size="lg" onClick={() => inputRef.current?.click()}>
        <Upload aria-hidden="true" />
        Upload files
      </Button>

      <input
        ref={inputRef}
        type="file"
        multiple
        accept="application/pdf,.pdf"
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={handleChange}
      />
    </>
  );
};

export { UploadButton };
