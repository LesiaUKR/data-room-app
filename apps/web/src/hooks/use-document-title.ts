import { useEffect, useRef } from 'react';

const useDocumentTitle = (title: string): void => {
  const originalTitle = useRef(document.title);

  useEffect(() => {
    document.title = title;

    return () => {
      document.title = originalTitle.current;
    };
  }, [title]);
};

export { useDocumentTitle };
