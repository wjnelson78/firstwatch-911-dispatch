#!/usr/bin/env python3
"""
Snohomish County 911 Dispatch Data Ingester

This application fetches real-time 911 dispatch data from the FirstWatch public 
event listing API and stores it in a PostgreSQL database for historical tracking,
analysis, and visualization.

The ingester runs on a scheduled basis (via cron) to continuously capture new
dispatch events as they occur, enabling trend analysis and historical lookups.

Data Source: FirstWatch Public Event Listing
    URL: https://subscriber.firstwatch.net/publiceventlisting/Index
    
Features:
    - Fetches all active dispatch events from FirstWatch API
    - Stores events in PostgreSQL with deduplication
    - Tracks event lifecycle (first_seen, last_seen, times_seen)
    - Supports both Police and Fire/EMS dispatch types
    - Captures location data (coordinates) when available
    - Provides export functionality to CSV

Author: William Nelson
Created: December 2025
License: MIT
Repository: https://github.com/wnelson/firstwatch.net
"""

import json
import psycopg2
from psycopg2.extras import RealDictCursor
import requests
import time
from datetime import datetime
from typing import Optional
import csv
import argparse
import os


class DispatchIngester:
    """
    Ingests and stores 911 dispatch data from the FirstWatch API.
    
    This class handles all interactions with the FirstWatch API and PostgreSQL
    database, including fetching events, storing them with deduplication logic,
    and maintaining event lifecycle tracking.
    
    Attributes:
        BASE_URL (str): The FirstWatch API endpoint URL
        DEFAULT_TOKEN (str): Default public API token for Snohomish County
        db_config (dict): PostgreSQL connection configuration
        pub_token (str): API authentication token
        
    Example:
        >>> ingester = DispatchIngester()
        >>> events = ingester.fetch_events()
        >>> ingester.store_events(events)
    """
    
    BASE_URL = "https://subscriber.firstwatch.net/publiceventlisting/EventListing"
    DEFAULT_TOKEN = os.environ.get('DISPATCH_API_TOKEN', 'A8A1754F-1AEF-482E-8CBF-ABE4890CBF64')
    
    # Default PostgreSQL connection settings - uses environment variables for security
    DEFAULT_DB_CONFIG = {
        'host': os.environ.get('DB_HOST', 'localhost'),
        'port': int(os.environ.get('DB_PORT', 5432)),
        'database': os.environ.get('DB_NAME', 'dispatch_911'),
        'user': os.environ.get('DB_USER', 'postgres'),
        'password': os.environ.get('DB_PASSWORD', '')
    }
    
    def __init__(self, db_config: Optional[dict] = None, pub_token: Optional[str] = None):
        """
        Initialize the dispatch ingester.
        
        Sets up the database connection configuration and API token. Creates the
        database and required tables if they don't exist.
        
        Args:
            db_config: PostgreSQL connection configuration dictionary with keys:
                       host, port, database, user, password
            pub_token: Public API token for FirstWatch (uses default if not provided)
        """
        self.db_config = db_config or self.DEFAULT_DB_CONFIG.copy()
        self.pub_token = pub_token or self.DEFAULT_TOKEN
        self._ensure_database_exists()
        self._init_database()
    
    def _get_connection(self, database: Optional[str] = None):
        """Get a PostgreSQL connection."""
        config = self.db_config.copy()
        if database:
            config['database'] = database
        return psycopg2.connect(**config)
    
    def _ensure_database_exists(self):
        """Create the database if it doesn't exist."""
        # Connect to default postgres database to create our database
        config = self.db_config.copy()
        target_db = config.pop('database', 'dispatch_911')
        config['database'] = 'postgres'
        
        try:
            conn = psycopg2.connect(**config)
            conn.autocommit = True
            cursor = conn.cursor()
            
            # Check if database exists
            cursor.execute(
                "SELECT 1 FROM pg_database WHERE datname = %s",
                (target_db,)
            )
            
            if not cursor.fetchone():
                cursor.execute(f'CREATE DATABASE "{target_db}"')
                print(f"Created database: {target_db}")
            
            cursor.close()
            conn.close()
        except psycopg2.Error as e:
            print(f"Warning: Could not check/create database: {e}")
    
    def _init_database(self):
        """Initialize the PostgreSQL database with required tables."""
        conn = self._get_connection()
        cursor = conn.cursor()
        
        # Create main events table with ALL possible fields
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS events (
                id SERIAL PRIMARY KEY,
                event_id TEXT UNIQUE NOT NULL,
                
                -- Core event fields
                call_number TEXT,
                address TEXT,
                call_type TEXT,
                units TEXT,
                call_created TIMESTAMP,
                jurisdiction TEXT,
                agency_type TEXT,
                
                -- Location data
                longitude DOUBLE PRECISION,
                latitude DOUBLE PRECISION,
                
                -- Additional URL fields from API
                link_url_1 TEXT,
                link_url_2 TEXT,
                link_url_3 TEXT,
                link_url_4 TEXT,
                link_url_5 TEXT,
                
                -- Raw column data (for any additional columns)
                column_1 TEXT,
                column_2 TEXT,
                column_3 TEXT,
                column_4 TEXT,
                column_5 TEXT,
                column_6 TEXT,
                column_7 TEXT,
                column_8 TEXT,
                column_9 TEXT,
                column_10 TEXT,
                
                -- Metadata
                first_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                times_seen INTEGER DEFAULT 1,
                
                -- Store complete raw JSON
                raw_data JSONB,
                
                -- Source metadata
                source_title TEXT,
                source_token TEXT
            )
        """)
        
        # Create indexes for faster lookups
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_events_event_id ON events(event_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_events_call_created ON events(call_created)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_events_call_type ON events(call_type)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_events_jurisdiction ON events(jurisdiction)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_events_agency_type ON events(agency_type)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_events_address ON events(address)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_events_first_seen ON events(first_seen)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_events_last_seen ON events(last_seen)")
        
        # GiST index for location queries (if PostGIS is available)
        try:
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_events_location 
                ON events(longitude, latitude) 
                WHERE longitude IS NOT NULL AND latitude IS NOT NULL
            """)
        except:
            pass
        
        # Create ingestion log table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS ingestion_log (
                id SERIAL PRIMARY KEY,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                events_fetched INTEGER,
                new_events INTEGER,
                updated_events INTEGER,
                status TEXT,
                error_message TEXT,
                duration_seconds DOUBLE PRECISION,
                source_token TEXT
            )
        """)
        
        # Create column definitions table to store API column mappings
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS column_definitions (
                id SERIAL PRIMARY KEY,
                source_token TEXT,
                column_field TEXT,
                column_header TEXT,
                column_order INTEGER,
                last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(source_token, column_field)
            )
        """)
        
        # Create source metadata table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS source_metadata (
                id SERIAL PRIMARY KEY,
                source_token TEXT UNIQUE,
                title TEXT,
                logo_url TEXT,
                disclaimer TEXT,
                time_format TEXT,
                filters JSONB,
                default_sort_column TEXT,
                default_sort_direction TEXT,
                last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        conn.commit()
        cursor.close()
        conn.close()
        print(f"Database initialized: {self.db_config['database']} on {self.db_config['host']}")
    
    def fetch_data(self) -> dict:
        """
        Fetch current dispatch data from the API.
        
        Returns:
            dict: Raw API response containing columns and rows
        """
        params = {"pubToken": self.pub_token}
        
        try:
            response = requests.get(self.BASE_URL, params=params, timeout=30)
            response.raise_for_status()
            return response.json()
        except requests.RequestException as e:
            raise Exception(f"Failed to fetch data: {e}")
    
    def _parse_datetime(self, value: str) -> Optional[datetime]:
        """Parse datetime string from API response."""
        if not value:
            return None
        try:
            # Handle format like "2025-12-10T10:34:30.603"
            return datetime.fromisoformat(value.replace('Z', '+00:00'))
        except (ValueError, TypeError):
            return None
    
    def _save_source_metadata(self, cursor, data: dict):
        """Save source metadata from API response."""
        cursor.execute("""
            INSERT INTO source_metadata (
                source_token, title, logo_url, disclaimer, time_format,
                filters, default_sort_column, default_sort_direction, last_updated
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, CURRENT_TIMESTAMP)
            ON CONFLICT (source_token) DO UPDATE SET
                title = EXCLUDED.title,
                logo_url = EXCLUDED.logo_url,
                disclaimer = EXCLUDED.disclaimer,
                time_format = EXCLUDED.time_format,
                filters = EXCLUDED.filters,
                default_sort_column = EXCLUDED.default_sort_column,
                default_sort_direction = EXCLUDED.default_sort_direction,
                last_updated = CURRENT_TIMESTAMP
        """, (
            self.pub_token,
            data.get('title'),
            data.get('logoUrl'),
            data.get('disclaimer'),
            data.get('timeFormat'),
            json.dumps(data.get('filters', [])),
            data.get('defaultSortColumn'),
            data.get('defaultSortDirection')
        ))
    
    def _save_column_definitions(self, cursor, columns: list):
        """Save column definitions from API response."""
        for i, col in enumerate(columns):
            cursor.execute("""
                INSERT INTO column_definitions (source_token, column_field, column_header, column_order, last_updated)
                VALUES (%s, %s, %s, %s, CURRENT_TIMESTAMP)
                ON CONFLICT (source_token, column_field) DO UPDATE SET
                    column_header = EXCLUDED.column_header,
                    column_order = EXCLUDED.column_order,
                    last_updated = CURRENT_TIMESTAMP
            """, (
                self.pub_token,
                col.get('field'),
                col.get('header'),
                i
            ))
    
    def _map_row_to_event(self, row: dict, columns: list, source_title: str) -> dict:
        """
        Map a raw row to a structured event dictionary.
        
        Args:
            row: Raw row data from API
            columns: Column definitions from API
            source_title: Title of the data source
            
        Returns:
            dict: Structured event data
        """
        event = {
            'event_id': row.get('EventID', ''),
            'call_number': row.get('Column1'),
            'address': row.get('Column2'),
            'call_type': row.get('Column3'),
            'units': row.get('Column4'),
            'call_created': self._parse_datetime(row.get('Column5', '')),
            'jurisdiction': row.get('Column6'),
            'agency_type': row.get('Column7'),
            'longitude': self._safe_float(row.get('Longitude')),
            'latitude': self._safe_float(row.get('Latitude')),
            'link_url_1': row.get('LinkURL1'),
            'link_url_2': row.get('LinkURL2'),
            'link_url_3': row.get('LinkURL3'),
            'link_url_4': row.get('LinkURL4'),
            'link_url_5': row.get('LinkURL5'),
            'column_1': row.get('Column1'),
            'column_2': row.get('Column2'),
            'column_3': row.get('Column3'),
            'column_4': row.get('Column4'),
            'column_5': row.get('Column5'),
            'column_6': row.get('Column6'),
            'column_7': row.get('Column7'),
            'column_8': row.get('Column8'),
            'column_9': row.get('Column9'),
            'column_10': row.get('Column10'),
            'raw_data': json.dumps(row),
            'source_title': source_title,
            'source_token': self.pub_token
        }
        
        return event
    
    def _safe_float(self, value) -> Optional[float]:
        """Safely convert value to float."""
        if value is None or value == '':
            return None
        try:
            return float(value)
        except (ValueError, TypeError):
            return None
    
    def ingest(self) -> dict:
        """
        Fetch and store dispatch data.
        
        Returns:
            dict: Summary of ingestion results
        """
        start_time = time.time()
        result = {
            'events_fetched': 0,
            'new_events': 0,
            'updated_events': 0,
            'status': 'success',
            'error_message': None,
            'duration_seconds': 0
        }
        
        try:
            # Fetch data from API
            data = self.fetch_data()
            
            columns = data.get('columns', [])
            rows = data.get('rows', [])
            source_title = data.get('title', '')
            result['events_fetched'] = len(rows)
            
            print(f"Fetched {len(rows)} events from API")
            print(f"Title: {source_title}")
            
            # Connect to database
            conn = self._get_connection()
            cursor = conn.cursor()
            
            # Save metadata
            self._save_source_metadata(cursor, data)
            self._save_column_definitions(cursor, columns)
            
            now = datetime.now()
            
            for row in rows:
                event = self._map_row_to_event(row, columns, source_title)
                
                if not event['event_id']:
                    continue
                
                # Check if event already exists
                cursor.execute("SELECT id, times_seen FROM events WHERE event_id = %s", (event['event_id'],))
                existing = cursor.fetchone()
                
                if existing:
                    # Update last_seen timestamp and increment times_seen
                    cursor.execute(
                        "UPDATE events SET last_seen = %s, times_seen = times_seen + 1 WHERE event_id = %s",
                        (now, event['event_id'])
                    )
                    result['updated_events'] += 1
                else:
                    # Insert new event
                    cursor.execute("""
                        INSERT INTO events (
                            event_id, call_number, address, call_type, units,
                            call_created, jurisdiction, agency_type, longitude,
                            latitude, link_url_1, link_url_2, link_url_3, link_url_4, link_url_5,
                            column_1, column_2, column_3, column_4, column_5,
                            column_6, column_7, column_8, column_9, column_10,
                            first_seen, last_seen, times_seen, raw_data, source_title, source_token
                        ) VALUES (
                            %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                            %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                            %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
                        )
                    """, (
                        event['event_id'],
                        event['call_number'],
                        event['address'],
                        event['call_type'],
                        event['units'],
                        event['call_created'],
                        event['jurisdiction'],
                        event['agency_type'],
                        event['longitude'],
                        event['latitude'],
                        event['link_url_1'],
                        event['link_url_2'],
                        event['link_url_3'],
                        event['link_url_4'],
                        event['link_url_5'],
                        event['column_1'],
                        event['column_2'],
                        event['column_3'],
                        event['column_4'],
                        event['column_5'],
                        event['column_6'],
                        event['column_7'],
                        event['column_8'],
                        event['column_9'],
                        event['column_10'],
                        now,
                        now,
                        1,
                        event['raw_data'],
                        event['source_title'],
                        event['source_token']
                    ))
                    result['new_events'] += 1
            
            conn.commit()
            
            result['duration_seconds'] = time.time() - start_time
            
            # Log the ingestion
            cursor.execute("""
                INSERT INTO ingestion_log (events_fetched, new_events, updated_events, status, duration_seconds, source_token)
                VALUES (%s, %s, %s, %s, %s, %s)
            """, (result['events_fetched'], result['new_events'], result['updated_events'], 'success', result['duration_seconds'], self.pub_token))
            
            conn.commit()
            cursor.close()
            conn.close()
            
            print(f"Ingestion complete: {result['new_events']} new, {result['updated_events']} updated ({result['duration_seconds']:.2f}s)")
            
        except Exception as e:
            result['status'] = 'error'
            result['error_message'] = str(e)
            result['duration_seconds'] = time.time() - start_time
            print(f"Error during ingestion: {e}")
            
            # Log the error
            try:
                conn = self._get_connection()
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT INTO ingestion_log (events_fetched, new_events, updated_events, status, error_message, duration_seconds, source_token)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                """, (0, 0, 0, 'error', str(e), result['duration_seconds'], self.pub_token))
                conn.commit()
                cursor.close()
                conn.close()
            except:
                pass
        
        return result
    
    def get_stats(self) -> dict:
        """Get database statistics."""
        conn = self._get_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        stats = {}
        
        # Total events
        cursor.execute("SELECT COUNT(*) as count FROM events")
        stats['total_events'] = cursor.fetchone()['count']
        
        # Events by agency type
        cursor.execute("""
            SELECT agency_type, COUNT(*) as count 
            FROM events 
            GROUP BY agency_type 
            ORDER BY count DESC
        """)
        stats['by_agency_type'] = {row['agency_type']: row['count'] for row in cursor.fetchall()}
        
        # Events by call type (top 15)
        cursor.execute("""
            SELECT call_type, COUNT(*) as count 
            FROM events 
            GROUP BY call_type 
            ORDER BY count DESC 
            LIMIT 15
        """)
        stats['top_call_types'] = {row['call_type']: row['count'] for row in cursor.fetchall()}
        
        # Events by jurisdiction (top 15)
        cursor.execute("""
            SELECT jurisdiction, COUNT(*) as count 
            FROM events 
            GROUP BY jurisdiction 
            ORDER BY count DESC 
            LIMIT 15
        """)
        stats['top_jurisdictions'] = {row['jurisdiction']: row['count'] for row in cursor.fetchall()}
        
        # Date range
        cursor.execute("SELECT MIN(call_created) as earliest, MAX(call_created) as latest FROM events")
        date_range = cursor.fetchone()
        stats['date_range'] = {'earliest': str(date_range['earliest']), 'latest': str(date_range['latest'])}
        
        # Database size
        cursor.execute("""
            SELECT pg_size_pretty(pg_database_size(%s)) as size
        """, (self.db_config['database'],))
        stats['database_size'] = cursor.fetchone()['size']
        
        # Recent ingestions
        cursor.execute("""
            SELECT timestamp, events_fetched, new_events, updated_events, status, duration_seconds
            FROM ingestion_log 
            ORDER BY timestamp DESC 
            LIMIT 5
        """)
        stats['recent_ingestions'] = [dict(row) for row in cursor.fetchall()]
        
        # Events per day (last 7 days)
        cursor.execute("""
            SELECT DATE(call_created) as date, COUNT(*) as count
            FROM events
            WHERE call_created >= CURRENT_DATE - INTERVAL '7 days'
            GROUP BY DATE(call_created)
            ORDER BY date DESC
        """)
        stats['events_per_day'] = {str(row['date']): row['count'] for row in cursor.fetchall()}
        
        cursor.close()
        conn.close()
        return stats
    
    def export_to_csv(self, output_path: str, limit: Optional[int] = None):
        """
        Export events to CSV file.
        
        Args:
            output_path: Path for output CSV file
            limit: Maximum number of records to export (None for all)
        """
        conn = self._get_connection()
        cursor = conn.cursor()
        
        query = """
            SELECT call_number, address, call_type, units, call_created,
                   jurisdiction, agency_type, latitude, longitude, 
                   link_url_1, first_seen, last_seen, times_seen
            FROM events 
            ORDER BY call_created DESC
        """
        if limit:
            query += f" LIMIT {limit}"
        
        cursor.execute(query)
        rows = cursor.fetchall()
        
        headers = [
            'Call Number', 'Address', 'Call Type', 'Units', 'Call Created',
            'Jurisdiction', 'Agency Type', 'Latitude', 'Longitude',
            'Link URL', 'First Seen', 'Last Seen', 'Times Seen'
        ]
        
        with open(output_path, 'w', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            writer.writerow(headers)
            writer.writerows(rows)
        
        cursor.close()
        conn.close()
        print(f"Exported {len(rows)} events to {output_path}")
    
    def export_to_json(self, output_path: str, limit: Optional[int] = None):
        """
        Export events to JSON file.
        
        Args:
            output_path: Path for output JSON file
            limit: Maximum number of records to export (None for all)
        """
        conn = self._get_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        query = """
            SELECT event_id, call_number, address, call_type, units, call_created,
                   jurisdiction, agency_type, latitude, longitude,
                   link_url_1, link_url_2, link_url_3, link_url_4, link_url_5,
                   first_seen, last_seen, times_seen
            FROM events 
            ORDER BY call_created DESC
        """
        if limit:
            query += f" LIMIT {limit}"
        
        cursor.execute(query)
        rows = [dict(row) for row in cursor.fetchall()]
        
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(rows, f, indent=2, default=str)
        
        cursor.close()
        conn.close()
        print(f"Exported {len(rows)} events to {output_path}")
    
    def search_events(self, 
                      call_type: Optional[str] = None,
                      jurisdiction: Optional[str] = None,
                      address: Optional[str] = None,
                      start_date: Optional[str] = None,
                      end_date: Optional[str] = None,
                      limit: int = 100) -> list:
        """
        Search for events based on criteria.
        
        Args:
            call_type: Filter by call type (partial match)
            jurisdiction: Filter by jurisdiction (partial match)
            address: Filter by address (partial match)
            start_date: Start date filter (YYYY-MM-DD)
            end_date: End date filter (YYYY-MM-DD)
            limit: Maximum results to return
            
        Returns:
            list: Matching events
        """
        conn = self._get_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        query = "SELECT * FROM events WHERE 1=1"
        params = []
        
        if call_type:
            query += " AND call_type ILIKE %s"
            params.append(f"%{call_type}%")
        
        if jurisdiction:
            query += " AND jurisdiction ILIKE %s"
            params.append(f"%{jurisdiction}%")
        
        if address:
            query += " AND address ILIKE %s"
            params.append(f"%{address}%")
        
        if start_date:
            query += " AND call_created >= %s"
            params.append(start_date)
        
        if end_date:
            query += " AND call_created <= %s"
            params.append(end_date + " 23:59:59")
        
        query += f" ORDER BY call_created DESC LIMIT {limit}"
        
        cursor.execute(query, params)
        results = [dict(row) for row in cursor.fetchall()]
        
        cursor.close()
        conn.close()
        return results


def run_scheduler(ingester: DispatchIngester, interval_minutes: int = 15):
    """
    Run the ingester on a schedule.
    
    Args:
        ingester: DispatchIngester instance
        interval_minutes: Minutes between ingestions
    """
    print(f"Starting scheduled ingestion every {interval_minutes} minutes")
    print("Press Ctrl+C to stop")
    
    while True:
        print(f"\n[{datetime.now().isoformat()}] Running ingestion...")
        ingester.ingest()
        print(f"Next run in {interval_minutes} minutes")
        time.sleep(interval_minutes * 60)


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description='911 Dispatch Data Ingester for Snohomish County 911'
    )
    
    parser.add_argument('--host', default=os.environ.get('DB_HOST', 'localhost'), 
                       help='PostgreSQL host (default: localhost or DB_HOST env)')
    parser.add_argument('--port', type=int, default=int(os.environ.get('DB_PORT', 5432)), 
                       help='PostgreSQL port (default: 5432 or DB_PORT env)')
    parser.add_argument('--database', default=os.environ.get('DB_NAME', 'dispatch_911'), 
                       help='Database name (default: dispatch_911 or DB_NAME env)')
    parser.add_argument('--user', default=os.environ.get('DB_USER', 'postgres'), 
                       help='Database username (default: postgres or DB_USER env)')
    parser.add_argument('--password', default=os.environ.get('DB_PASSWORD', ''), 
                       help='Database password (default: DB_PASSWORD env)')
    parser.add_argument('--token', help='Public token for API access')
    
    subparsers = parser.add_subparsers(dest='command', help='Commands')
    
    # Ingest command
    ingest_parser = subparsers.add_parser('ingest', help='Run a single ingestion')
    
    # Schedule command
    schedule_parser = subparsers.add_parser('schedule', help='Run on a schedule')
    schedule_parser.add_argument(
        '--interval',
        type=int,
        default=15,
        help='Minutes between ingestions (default: 15)'
    )
    
    # Stats command
    stats_parser = subparsers.add_parser('stats', help='Show database statistics')
    
    # Export command
    export_parser = subparsers.add_parser('export', help='Export data')
    export_parser.add_argument('format', choices=['csv', 'json'], help='Export format')
    export_parser.add_argument('--output', '-o', required=True, help='Output file path')
    export_parser.add_argument('--limit', type=int, help='Limit number of records')
    
    # Search command
    search_parser = subparsers.add_parser('search', help='Search events')
    search_parser.add_argument('--type', dest='call_type', help='Filter by call type')
    search_parser.add_argument('--jurisdiction', help='Filter by jurisdiction')
    search_parser.add_argument('--address', help='Filter by address')
    search_parser.add_argument('--start', help='Start date (YYYY-MM-DD)')
    search_parser.add_argument('--end', help='End date (YYYY-MM-DD)')
    search_parser.add_argument('--limit', type=int, default=20, help='Max results')
    
    args = parser.parse_args()
    
    # Build database config from args
    db_config = {
        'host': args.host,
        'port': args.port,
        'database': args.database,
        'user': args.user,
        'password': args.password
    }
    
    # Initialize ingester
    ingester = DispatchIngester(db_config=db_config, pub_token=args.token)
    
    if args.command == 'ingest':
        result = ingester.ingest()
        print(f"\nResult: {json.dumps(result, indent=2, default=str)}")
        
    elif args.command == 'schedule':
        try:
            run_scheduler(ingester, args.interval)
        except KeyboardInterrupt:
            print("\nScheduler stopped")
            
    elif args.command == 'stats':
        stats = ingester.get_stats()
        print("\n=== Database Statistics ===")
        print(f"Total Events: {stats['total_events']:,}")
        print(f"Database Size: {stats['database_size']}")
        print(f"\nDate Range: {stats['date_range']['earliest']} to {stats['date_range']['latest']}")
        print("\nBy Agency Type:")
        for agency, count in stats['by_agency_type'].items():
            print(f"  {agency}: {count:,}")
        print("\nTop Call Types:")
        for call_type, count in stats['top_call_types'].items():
            print(f"  {call_type}: {count:,}")
        print("\nTop Jurisdictions:")
        for jurisdiction, count in stats['top_jurisdictions'].items():
            print(f"  {jurisdiction}: {count:,}")
        print("\nEvents Per Day (Last 7 Days):")
        for date, count in stats['events_per_day'].items():
            print(f"  {date}: {count:,}")
        print("\nRecent Ingestions:")
        for ing in stats['recent_ingestions']:
            print(f"  {ing['timestamp']}: {ing['new_events']} new, {ing['updated_events']} updated ({ing['status']}) - {ing['duration_seconds']:.2f}s")
            
    elif args.command == 'export':
        if args.format == 'csv':
            ingester.export_to_csv(args.output, args.limit)
        else:
            ingester.export_to_json(args.output, args.limit)
            
    elif args.command == 'search':
        results = ingester.search_events(
            call_type=args.call_type,
            jurisdiction=args.jurisdiction,
            address=args.address,
            start_date=args.start,
            end_date=args.end,
            limit=args.limit
        )
        print(f"\nFound {len(results)} events:\n")
        for event in results:
            print(f"[{event['call_created']}] {event['call_type']}")
            print(f"  Address: {event['address']}")
            print(f"  Units: {event['units']}")
            print(f"  Jurisdiction: {event['jurisdiction']}")
            print(f"  Seen {event['times_seen']} times")
            print()
    else:
        # Default: show help
        parser.print_help()


if __name__ == "__main__":
    main()
