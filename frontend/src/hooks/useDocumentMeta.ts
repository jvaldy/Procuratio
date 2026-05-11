import { useEffect } from 'react';

type MetaOptions = {
  title: string;
  description?: string;
};

export function useDocumentMeta({ title, description }: MetaOptions) {
  useEffect(() => {
    document.title = title;

    if (!description) {
      return;
    }

    let meta = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'description';
      document.head.appendChild(meta);
    }
    meta.content = description;
  }, [description, title]);
}
