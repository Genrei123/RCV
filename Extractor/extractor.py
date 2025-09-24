#!/usr/bin/env python3

import os
import sys
from pathlib import Path
from pdf_table_extractor import PDFTableExtractor

def main():
    print("=== PDF Table Extractor ===")
    print()
    
    while True:
        pdf_path = input("Enter the path to your PDF file: ").strip().strip('"')
        if os.path.exists(pdf_path):
            break
        else:
            print(f"File not found: {pdf_path}")
            print("Please enter a valid file path.")
    
    print(f"PDF file: {pdf_path}")
    
    method = 'both'
    
    print("\nChoose output format:")
    print("1. JSON (.json) - separate file for each table")
    print("2. MySQL Database - save directly to MySQL database")
    
    format_choice = input("Enter choice (1-2) [default: 2]: ").strip()
    format_map = {'1': 'json', '2': 'mysql', '': 'mysql'}
    output_format = format_map.get(format_choice, 'mysql')
    
    # Ask about specific pages
    pages_input = input("\nExtract from specific pages? (e.g., '1,5,10-15' or press Enter for all pages): ").strip()
    pages = None
    if pages_input:
        try:
            pages = []
            for part in pages_input.split(','):
                if '-' in part:
                    start, end = map(int, part.split('-'))
                    pages.extend(range(start, end + 1))
                else:
                    pages.append(int(part))
            pages = sorted(list(set(pages)))
        except ValueError:
            print("Invalid page format. Extracting from all pages.")
            pages = None
    
    mysql_config = None
    single_table = False
    
    if output_format == 'mysql':
        print("\nMySQL Configuration:")
        
        host = input("Host [localhost]: ").strip() or 'localhost'
        port = input("Port [3306]: ").strip() or '3306'
        database = input("Database name: ").strip()
        username = input("Username: ").strip()
        password = input("Password: ").strip()
        
        if not database or not username:
            print("❌ Database name and username are required!")
            return
        
        mysql_config = {
            'host': host,
            'port': int(port),
            'database': database,
            'username': username,
            'password': password
        }
        
        table_choice = input("\nSingle table? (y/n) [y]: ").strip().lower()
        single_table = table_choice in ['y', 'yes', '']
        
        # Ask for custom table name if single table is chosen
        table_name = None
        if single_table:
            custom_name = input("Custom table name (leave empty for auto-generated): ").strip()
            if custom_name:
                table_name = custom_name
                print(f"Will use table name: {table_name}")
        
        mysql_config['table_name'] = table_name
    
    metadata_choice = input("\nClean data only? (y/n) [y]: ").strip().lower()
    remove_metadata = metadata_choice in ['y', 'yes', '']
    
    text_clean_choice = input("Fix broken text? (y/n) [y]: ").strip().lower()
    clean_text = text_clean_choice in ['y', 'yes', '']
    
    preview = input("Preview tables? (y/n) [n]: ").strip().lower()
    show_preview = preview in ['y', 'yes'] 
    
    print(f"\nExtracting from: {Path(pdf_path).name}")
    print(f"Format: {output_format.upper()}")
    if mysql_config:
        print(f"Database: {mysql_config['database']}")
    print(f"Pages: {'All' if not pages else len(pages)} pages")
    
    confirm = input("\nProceed? (y/n) [y]: ").strip().lower()
    if confirm in ['n', 'no']:
        print("Cancelled.")
        return
    
    print("\nStarting extraction...")
    
    try:
        extractor = PDFTableExtractor()
        tables = extractor.extract_tables(
            pdf_path,
            method=method,
            pages=pages,
            output_format=output_format,
            mysql_config=mysql_config,
            single_table=single_table if output_format == 'mysql' else False,
            remove_metadata=remove_metadata,
            clean_text=clean_text
        )
        
        if tables:
            print(f"\n✓ Successfully extracted {len(tables)} tables!")
            
            if show_preview:
                print("\n" + "="*50)
                print("TABLE PREVIEW:")
                extractor.preview_tables(tables, max_rows=3)
            
            if output_format != 'mysql':
                base_name = Path(pdf_path).stem
                output_dir = Path(pdf_path).parent / f"{base_name}_extracted_tables"
                print(f"\n✓ Output saved to: {output_dir}")
            else:
                print(f"\n✓ Data saved to MySQL database: {mysql_config['database']}")
            
        else:
            print("\n⚠ No tables were found in the PDF.")
            print("Tips:")
            print("- Try a different extraction method")
            print("- Check if the PDF contains actual tables (not just text)")
            print("- Ensure the PDF is not image-based (scanned document)")
            
    except Exception as e:
        print(f"\n❌ Error during extraction: {e}")
        print("\nTroubleshooting tips:")
        print("- Ensure the PDF file is not corrupted")
        print("- Check if the PDF is password protected")
        print("- Try a different extraction method")

if __name__ == "__main__":
    main()