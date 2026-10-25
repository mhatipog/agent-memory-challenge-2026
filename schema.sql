CREATE TABLE IF NOT EXISTS memories (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 user_id TEXT NOT NULL,
 session_id TEXT NOT NULL,
 request_id TEXT NOT NULL,
 part INTEGER NOT NULL,
 content TEXT NOT NULL,
 signals TEXT NOT NULL,
 created_at TEXT NOT NULL,
 ingested_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE(request_id,part,user_id)
);
CREATE INDEX IF NOT EXISTS idx_memories_user_id ON memories(user_id,id);
CREATE VIRTUAL TABLE IF NOT EXISTS memory_fts USING fts5(content, signals, content='memories', content_rowid='id', tokenize='unicode61');
CREATE TRIGGER IF NOT EXISTS memory_insert AFTER INSERT ON memories BEGIN
 INSERT INTO memory_fts(rowid,content,signals) VALUES(new.id,new.content,new.signals);
END;
CREATE TRIGGER IF NOT EXISTS memory_delete AFTER DELETE ON memories BEGIN
 INSERT INTO memory_fts(memory_fts,rowid,content,signals) VALUES('delete',old.id,old.content,old.signals);
END;
CREATE INDEX IF NOT EXISTS idx_memory_neighbors ON memories(user_id,request_id,part);
