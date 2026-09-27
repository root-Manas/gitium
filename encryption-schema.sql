-- Local candidate only. Do not apply to production before release review.
CREATE TABLE IF NOT EXISTS e2ee_devices(user_id TEXT,device_id TEXT,keys_json TEXT NOT NULL,ed TEXT NOT NULL,curve TEXT NOT NULL,revoked INTEGER NOT NULL DEFAULT 0,PRIMARY KEY(user_id,device_id));
CREATE TABLE IF NOT EXISTS e2ee_otks(user_id TEXT,device_id TEXT,key_id TEXT,key_json TEXT NOT NULL,PRIMARY KEY(user_id,device_id,key_id));
CREATE TABLE IF NOT EXISTS e2ee_used_keys(user_id TEXT,device_id TEXT,key_id TEXT,PRIMARY KEY(user_id,device_id,key_id));
CREATE TRIGGER IF NOT EXISTS e2ee_key_consumed AFTER DELETE ON e2ee_otks BEGIN INSERT OR IGNORE INTO e2ee_used_keys VALUES(OLD.user_id,OLD.device_id,OLD.key_id); END;
CREATE TABLE IF NOT EXISTS e2ee_rooms(id TEXT PRIMARY KEY,scope TEXT NOT NULL,target TEXT NOT NULL,epoch INTEGER NOT NULL DEFAULT 1,UNIQUE(scope,target));
CREATE TABLE IF NOT EXISTS e2ee_mail(id TEXT PRIMARY KEY,user_id TEXT,device_id TEXT,sender_id TEXT,sender_device TEXT,txn TEXT,payload TEXT NOT NULL,created_at INTEGER NOT NULL,UNIQUE(sender_id,sender_device,txn,user_id,device_id));
CREATE INDEX IF NOT EXISTS e2ee_mail_recipient ON e2ee_mail(user_id,device_id,created_at);
CREATE TABLE IF NOT EXISTS e2ee_delivery_receipts(sender_id TEXT,sender_device TEXT,txn TEXT,user_id TEXT,device_id TEXT,PRIMARY KEY(sender_id,sender_device,txn,user_id,device_id));
CREATE TRIGGER IF NOT EXISTS e2ee_delivery_receipt AFTER INSERT ON e2ee_mail BEGIN INSERT OR IGNORE INTO e2ee_delivery_receipts VALUES(NEW.sender_id,NEW.sender_device,NEW.txn,NEW.user_id,NEW.device_id); END;
CREATE TABLE IF NOT EXISTS e2ee_events(id TEXT PRIMARY KEY,room_id TEXT,epoch INTEGER,sender_id TEXT,device_id TEXT,txn TEXT,payload TEXT NOT NULL,created_at INTEGER NOT NULL,UNIQUE(sender_id,device_id,txn));
CREATE INDEX IF NOT EXISTS e2ee_events_room ON e2ee_events(room_id,created_at);
CREATE TABLE IF NOT EXISTS e2ee_nonces(user_id TEXT,device_id TEXT,nonce TEXT,created_at INTEGER,PRIMARY KEY(user_id,device_id,nonce));
CREATE INDEX IF NOT EXISTS e2ee_nonce_age ON e2ee_nonces(created_at);
CREATE VIEW IF NOT EXISTS e2ee_members AS
SELECT e.id AS room_id,m.user_id FROM e2ee_rooms e JOIN room_members m ON e.scope='room' AND e.target=m.room_id
UNION SELECT e.id,d.requester_id FROM e2ee_rooms e JOIN dm_requests d ON e.scope='dm_v2' AND e.target=d.pair JOIN dm_allowed a ON a.pair=d.pair
UNION SELECT e.id,d.recipient_id FROM e2ee_rooms e JOIN dm_requests d ON e.scope='dm_v2' AND e.target=d.pair JOIN dm_allowed a ON a.pair=d.pair;
CREATE TRIGGER IF NOT EXISTS e2ee_member_added AFTER INSERT ON room_members BEGIN UPDATE e2ee_rooms SET epoch=epoch+1 WHERE scope='room' AND target=NEW.room_id; END;
CREATE TRIGGER IF NOT EXISTS e2ee_member_removed AFTER DELETE ON room_members BEGIN UPDATE e2ee_rooms SET epoch=epoch+1 WHERE scope='room' AND target=OLD.room_id; END;
CREATE TRIGGER IF NOT EXISTS e2ee_dm_changed AFTER UPDATE ON dm_requests BEGIN UPDATE e2ee_rooms SET epoch=epoch+1 WHERE scope='dm_v2' AND target=NEW.pair; END;
CREATE TRIGGER IF NOT EXISTS e2ee_blocked AFTER INSERT ON chat_blocks BEGIN UPDATE e2ee_rooms SET epoch=epoch+1 WHERE scope='dm_v2' AND target IN (NEW.blocker_id||':'||NEW.blocked_id,NEW.blocked_id||':'||NEW.blocker_id); END;
CREATE TRIGGER IF NOT EXISTS e2ee_unblocked AFTER DELETE ON chat_blocks BEGIN UPDATE e2ee_rooms SET epoch=epoch+1 WHERE scope='dm_v2' AND target IN (OLD.blocker_id||':'||OLD.blocked_id,OLD.blocked_id||':'||OLD.blocker_id); END;
CREATE TRIGGER IF NOT EXISTS e2ee_device_added AFTER INSERT ON e2ee_devices BEGIN UPDATE e2ee_rooms SET epoch=epoch+1 WHERE id IN (SELECT room_id FROM e2ee_members WHERE user_id=NEW.user_id); END;
CREATE TRIGGER IF NOT EXISTS e2ee_device_revoked AFTER UPDATE OF revoked ON e2ee_devices BEGIN UPDATE e2ee_rooms SET epoch=epoch+1 WHERE id IN (SELECT room_id FROM e2ee_members WHERE user_id=NEW.user_id); END;
