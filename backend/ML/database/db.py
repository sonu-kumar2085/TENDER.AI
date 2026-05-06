import sqlite3
import json
import hashlib
import os
from datetime import datetime
from typing import Dict, Any, List

DB_PATH = "tender_ai.db"

def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Audit Trail Table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS audit_trail (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tender_id TEXT,
            bidder_id TEXT,
            event_timestamp TEXT,
            officer_id TEXT,
            input_hash TEXT,
            processing_hash TEXT,
            decision_json_hash TEXT,
            decision_data TEXT,
            override_type TEXT,
            justification TEXT,
            locked BOOLEAN
        )
    ''')
    
    # Simple persistence for hackathon state
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS tenders (
            tender_id TEXT PRIMARY KEY,
            conditions TEXT
        )
    ''')
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS bidders (
            bidder_id TEXT PRIMARY KEY,
            tender_id TEXT,
            claims TEXT,
            decision_snapshot TEXT
        )
    ''')
    
    conn.commit()
    conn.close()

def save_tender(tender_id: str, conditions: List[Dict[str, Any]]):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute('INSERT OR REPLACE INTO tenders (tender_id, conditions) VALUES (?, ?)', 
                   (tender_id, json.dumps(conditions)))
    conn.commit()
    conn.close()

def get_tender(tender_id: str) -> List[Dict[str, Any]]:
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute('SELECT conditions FROM tenders WHERE tender_id = ?', (tender_id,))
    row = cursor.fetchone()
    conn.close()
    return json.loads(row[0]) if row else []

def save_bidder(bidder_id: str, tender_id: str, claims: Dict[str, Any], decision_snapshot: Dict[str, Any]):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute('INSERT OR REPLACE INTO bidders (bidder_id, tender_id, claims, decision_snapshot) VALUES (?, ?, ?, ?)', 
                   (bidder_id, tender_id, json.dumps(claims), json.dumps(decision_snapshot)))
    conn.commit()
    conn.close()

def get_bidders(tender_id: str) -> List[Dict[str, Any]]:
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute('SELECT bidder_id, claims, decision_snapshot FROM bidders WHERE tender_id = ?', (tender_id,))
    rows = cursor.fetchall()
    conn.close()
    
    bidders = []
    for r in rows:
        bidders.append({
            "bidder_id": r[0],
            "claims": json.loads(r[1]),
            "decision_snapshot": json.loads(r[2])
        })
    return bidders

def lock_decision(tender_id: str, bidder_id: str, override_type: str, justification: str, officer_id: str, input_hash: str):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Get current snapshot
    cursor.execute('SELECT decision_snapshot FROM bidders WHERE bidder_id = ?', (bidder_id,))
    row = cursor.fetchone()
    if not row:
        return False
        
    snapshot = json.loads(row[0])
    snapshot["locked"] = True
    if override_type == "full":
        snapshot["final_verdict"] = "ELIGIBLE" if snapshot["final_verdict"] == "NOT_ELIGIBLE" else "NOT_ELIGIBLE"
        
    decision_data_str = json.dumps(snapshot)
    
    # Update bidder
    cursor.execute('UPDATE bidders SET decision_snapshot = ? WHERE bidder_id = ?', (decision_data_str, bidder_id))
    
    # Create audit record
    processing_hash = hashlib.sha256(b"processing_rules_v1").hexdigest()
    decision_json_hash = hashlib.sha256(decision_data_str.encode()).hexdigest()
    
    cursor.execute('''
        INSERT INTO audit_trail (tender_id, bidder_id, event_timestamp, officer_id, input_hash, processing_hash, decision_json_hash, decision_data, override_type, justification, locked)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (tender_id, bidder_id, datetime.utcnow().isoformat(), officer_id, input_hash, processing_hash, decision_json_hash, decision_data_str, override_type, justification, True))
    
    conn.commit()
    conn.close()
    return True

def get_audit_trail(tender_id: str) -> List[Dict[str, Any]]:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM audit_trail WHERE tender_id = ?', (tender_id,))
    rows = cursor.fetchall()
    conn.close()
    return [dict(ix) for ix in rows]

# Initialize db on module load
init_db()
