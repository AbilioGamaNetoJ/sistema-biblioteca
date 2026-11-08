-- Permite EPUB no bucket privado book-pdfs, além de PDF.
update storage.buckets
set
  public = false,
  file_size_limit = 52428800,
  allowed_mime_types = array['application/pdf', 'application/epub+zip']::text[]
where id = 'book-pdfs';
