#!/usr/bin/env python3

import mysql.connector
from mysql.connector import Error

def check_databases():
    try:
        connection = mysql.connector.connect(
            host='localhost',
            port=3306,
            user='root',  # Replace with your username
            password=''    # Replace with your password if needed
        )
        
        if connection.is_connected():
            cursor = connection.cursor()
            
            # List all databases
            cursor.execute("SHOW DATABASES")
            databases = cursor.fetchall()
            
            print("Available databases:")
            for db in databases:
                print(f"  - {db[0]}")
                
            # Check if 'bai' database exists
            db_names = [db[0].lower() for db in databases]
            if 'bai' in db_names:
                print("\n✓ Database 'bai' exists")
            else:
                print("\n Database 'bai' does not exist")
                print("Creating database 'bai'...")
                cursor.execute("CREATE DATABASE bai")
                print("✓ Database 'bai' created successfully")
            
            cursor.close()
            
    except Error as e:
        print(f"Error: {e}")
        
    finally:
        if connection.is_connected():
            connection.close()

if __name__ == "__main__":
    check_databases()