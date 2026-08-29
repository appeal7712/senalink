import os

def main():
    log_path = r"C:\Users\appea\.gemini\antigravity\brain\16022daf-1722-4ad6-ac67-32a549d6d5f3\.system_generated\tasks\task-662.log"
    if os.path.exists(log_path):
        with open(log_path, "r", encoding="utf-8", errors="ignore") as f:
            for line in f:
                if "루디" in line or "rudy" in line.lower() or "파싱" in line:
                    clean_line = line.encode('ascii', errors='ignore').decode('ascii')
                    print(clean_line.strip())
    else:
        print("Log not found.")

if __name__ == "__main__":
    main()
