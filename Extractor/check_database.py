import mysql.connector
from mysql.connector import Error

def check_and_create_database():
    try:
        connection = mysql.connector.connect(
            host='localhost',
            port=3306,
            user='root',
            password=''
        )
        
        if connection.is_connected():
            print("✓ Connected to MySQL server")
            
            cursor = connection.cursor()
            
            cursor.execute("SHOW DATABASES")
            databases = cursor.fetchall()
            print("\n Current databases:")
            for db in databases:
                print(f"    - {db[0]}")
            
            cursor.execute("SHOW DATABASES LIKE 'BAI'")
            result = cursor.fetchone()
            
            if result:
                print(f"\n✓ Database 'BAI' already exists")
            else:
                print(f"\n Database 'BAI' does not exist")
                print("Creating database 'BAI'...")
                
                cursor.execute("CREATE DATABASE BAI")
                print("✓ Database 'BAI' created successfully!")
            
            cursor.execute("SHOW DATABASES")
            databases = cursor.fetchall()
            print("\n Updated database list:")
            for db in databases:
                print(f"    - {db[0]}")
            
            cursor.execute("USE BAI")
            cursor.execute("SHOW TABLES")
            tables = cursor.fetchall()
            
            if tables:
                print(f"\n Tables in BAI database:")
                for table in tables:
                    print(f"    - {table[0]}")
            else:
                print(f"\n No tables found in BAI database (this is normal if you haven't extracted data yet)")
            
            cursor.close()
            connection.close()
            
    except Error as e:
        print(f" Error: {e}")

if __name__ == "__main__":
    check_and_create_database()