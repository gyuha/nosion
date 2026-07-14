-- Custom SQL migration file, put your code below! --
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS page_title_trgm_idx ON "page" USING gin (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS document_search_text_trgm_idx ON "document" USING gin (search_text gin_trgm_ops);
