import { CloudUpload } from 'lucide-react';
import { useRef, useState, type DragEvent, type ReactElement, type ReactNode } from 'react';

import { cn } from '@/lib/utils';

type FileDropzoneProperties = {
  onFiles: (files: File[]) => void;
  className?: string;
  children: ReactNode;
};

const carriesFiles = (transfer: DataTransfer): boolean =>
  Array.from(transfer.types).includes('Files');

const FileDropzone = ({ onFiles, className, children }: FileDropzoneProperties): ReactElement => {
  const [isDragging, setIsDragging] = useState(false);

  // Entering a child fires dragenter again, so nesting is counted rather than guessed
  const depthRef = useRef(0);

  const stopDragging = (): void => {
    depthRef.current = 0;
    setIsDragging(false);
  };

  const handleDragEnter = (event: DragEvent<HTMLDivElement>): void => {
    if (!carriesFiles(event.dataTransfer)) {
      return;
    }

    event.preventDefault();
    depthRef.current += 1;
    setIsDragging(true);
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>): void => {
    if (!carriesFiles(event.dataTransfer)) {
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  };

  const handleDragLeave = (): void => {
    depthRef.current -= 1;

    if (depthRef.current <= 0) {
      stopDragging();
    }
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>): void => {
    if (!carriesFiles(event.dataTransfer)) {
      return;
    }

    event.preventDefault();
    stopDragging();

    const files = Array.from(event.dataTransfer.files);

    if (files.length > 0) {
      onFiles(files);
    }
  };

  return (
    <div
      className={cn('relative', className)}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {children}

      {isDragging ? (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-primary bg-primary/10 backdrop-blur-[1px]"
        >
          <CloudUpload className="size-7 text-primary" />
          <p className="text-sm font-medium text-primary">Drop PDF files to upload</p>
        </div>
      ) : null}
    </div>
  );
};

export { FileDropzone };
