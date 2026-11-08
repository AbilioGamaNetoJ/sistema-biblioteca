-- Aumenta o limite do bucket privado book-pdfs para 200 MB.
update storage.buckets
set
  public = false,
  file_size_limit = 209715200,
  allowed_mime_types = array['application/pdf', 'application/epub+zip']::text[]
where id = 'book-pdfs';
