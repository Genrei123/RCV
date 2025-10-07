#!/usr/bin/env python3

import mysql.connector
from mysql.connector import Error

def create_rcv_database():
    """
    Creates the 'rcv' database that the Node.js application is trying to connect to.
    """
    try:
        # Connect to MySQL server without specifying a database
        connection = mysql.connector.connect(
            host='localhost',
            port=3306,
            user='root',
            password=''  # Empty password for local development
        )
        
        if connection.is_connected():
            print("✓ Connected to MySQL server")
            
            cursor = connection.cursor()
            
            # List all existing databases
            cursor.execute("SHOW DATABASES")
            databases = cursor.fetchall()
            print("\nCurrent databases:")
            for db in databases:
                print(f"    - {db[0]}")
            
            # Check if 'rcv' database exists
            cursor.execute("SHOW DATABASES LIKE 'rcv'")
            result = cursor.fetchone()
            
            if result:
                print(f"\n✓ Database 'rcv' already exists")
            else:
                print(f"\n✗ Database 'rcv' does not exist")
                print("Creating database 'rcv'...")
                
                cursor.execute("CREATE DATABASE rcv")
                print("✓ Database 'rcv' created successfully!")
                
                # Show updated database list
                cursor.execute("SHOW DATABASES")
                databases = cursor.fetchall()
                print("\nUpdated database list:")
                for db in databases:
                    print(f"    - {db[0]}")
            
            cursor.close()
            connection.close()
            print("\n✓ Database setup completed successfully!")
            
    except Error as e:
        print(f"✗ Error: {e}")
        print("\nTroubleshooting tips:")
        print("1. Make sure MySQL server is running")
        print("2. Check if the username and password are correct")
        print("3. Verify MySQL is accessible on localhost:3306")

if __name__ == "__main__":
    create_rcv_database()
