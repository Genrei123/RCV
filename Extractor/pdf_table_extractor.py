#!/usr/bin/env python3

import pandas as pd
import pdfplumber
import tabula
import os
import sys
from pathlib import Path
import argparse
import warnings
import mysql.connector
from mysql.connector import Error
import re
warnings.filterwarnings('ignore')

class PDFTableExtractor:
    def __init__(self):
        self.extracted_tables = []
        self.mysql_connection = None
    
    def connect_to_mysql(self, host, database, username, password, port=3306):
        try:
            self.mysql_connection = mysql.connector.connect(
                host=host,
                database=database,
                user=username,
                password=password,
                port=port
            )
            if self.mysql_connection.is_connected():
                print(f"✓ Connected to MySQL database: {database}")
                return True
        except Error as e:
            print(f"❌ Error connecting to MySQL: {e}")
            return False
    
    def create_table_in_mysql(self, table_name, df):
        if not self.mysql_connection or not self.mysql_connection.is_connected():
            print("❌ No MySQL connection available")
            return False
        
        try:
            cursor = self.mysql_connection.cursor()
            
            columns_sql = []
            for col in df.columns:
                clean_col = re.sub(r'[^\w]', '_', str(col)).strip('_')
                clean_col = re.sub(r'_+', '_', clean_col)
                if clean_col[0].isdigit():
                    clean_col = 'col_' + clean_col
                columns_sql.append(f"`{clean_col}` TEXT")
            
            create_table_sql = f"""
                CREATE TABLE IF NOT EXISTS `{table_name}` (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    {', '.join(columns_sql)},
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """
            
            cursor.execute(create_table_sql)
            self.mysql_connection.commit()
            print(f"✓ Created/verified table: {table_name}")
            return True
            
        except Error as e:
            print(f"❌ Error creating table {table_name}: {e}")
            return False
        finally:
            if cursor:
                cursor.close()
    
    def insert_data_to_mysql(self, table_name, df, chunk_size=500):
        if not self.mysql_connection or not self.mysql_connection.is_connected():
            print("❌ No MySQL connection available")
            return False
        
        try:
            cursor = self.mysql_connection.cursor()
            
            clean_columns = []
            for col in df.columns:
                clean_col = re.sub(r'[^\w]', '_', str(col)).strip('_')
                clean_col = re.sub(r'_+', '_', clean_col)
                if clean_col[0].isdigit():
                    clean_col = 'col_' + clean_col
                clean_columns.append(clean_col)
            
            placeholders = ', '.join(['%s'] * len(clean_columns))
            columns_str = ', '.join([f"`{col}`" for col in clean_columns])
            
            insert_sql = f"INSERT INTO `{table_name}` ({columns_str}) VALUES ({placeholders})"
            
            # Prepare all data
            all_data = []
            for _, row in df.iterrows():
                # Convert values to shorter strings to reduce packet size
                row_data = []
                for val in row:
                    if pd.notna(val):
                        str_val = str(val)
                        # Truncate very long text fields to prevent packet overflow
                        if len(str_val) > 1000:
                            str_val = str_val[:1000] + "..."
                        row_data.append(str_val)
                    else:
                        row_data.append(None)
                all_data.append(row_data)
            
            # Insert in smaller chunks to avoid packet size issues
            total_rows = len(all_data)
            inserted_rows = 0
            
            print(f"Inserting {total_rows} rows in chunks of {chunk_size}...")
            
            for i in range(0, total_rows, chunk_size):
                chunk = all_data[i:i + chunk_size]
                cursor.executemany(insert_sql, chunk)
                self.mysql_connection.commit()
                inserted_rows += len(chunk)
                
                # Show progress every 10 chunks
                if (i // chunk_size) % 10 == 0 or inserted_rows >= total_rows:
                    progress = (inserted_rows / total_rows) * 100
                    print(f"Progress: {inserted_rows}/{total_rows} rows ({progress:.1f}%)")
            
            print(f"✓ Inserted {inserted_rows} rows into {table_name}")
            return True
            
        except Error as e:
            print(f"❌ Error inserting data into {table_name}: {e}")
            if "packet" in str(e).lower():
                print("💡 Tip: The dataset is very large. Consider processing smaller page ranges.")
            return False
        finally:
            if cursor:
                cursor.close()
    
    def save_to_mysql(self, tables, pdf_path, table_prefix="pdf_table", single_table=False, custom_table_name=None):
        if not tables:
            print("❌ No tables to save to MySQL")
            return False
        
        base_name = Path(pdf_path).stem
        clean_base_name = re.sub(r'[^\w]', '_', base_name).lower()
        
        if single_table:
            combined_df = pd.concat(tables, ignore_index=True)
            
            if custom_table_name:
                table_name = custom_table_name
            else:
                table_name = f"{table_prefix}_{clean_base_name}_combined"
            
            if self.create_table_in_mysql(table_name, combined_df):
                if self.insert_data_to_mysql(table_name, combined_df):
                    print(f"✓ Successfully saved all data to single table: {table_name}")
                    return True
            return False
        else:
            success_count = 0
            for i, df in enumerate(tables):
                table_name = f"{table_prefix}_{clean_base_name}_{i+1}"
                
                if self.create_table_in_mysql(table_name, df):
                    if self.insert_data_to_mysql(table_name, df):
                        success_count += 1
            
            print(f"✓ Successfully saved {success_count}/{len(tables)} tables to MySQL")
            return success_count > 0
    
    def close_mysql_connection(self):
        if self.mysql_connection and self.mysql_connection.is_connected():
            self.mysql_connection.close()
            print("✓ MySQL connection closed")
    
    def extract_with_pdfplumber(self, pdf_path, page_numbers=None):
        print(f"Extracting tables with pdfplumber from: {pdf_path}")
        tables = []
        
        with pdfplumber.open(pdf_path) as pdf:
            pages_to_process = page_numbers if page_numbers else range(len(pdf.pages))
            
            for page_num in pages_to_process:
                if page_num < len(pdf.pages):
                    page = pdf.pages[page_num]
                    page_tables = page.extract_tables()
                    
                    for i, table in enumerate(page_tables):
                        if table and len(table) > 0:
                            df = pd.DataFrame(table[1:], columns=table[0])
                            df['source_page'] = page_num + 1
                            df['source_method'] = 'pdfplumber'
                            df['table_index'] = i
                            tables.append(df)
                            print(f"Found table on page {page_num + 1} with {len(df)} rows")
        
        return tables
    
    def extract_with_tabula(self, pdf_path, page_numbers=None):
        print(f"Extracting tables with tabula from: {pdf_path}")
        tables = []
        
        try:
            pages = page_numbers if page_numbers else 'all'
            
            tabula_tables = tabula.read_pdf(
                pdf_path, 
                pages=pages, 
                multiple_tables=True,
                pandas_options={'header': 0},
                silent=True
            )
            
            for i, df in enumerate(tabula_tables):
                if not df.empty:
                    df['source_method'] = 'tabula'
                    df['table_index'] = i
                    tables.append(df)
                    print(f"Found table {i+1} with {len(df)} rows")
                    
        except Exception as e:
            print(f"Tabula extraction failed: {e}")
        
        return tables
    
    def clean_dataframe(self, df, remove_metadata=False, clean_text=False):
        df = df.dropna(how='all')
        
        df = df.dropna(axis=1, how='all')
        
        for col in df.columns:
            if df[col].dtype == 'object':
                df[col] = df[col].astype(str).str.strip()
                df[col] = df[col].replace('nan', pd.NA)
                # Clean up broken text that spans multiple lines if requested
                if clean_text:
                    df[col] = df[col].apply(self.clean_broken_text)
        
        # Remove metadata columns if requested
        if remove_metadata:
            metadata_columns = ['source_page', 'source_method', 'table_index', 'created_at']
            df = df.drop(columns=[col for col in metadata_columns if col in df.columns])
        
        return df
    
    def clean_broken_text(self, text):
        """Clean text that has been broken across multiple lines"""
        if pd.isna(text) or text == 'nan':
            return text
        
        # Convert to string if not already
        text = str(text)
        
        # Remove extra whitespace and normalize line breaks
        text = ' '.join(text.split())
        
        patterns = [
            (r'(\w+)-\s*(\w+)', r'\1\2'),
            (r'(\w+)\s+([a-z])\b', r'\1\2'),
            (r'(\w+)\s+([A-Z]{1,3})\b', r'\1\2'),
            (r'\s+', ' '),
        ]
        
        for pattern, replacement in patterns:
            text = re.sub(pattern, replacement, text)
        
        return text.strip()
    
    def extract_tables(self, pdf_path, method='both', pages=None, output_format='excel', mysql_config=None, single_table=False, remove_metadata=False, clean_text=False):
        if not os.path.exists(pdf_path):
            raise FileNotFoundError(f"PDF file not found: {pdf_path}")
        
        print(f"Processing PDF: {pdf_path}")
        print(f"Method: {method}")
        
        page_numbers = None
        if pages:
            page_numbers = [p - 1 for p in pages]
        
        all_tables = []
        
        if method in ['pdfplumber', 'both']:
            tables = self.extract_with_pdfplumber(pdf_path, page_numbers)
            all_tables.extend(tables)
        
        if method in ['tabula', 'both']:
            tables = self.extract_with_tabula(pdf_path, page_numbers)
            all_tables.extend(tables)
        
        cleaned_tables = []
        for df in all_tables:
            cleaned_df = self.clean_dataframe(df, remove_metadata=remove_metadata, clean_text=clean_text)
            if not cleaned_df.empty:
                cleaned_tables.append(cleaned_df)
        
        print(f"Total tables extracted: {len(cleaned_tables)}")
        
        if cleaned_tables:
            if output_format == 'mysql' and mysql_config:
                try:
                    # Extract custom table name from config
                    custom_table_name = mysql_config.pop('table_name', None)
                    
                    if self.connect_to_mysql(**mysql_config):
                        if single_table:
                            combined_df = pd.concat(cleaned_tables, ignore_index=True)
                            self.save_to_mysql([combined_df], pdf_path, single_table=True, custom_table_name=custom_table_name)
                        else:
                            self.save_to_mysql(cleaned_tables, pdf_path, single_table=False, custom_table_name=custom_table_name)
                        self.close_mysql_connection()
                        return cleaned_tables
                    else:
                        print("❌ Failed to connect to MySQL. Extraction aborted.")
                        return []
                except Exception as e:
                    print(f"❌ MySQL error: {e}")
                    return []
            else:
                if single_table and output_format in ['excel', 'csv']:
                    # Combine tables for non-MySQL formats too
                    combined_df = pd.concat(cleaned_tables, ignore_index=True)
                    self.save_tables([combined_df], pdf_path, output_format)
                else:
                    self.save_tables(cleaned_tables, pdf_path, output_format)
        else:
            print("No tables found in the PDF")
        
        return cleaned_tables
    
    def save_tables(self, tables, pdf_path, output_format='excel'):
        base_name = Path(pdf_path).stem
        output_dir = Path(pdf_path).parent / f"{base_name}_extracted_tables"
        output_dir.mkdir(exist_ok=True)
        
        if output_format == 'excel':
            excel_path = output_dir / f"{base_name}_tables.xlsx"
            with pd.ExcelWriter(excel_path, engine='openpyxl') as writer:
                for i, df in enumerate(tables):
                    sheet_name = f"Table_{i+1}"
                    if 'source_page' in df.columns:
                        sheet_name += f"_Page_{df['source_page'].iloc[0]}"
                    df.to_excel(writer, sheet_name=sheet_name, index=False)
            print(f"Saved Excel file: {excel_path}")
        
        elif output_format == 'csv':
            for i, df in enumerate(tables):
                csv_path = output_dir / f"{base_name}_table_{i+1}.csv"
                df.to_csv(csv_path, index=False)
                print(f"Saved CSV file: {csv_path}")
        
        elif output_format == 'json':
            for i, df in enumerate(tables):
                json_path = output_dir / f"{base_name}_table_{i+1}.json"
                df.to_json(json_path, orient='records', indent=2)
                print(f"Saved JSON file: {json_path}")
    
    def preview_tables(self, tables, max_rows=5):
        for i, df in enumerate(tables):
            print(f"\n{'='*50}")
            print(f"Table {i+1}")
            if 'source_page' in df.columns:
                print(f"Source Page: {df['source_page'].iloc[0]}")
            if 'source_method' in df.columns:
                print(f"Extraction Method: {df['source_method'].iloc[0]}")
            print(f"Shape: {df.shape}")
            print(f"Columns: {list(df.columns)}")
            print("\nPreview:")
            print(df.head(max_rows).to_string())
            print(f"{'='*50}")

def main():
    parser = argparse.ArgumentParser(description='Extract tables from PDF files')
    parser.add_argument('pdf_path', help='Path to PDF file')
    parser.add_argument('--method', choices=['pdfplumber', 'tabula', 'both'], 
                       default='both', help='Extraction method to use')
    parser.add_argument('--pages', nargs='+', type=int, 
                       help='Specific pages to extract (1-indexed)')
    parser.add_argument('--format', choices=['excel', 'csv', 'json'], 
                       default='excel', help='Output format')
    parser.add_argument('--preview', action='store_true', 
                       help='Preview extracted tables in console')
    
    args = parser.parse_args()
    
    # Create extractor
    extractor = PDFTableExtractor()
    
    try:
        # Extract tables
        tables = extractor.extract_tables(
            args.pdf_path, 
            method=args.method,
            pages=args.pages,
            output_format=args.format
        )
        
        # Preview if requested
        if args.preview and tables:
            extractor.preview_tables(tables)
            
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()